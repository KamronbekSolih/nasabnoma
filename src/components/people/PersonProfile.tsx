import Link from "next/link";
import { personName } from "@/lib/people";
import { isoToDMY } from "@/lib/dates";
import { buttonPrimary, Card, Notice } from "@/components/ui/primitives";
import { StarRosette } from "@/components/ui/Ornament";
import type { FamilyGraph } from "@/lib/tree/relations";
import type { Person } from "@/lib/types";

function joinPlace(parts: (string | null)[]): string | null {
  const filled = parts.filter(Boolean);
  return filled.length ? filled.reverse().join(", ") : null;
}

function lifespan(person: Person): string | null {
  if (!person.details_visible) return null;
  const birth = person.birth_date ? isoToDMY(person.birth_date) : person.birth_date_approx;
  const death = person.death_date ? isoToDMY(person.death_date) : null;
  if (!birth && !death) return person.is_deceased ? "vafot etgan" : null;
  if (person.is_deceased) return `${birth ?? "?"} — ${death ?? "?"}`;
  return birth ?? null;
}

/**
 * Read-only view of a person. Kept separate from the edit form: most visits are to
 * look someone up, not to change them — and members without edit rights would
 * otherwise be shown a disabled form instead of a page.
 */
export function PersonProfile({
  person,
  graph,
  canEdit,
  personHref = (id) => `/person/${id}`,
  backHref = "/tree",
  backLabel = "← Shajaraga qaytish",
}: {
  person: Person;
  graph: FamilyGraph;
  canEdit: boolean;
  /** Where a relative's name links to — overridden by read-only demo trees so
   * they stay inside their own namespace (see PersonPanel for the same need). */
  personHref?: (id: string) => string;
  backHref?: string;
  backLabel?: string;
}) {
  const father = graph.fatherOf(person.id);
  const mother = graph.motherOf(person.id);
  const spouses = graph.spousesOf(person.id);
  const children = graph.childrenOf(person.id);
  const siblings = graph
    .siblingsOf(person.id)
    .map(({ id, half }) => ({ person: graph.personById.get(id), half }))
    .filter((s): s is { person: Person; half: boolean } => !!s.person);

  const birthPlace = joinPlace([
    person.birth_country,
    person.birth_region,
    person.birth_district,
    person.birth_mahalla,
  ]);
  const currentPlace = joinPlace([
    person.current_country,
    person.current_region,
    person.current_district,
    person.current_address,
  ]);
  const clan = [person.millat, person.urug, person.aymoq, person.tarmoq].filter(Boolean);
  const years = lifespan(person);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      {/* Identity band */}
      <div className="illuminated relative overflow-hidden rounded-card border border-line-strong bg-surface">
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
          {person.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photo_url}
              alt=""
              className="h-24 w-24 shrink-0 rounded-full border-2 border-gold-line object-cover shadow-sm"
            />
          ) : (
            <div
              className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 ${
                person.gender === "female"
                  ? "border-female/30 bg-female-soft text-female"
                  : "border-male/30 bg-male-soft text-male"
              }`}
            >
              <span className="font-display text-3xl">{person.first_name.charAt(0)}</span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-tight text-ink sm:text-3xl">
              {personName(person)}
            </h1>
            {years && <p className="mt-1 font-body text-sm text-ink-muted italic">{years}</p>}
            {clan.length > 0 && (
              <p className="mt-2 text-sm text-gold">{clan.join(" · ")}</p>
            )}
          </div>

          {canEdit && (
            <Link href={`/person/${person.id}/edit`} className={`${buttonPrimary} shrink-0`}>
              Tahrirlash
            </Link>
          )}
        </div>
      </div>

      {!person.details_visible && (
        <Notice tone="warning">
          Bu tirik qarindoshning shaxsiy ma&apos;lumotlari yopiq — faqat ismi va
          qarindoshligi ko&apos;rsatilmoqda.
        </Notice>
      )}

      {/* Relationships first: lineage is what a shajara is for. */}
      <Card title="Qarindoshlari">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <RelationGroup
            label="Ota-onasi"
            people={[father, mother].filter((p): p is Person => !!p)}
            personHref={personHref}
          />
          <RelationGroup
            label="Turmush oʻrtogʻi"
            people={spouses.map((s) => s.person)}
            notes={spouses.map((s) =>
              s.family.relation_type === "divorced"
                ? "ajrashgan"
                : s.family.relation_type === "widowed"
                  ? "beva"
                  : undefined,
            )}
            personHref={personHref}
          />
          <RelationGroup
            label="Aka-uka, opa-singil"
            people={siblings.map((s) => s.person)}
            notes={siblings.map((s) => (s.half ? "oʻgay" : undefined))}
            personHref={personHref}
          />
          <RelationGroup label="Farzandlari" people={children} personHref={personHref} />
        </div>
      </Card>

      {/* Current location is public regardless of details_visible — birthplace isn't:
          where someone lives today is a different disclosure than where they were
          born decades ago. */}
      {((person.details_visible && birthPlace) || currentPlace) && (
        <Card title="Joylashuv">
          <dl className="grid gap-4 sm:grid-cols-2">
            {person.details_visible && birthPlace && (
              <DetailRow label="Tugʻilgan joyi" value={birthPlace} />
            )}
            {currentPlace && <DetailRow label="Hozirgi manzili" value={currentPlace} />}
          </dl>
        </Card>
      )}

      {person.details_visible && (person.telegram || person.instagram) && (
        <Card title="Aloqa">
          <dl className="grid gap-4 sm:grid-cols-2">
            {person.telegram && <DetailRow label="Telegram" value={person.telegram} />}
            {person.instagram && <DetailRow label="Instagram" value={person.instagram} />}
          </dl>
        </Card>
      )}

      {person.details_visible && person.bio && (
        <Card title="Tarjimai hol">
          <div className="flex gap-4">
            <StarRosette size={20} className="mt-1 shrink-0 opacity-60" />
            <p className="font-body leading-relaxed whitespace-pre-wrap text-ink">
              {person.bio}
            </p>
          </div>
        </Card>
      )}

      <Link href={backHref} className="text-sm text-brand hover:underline">
        {backLabel}
      </Link>
    </div>
  );
}

function RelationGroup({
  label,
  people,
  notes,
  personHref,
}: {
  label: string;
  people: Person[];
  notes?: (string | undefined)[];
  personHref: (id: string) => string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">{label}</p>
      <div className="mt-1.5 flex flex-col gap-1">
        {people.length === 0 && <p className="text-sm text-ink-faint">—</p>}
        {people.map((p, i) => (
          <div key={p.id} className="flex items-baseline gap-2">
            <Link
              href={personHref(p.id)}
              className="text-sm text-ink hover:text-brand hover:underline"
            >
              {personName(p)}
            </Link>
            {notes?.[i] && <span className="text-xs text-ink-faint">({notes[i]})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-ink-faint uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
