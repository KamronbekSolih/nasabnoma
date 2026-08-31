"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePerson, deletePerson, attachRelative } from "@/app/person/actions";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar, deleteAvatarByUrl } from "@/lib/supabase/storage";
import { isoToDMY } from "@/lib/dates";
import { personName } from "@/lib/people";
import { canEditRole, isAdminRole } from "@/lib/roles";
import { Combobox } from "@/components/ui/Combobox";
import {
  buttonPrimary,
  buttonSecondary,
  inputClass,
  Field,
} from "@/components/ui/primitives";
import { COUNTRIES } from "@/lib/reference/countries";
import { UZBEKISTAN, UZBEKISTAN_REGIONS, UZBEKISTAN_REGION_NAMES } from "@/lib/reference/uzbekistan";
import { MILLATLAR, UZBEK_MILLAT } from "@/lib/reference/millat";
import { UZBEK_URUGS, UZBEK_URUG_NAMES } from "@/lib/reference/urug";
import type {
  ChildRelation,
  FamilyRelationType,
  Person,
  RelationKind,
  TreeRole,
} from "@/lib/types";

interface SpouseRow {
  id: string;
  status: FamilyRelationType;
}

interface ChildRow {
  id: string;
  family_id: string | null;
  father_relation: ChildRelation;
  mother_relation: ChildRelation;
}

export interface RelationContext {
  relation: RelationKind;
  ofId: string;
  ofName: string;
}

export interface InheritedClan {
  millat: string | null;
  urug: string | null;
  aymoq: string | null;
  tarmoq: string | null;
}

const RELATION_LABEL: Record<RelationKind, string> = {
  father: "otasi",
  mother: "onasi",
  spouse: "turmush o'rtog'i",
  child: "farzandi",
};

export function PersonForm({
  person,
  people,
  role,
  initialFatherId,
  initialFatherRelation,
  initialMotherId,
  initialMotherRelation,
  initialSpouses,
  initialChildren,
  familyOptions,
  relationContext,
  inheritedClan,
}: {
  person?: Person;
  people: Person[];
  role: TreeRole;
  initialFatherId?: string;
  initialFatherRelation?: ChildRelation;
  initialMotherId?: string;
  initialMotherRelation?: ChildRelation;
  initialSpouses?: SpouseRow[];
  initialChildren?: ChildRow[];
  familyOptions?: { id: string; label: string }[];
  relationContext?: RelationContext;
  inheritedClan?: InheritedClan;
}) {
  const router = useRouter();
  const canEdit = canEditRole(role);
  const isAdmin = isAdminRole(role);
  const detailsHidden = person ? !person.details_visible : false;

  const [isDeceased, setIsDeceased] = useState(person?.is_deceased ?? false);
  const [spouses, setSpouses] = useState<SpouseRow[]>(initialSpouses ?? []);
  const [children, setChildren] = useState<ChildRow[]>(initialChildren ?? []);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(person?.photo_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // If the person saved but a later step failed, this holds the id that was created,
  // so retrying updates that record instead of inserting a second copy.
  const [savedId, setSavedId] = useState<string | null>(null);

  const otherPeople = people.filter((p) => p.id !== person?.id);
  // When creating X's child, X is wired up as a parent automatically — offering them
  // again here would just target the same relationship twice.
  const excludeFromParents =
    relationContext?.relation === "child" ? relationContext.ofId : null;
  const fathers = otherPeople.filter((p) => p.gender === "male" && p.id !== excludeFromParents);
  const mothers = otherPeople.filter((p) => p.gender === "female" && p.id !== excludeFromParents);
  const spouseCandidates = otherPeople.filter((p) => !spouses.some((s) => s.id === p.id));
  const childCandidates = otherPeople.filter((p) => !children.some((c) => c.id === p.id));

  const lockedGender =
    relationContext?.relation === "father"
      ? "male"
      : relationContext?.relation === "mother"
        ? "female"
        : undefined;

  function addSpouse(id: string) {
    if (!id) return;
    setSpouses((prev) => [...prev, { id, status: "married" }]);
  }

  function addChild(id: string) {
    if (!id) return;
    setChildren((prev) => [
      ...prev,
      {
        id,
        family_id: familyOptions?.[0]?.id ?? null,
        father_relation: "birth",
        mother_relation: "birth",
      },
    ]);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      let photoUrl = person?.photo_url ?? "";
      if (photoFile) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Sessiya tugagan. Qaytadan kiring.");
        const previousUrl = photoUrl;
        photoUrl = await uploadAvatar(supabase, user.id, photoFile);
        if (previousUrl && previousUrl !== photoUrl) {
          // Fire-and-forget: a failed cleanup shouldn't block saving the person.
          void deleteAvatarByUrl(supabase, previousUrl).catch(() => {});
        }
      }
      formData.set("photo_url", photoUrl);
      formData.set("spouses_json", JSON.stringify(spouses));
      formData.set("children_json", JSON.stringify(children));
      if (!person && savedId) formData.set("id", savedId);

      const result = await savePerson(formData);
      if ("error" in result) {
        setPending(false);
        setError(result.error);
        return;
      }
      setSavedId(result.id);

      // The person being created "as X's father/mother/spouse/child" (via the tree
      // panel's "not in the list, create new" fallback) only exists as a standalone
      // record until this runs — it's what actually links them back to X.
      if (relationContext) {
        const linkResult = await attachRelative(
          relationContext.ofId,
          relationContext.relation,
          result.id,
        );
        if ("error" in linkResult) {
          setPending(false);
          setError(linkResult.error);
          return;
        }
      }

      // Land on the saved person so the change is immediately visible, rather than
      // dropping back to the tree where it may be off-screen.
      router.push(`/person/${result.id}`);
      router.refresh();
    } catch (e) {
      setPending(false);
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi.");
    }
  }

  async function handleDelete() {
    if (!person) return;
    if (!confirm(`${personName(person)}ni o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi.`))
      return;
    setPending(true);
    const result = await deletePerson(person.id);
    if ("error" in result) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push("/tree");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6 sm:px-6">
      {person && <input type="hidden" name="id" value={person.id} />}

      {!canEdit && (
        <div className="rounded-lg border border-line bg-paper-sunken px-4 py-3 text-sm text-ink-muted">
          Sizda faqat ko&apos;rish huquqi bor.
        </div>
      )}

      {detailsHidden && (
        <div className="rounded-lg border border-gold-line bg-gold-soft px-4 py-3 text-sm text-notice">
          Bu tirik qarindoshning shaxsiy ma&apos;lumotlari yopiq — ular bo&apos;sh
          ko&apos;rinadi, lekin o&apos;chirilmagan. Ko&apos;rish uchun administrator
          huquqi yoki shaxsning o&apos;z ruxsati kerak.
        </div>
      )}

      {relationContext && (
        <div className="rounded-lg border border-brand-line bg-brand-soft px-4 py-3 text-sm text-brand">
          Bu odam <strong>{relationContext.ofName}</strong>ning{" "}
          <strong>{RELATION_LABEL[relationContext.relation]}</strong> sifatida qo&apos;shiladi.
        </div>
      )}

      <fieldset disabled={!canEdit || pending} className="contents">
        <section className="illuminated flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Asosiy ma&apos;lumot
          </h2>

          <div className="flex items-center gap-4">
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt=""
                className="h-16 w-16 rounded-full border border-line object-cover"
              />
            )}
            <Field label="Surat" htmlFor="photo">
              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-paper-sunken file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-paper-sunken"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Ism" htmlFor="first_name" required>
              <input
                id="first_name"
                name="first_name"
                required
                defaultValue={person?.first_name}
                className={inputClass}
              />
            </Field>
            <Field label="Familiya" htmlFor="last_name">
              <input
                id="last_name"
                name="last_name"
                defaultValue={person?.last_name ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Otasining ismi" htmlFor="patronymic">
              <input
                id="patronymic"
                name="patronymic"
                defaultValue={person?.patronymic ?? ""}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Jinsi" htmlFor="gender" required>
            {/* A disabled <select> wouldn't submit its value, so when the relation
                context implies gender we drop the other option instead. */}
            <select
              id="gender"
              name="gender"
              required
              defaultValue={lockedGender ?? person?.gender ?? "male"}
              className={inputClass}
            >
              {(!lockedGender || lockedGender === "male") && <option value="male">Erkak</option>}
              {(!lockedGender || lockedGender === "female") && <option value="female">Ayol</option>}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tug'ilgan sana (kk.oo.yyyy)" htmlFor="birth_date">
              <input
                id="birth_date"
                name="birth_date"
                type="text"
                inputMode="numeric"
                placeholder="kk.oo.yyyy"
                pattern="\d{2}\.\d{2}\.\d{4}"
                title="kk.oo.yyyy formatida kiriting, masalan 05.03.1958"
                defaultValue={isoToDMY(person?.birth_date)}
                className={inputClass}
              />
            </Field>
            <Field label="Taxminiy sana (agar aniq bo'lmasa)" htmlFor="birth_date_approx">
              <input
                id="birth_date_approx"
                name="birth_date_approx"
                placeholder="masalan, taxminan 1930-yillar"
                defaultValue={person?.birth_date_approx ?? ""}
                className={inputClass}
              />
            </Field>
          </div>

          <LocationFields
            title="Tug'ilgan joyi"
            countryField="birth_country"
            regionField="birth_region"
            districtField="birth_district"
            detailField="birth_mahalla"
            detailLabel="Mahalla / qishloq / manzil"
            initialCountry={person?.birth_country}
            initialRegion={person?.birth_region}
            initialDistrict={person?.birth_district}
            initialDetail={person?.birth_mahalla}
          />

          <div className="flex items-center gap-2">
            <input
              id="is_deceased"
              name="is_deceased"
              type="checkbox"
              checked={isDeceased}
              onChange={(e) => setIsDeceased(e.target.checked)}
              className="h-4 w-4 rounded border-line-strong"
            />
            <label htmlFor="is_deceased" className="text-sm text-ink">
              Vafot etgan
            </label>
          </div>

          {isDeceased && (
            <Field label="Vafot sanasi (kk.oo.yyyy)" htmlFor="death_date">
              <input
                id="death_date"
                name="death_date"
                type="text"
                inputMode="numeric"
                placeholder="kk.oo.yyyy"
                pattern="\d{2}\.\d{2}\.\d{4}"
                title="kk.oo.yyyy formatida kiriting"
                defaultValue={isoToDMY(person?.death_date)}
                className={inputClass}
              />
            </Field>
          )}

          {inheritedClan && (
            <p className="text-xs text-ink-faint">
              Millat/urugʻ otasidan meros sifatida oldindan to&apos;ldirildi — kerak
              bo&apos;lsa o&apos;zgartiring.
            </p>
          )}
          <ClanFields
            initialMillat={person?.millat ?? inheritedClan?.millat}
            initialUrug={person?.urug ?? inheritedClan?.urug}
            initialAymoq={person?.aymoq ?? inheritedClan?.aymoq}
            initialTarmoq={person?.tarmoq ?? inheritedClan?.tarmoq}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Telegram" htmlFor="telegram">
              <input
                id="telegram"
                name="telegram"
                placeholder="@username"
                defaultValue={person?.telegram ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Instagram" htmlFor="instagram">
              <input
                id="instagram"
                name="instagram"
                placeholder="@username"
                defaultValue={person?.instagram ?? ""}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Tarjimai hol / eslatmalar" htmlFor="bio">
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="Masalan: kasbi/mashg'uloti, ta'lim, harbiy xizmat, hayotidan yodda qolgan voqealar, yutuq va unvonlar, xarakteri, sevimli mashg'uloti..."
              defaultValue={person?.bio ?? ""}
              className={inputClass}
            />
          </Field>
        </section>

        <section className="illuminated flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Maxfiylik
          </h2>
          <p className="text-xs text-ink-muted">
            Tirik odamlarning tug&apos;ilgan sanasi va aloqa ma&apos;lumotlari oddiy
            a&apos;zolardan yashiriladi. <strong>Hozirgi manzil bundan mustasno</strong> —
            u har doim ochiq, chunki &quot;Dunyo bo&apos;ylab&quot; xaritasi shunga
            asoslanadi. Vafot etganlarning barcha ma&apos;lumotlari hamma uchun ochiq —
            shajaraning mohiyati shu.
          </p>
          <Field label="Ko'rinishi" htmlFor="visibility">
            <select
              id="visibility"
              name="visibility"
              defaultValue={person?.visibility ?? "family"}
              className={inputClass}
            >
              <option value="family">Yopiq — faqat administrator ko&apos;radi</option>
              <option value="public">Ochiq — shajaradagi hamma ko&apos;radi</option>
            </select>
          </Field>
        </section>

        <section className="illuminated flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Hozirgi manzil
          </h2>
          <p className="text-xs text-ink-faint">
            Keyinchalik shu ma&apos;lumot asosida qarindoshlar dunyo xaritasida
            ko&apos;rsatiladi.
          </p>
          <LocationFields
            title=""
            countryField="current_country"
            regionField="current_region"
            districtField="current_district"
            detailField="current_address"
            detailLabel="Manzil"
            initialCountry={person?.current_country}
            initialRegion={person?.current_region}
            initialDistrict={person?.current_district}
            initialDetail={person?.current_address}
          />
        </section>

        <section className="illuminated flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Ota-ona
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Otasi" htmlFor="father_id">
              <select
                id="father_id"
                name="father_id"
                defaultValue={initialFatherId ?? ""}
                className={inputClass}
              >
                <option value="">— Tanlanmagan —</option>
                {fathers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {personName(f)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bog'lanish turi" htmlFor="father_relation">
              <select
                id="father_relation"
                name="father_relation"
                defaultValue={initialFatherRelation ?? "birth"}
                className={inputClass}
              >
                <option value="birth">Tug&apos;ma</option>
                <option value="adopted">Asrab olingan</option>
                <option value="step">O&apos;gay</option>
                <option value="foster">Vasiylikda</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Onasi" htmlFor="mother_id">
              <select
                id="mother_id"
                name="mother_id"
                defaultValue={initialMotherId ?? ""}
                className={inputClass}
              >
                <option value="">— Tanlanmagan —</option>
                {mothers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {personName(m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bog'lanish turi" htmlFor="mother_relation">
              <select
                id="mother_relation"
                name="mother_relation"
                defaultValue={initialMotherRelation ?? "birth"}
                className={inputClass}
              >
                <option value="birth">Tug&apos;ma</option>
                <option value="adopted">Asrab olingan</option>
                <option value="step">O&apos;gay</option>
                <option value="foster">Vasiylikda</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="illuminated flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Turmush o&apos;rtog&apos;i
          </h2>

          {spouses.map((s) => {
            const p = people.find((pp) => pp.id === s.id);
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-ink">{p ? personName(p) : s.id}</span>
                <select
                  value={s.status}
                  onChange={(e) =>
                    setSpouses((prev) =>
                      prev.map((row) =>
                        row.id === s.id
                          ? { ...row, status: e.target.value as FamilyRelationType }
                          : row,
                      ),
                    )
                  }
                  className={inputClass}
                >
                  <option value="married">Turmush qurgan</option>
                  <option value="divorced">Ajrashgan</option>
                  <option value="widowed">Beva qolgan</option>
                  <option value="partners">Birga yashagan</option>
                  <option value="unknown">Noma&apos;lum</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSpouses((prev) => prev.filter((row) => row.id !== s.id))}
                  className="inline-flex min-h-11 items-center rounded-card px-2 text-sm text-danger hover:bg-danger-soft sm:min-h-9"
                >
                  O&apos;chirish
                </button>
              </div>
            );
          })}

          {spouseCandidates.length > 0 && (
            <select
              value=""
              onChange={(e) => addSpouse(e.target.value)}
              className={inputClass}
            >
              <option value="">+ Turmush o&apos;rtog&apos;ini qo&apos;shish</option>
              {spouseCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {personName(p)}
                </option>
              ))}
            </select>
          )}
        </section>

        <section className="illuminated flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Farzandlari
          </h2>

          {children.map((c) => {
            const p = people.find((pp) => pp.id === c.id);
            return (
              <div key={c.id} className="flex flex-wrap items-center gap-3">
                <span className="flex-1 text-sm text-ink">{p ? personName(p) : c.id}</span>
                {/* Which marriage the child belongs to — the question the old
                    edge-based model could not express at all. */}
                {familyOptions && familyOptions.length > 1 && (
                  <select
                    value={c.family_id ?? ""}
                    onChange={(e) =>
                      setChildren((prev) =>
                        prev.map((row) =>
                          row.id === c.id ? { ...row, family_id: e.target.value || null } : row,
                        ),
                      )
                    }
                    className={inputClass}
                  >
                    {familyOptions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label} bilan
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={c.father_relation}
                  onChange={(e) =>
                    setChildren((prev) =>
                      prev.map((row) =>
                        row.id === c.id
                          ? {
                              ...row,
                              father_relation: e.target.value as ChildRelation,
                              mother_relation: e.target.value as ChildRelation,
                            }
                          : row,
                      ),
                    )
                  }
                  className={inputClass}
                >
                  <option value="birth">Tug&apos;ma</option>
                  <option value="adopted">Asrab olingan</option>
                  <option value="step">O&apos;gay</option>
                  <option value="foster">Vasiylikda</option>
                </select>
                <button
                  type="button"
                  onClick={() => setChildren((prev) => prev.filter((row) => row.id !== c.id))}
                  className="inline-flex min-h-11 items-center rounded-card px-2 text-sm text-danger hover:bg-danger-soft sm:min-h-9"
                >
                  O&apos;chirish
                </button>
              </div>
            );
          })}

          {childCandidates.length > 0 && (
            <select value="" onChange={(e) => addChild(e.target.value)} className={inputClass}>
              <option value="">+ Farzand qo&apos;shish</option>
              {childCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {personName(p)}
                </option>
              ))}
            </select>
          )}
        </section>
      </fieldset>

      {error && <p className="text-sm text-danger">{error}</p>}

      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 gap-3 sm:flex-none">
            <button
              type="submit"
              disabled={pending}
              className={`${buttonPrimary} flex-1 sm:flex-none`}
            >
              {pending ? "Saqlanmoqda..." : "Saqlash"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className={`${buttonSecondary} flex-1 sm:flex-none`}
            >
              Bekor qilish
            </button>
          </div>
          {person && isAdmin && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="inline-flex min-h-11 items-center rounded-card px-2 text-sm text-danger hover:bg-danger-soft disabled:opacity-50 sm:min-h-9"
            >
              Odamni o&apos;chirish
            </button>
          )}
        </div>
      )}
    </form>
  );
}

/** Country -> (Uzbekistan only) region -> district, always ending in a free-text
 * field — the granular level (mahalla, exact address) has no usable reference data. */
function LocationFields({
  title,
  countryField,
  regionField,
  districtField,
  detailField,
  detailLabel,
  initialCountry,
  initialRegion,
  initialDistrict,
  initialDetail,
}: {
  title: string;
  countryField: string;
  regionField: string;
  districtField: string;
  detailField: string;
  detailLabel: string;
  initialCountry?: string | null;
  initialRegion?: string | null;
  initialDistrict?: string | null;
  initialDetail?: string | null;
}) {
  const [country, setCountry] = useState(initialCountry ?? "");
  const [region, setRegion] = useState(initialRegion ?? "");
  const [district, setDistrict] = useState(initialDistrict ?? "");

  const isUzbekistan = country === UZBEKISTAN;
  const districts = isUzbekistan ? (UZBEKISTAN_REGIONS[region] ?? []) : [];

  return (
    <div className="flex flex-col gap-3">
      {title && <p className="text-sm font-medium text-ink">{title}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Davlat" htmlFor={countryField}>
          <Combobox
            id={countryField}
            name={countryField}
            value={country}
            onChange={(v) => {
              setCountry(v);
              if (v !== UZBEKISTAN) {
                setRegion("");
                setDistrict("");
              }
            }}
            options={COUNTRIES}
            className={inputClass}
          />
        </Field>
        {isUzbekistan && (
          <Field label="Viloyat" htmlFor={regionField}>
            <Combobox
              id={regionField}
              name={regionField}
              value={region}
              onChange={(v) => {
                setRegion(v);
                setDistrict("");
              }}
              options={UZBEKISTAN_REGION_NAMES}
              className={inputClass}
            />
          </Field>
        )}
      </div>
      {isUzbekistan && region && (
        <Field label="Tuman / shahar" htmlFor={districtField}>
          <Combobox
            id={districtField}
            name={districtField}
            value={district}
            onChange={setDistrict}
            options={districts}
            className={inputClass}
          />
        </Field>
      )}
      <Field label={detailLabel} htmlFor={detailField}>
        <input
          id={detailField}
          name={detailField}
          defaultValue={initialDetail ?? ""}
          className={inputClass}
        />
      </Field>
    </div>
  );
}

/** Millat -> (Oʻzbek only) urugʻ -> aymoq -> tarmoq. Only the top two levels have any
 * reference data at all, and even that's non-exhaustive — free text always works. */
function ClanFields({
  initialMillat,
  initialUrug,
  initialAymoq,
  initialTarmoq,
}: {
  initialMillat?: string | null;
  initialUrug?: string | null;
  initialAymoq?: string | null;
  initialTarmoq?: string | null;
}) {
  const [millat, setMillat] = useState(initialMillat ?? "");
  const [urug, setUrug] = useState(initialUrug ?? "");
  const [aymoq, setAymoq] = useState(initialAymoq ?? "");

  const isUzbek = millat === UZBEK_MILLAT;
  const aymoqOptions = isUzbek ? (UZBEK_URUGS[urug] ?? []) : [];

  return (
    <div className="flex flex-col gap-3">
      <Field label="Millati" htmlFor="millat">
        <Combobox
          id="millat"
          name="millat"
          value={millat}
          onChange={(v) => {
            setMillat(v);
            if (v !== UZBEK_MILLAT) {
              setUrug("");
              setAymoq("");
            }
          }}
          options={MILLATLAR}
          className={inputClass}
        />
      </Field>

      {isUzbek && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Urug'" htmlFor="urug">
              <Combobox
                id="urug"
                name="urug"
                value={urug}
                onChange={(v) => {
                  setUrug(v);
                  setAymoq("");
                }}
                options={UZBEK_URUG_NAMES}
                className={inputClass}
              />
            </Field>
            <Field label="Aymoq" htmlFor="aymoq">
              <Combobox
                id="aymoq"
                name="aymoq"
                value={aymoq}
                onChange={setAymoq}
                options={aymoqOptions}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Tarmoq" htmlFor="tarmoq">
            <input
              id="tarmoq"
              name="tarmoq"
              defaultValue={initialTarmoq ?? ""}
              className={inputClass}
            />
          </Field>
        </>
      )}
    </div>
  );
}
