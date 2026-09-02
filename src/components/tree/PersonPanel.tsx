"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { detachRelative, claimPerson } from "@/app/person/actions";
import { personName } from "@/lib/people";
import { buttonSecondary } from "@/components/ui/primitives";
import type { FamilyGraph } from "@/lib/tree/relations";
import type { Person, RelationKind } from "@/lib/types";

export function PersonPanel({
  person,
  graph,
  canEdit,
  onClose,
  onFocus,
  personHref = (id) => `/person/${id}`,
  currentUserId = null,
  myClaimedPersonId = null,
}: {
  person: Person;
  graph: FamilyGraph;
  canEdit: boolean;
  onClose: () => void;
  onFocus?: (id: string) => void;
  /** Where a relative's name links to. Defaults to the real app's profile route
   * — a read-only demo tree overrides this to stay inside its own namespace,
   * since demo people don't exist in the database `/person/[id]` reads from. */
  personHref?: (id: string) => string;
  /** Null on the read-only demo trees, which have no signed-in user. */
  currentUserId?: string | null;
  /** The person (if any) this account already claimed in this tree. As long
   * as this is null, "Bu menman" keeps offering itself on every unclaimed
   * card — the first click here is meant to be the fast path to identifying
   * yourself, without a trip to the full profile page. Once set, the nudge
   * stops: you've already said who you are. */
  myClaimedPersonId?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canClaim =
    !!currentUserId &&
    canEdit &&
    !person.is_deceased &&
    !person.claimed_by &&
    !myClaimedPersonId;

  const handleClaim = () => run(() => claimPerson(person.id));

  const father = graph.fatherOf(person.id);
  const mother = graph.motherOf(person.id);
  const spouses = graph.spousesOf(person.id);
  const children = graph.childrenOf(person.id);

  async function run(fn: () => Promise<{ ok: true } | { error: string }>) {
    setPending(true);
    setError(null);
    const result = await fn();
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const handleRemove = (relation: RelationKind, otherId: string) => {
    if (!confirm("Bog'lanishni olib tashlaysizmi?")) return;
    return run(() => detachRelative(person.id, relation, otherId));
  };

  return (
    <aside
      // top-16 keeps this clear of the sticky header (z-30) — inset-y-0 used to
      // start the panel at the very top of the viewport, so its top edge rendered
      // underneath the header instead of below it.
      className="fixed inset-x-0 bottom-0 z-20 flex max-h-[70vh] flex-col gap-4 overflow-y-auto rounded-t-2xl border-t border-line-strong bg-surface p-5 shadow-[0_-8px_32px_-12px_rgba(42,36,25,0.3)] sm:inset-x-auto sm:top-16 sm:right-0 sm:bottom-0 sm:max-h-none sm:w-80 sm:rounded-none sm:border-t-0 sm:border-l sm:shadow-[-8px_0_32px_-12px_rgba(42,36,25,0.2)]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {person.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photo_url}
              alt=""
              className="h-14 w-14 rounded-full border-2 border-gold-line object-cover"
            />
          )}
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-tight text-ink">{personName(person)}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Link href={personHref(person.id)} className="text-brand hover:underline">
                Batafsil
              </Link>
              {canEdit && (
                <>
                  <span className="text-ink-faint">·</span>
                  <Link href={`/person/${person.id}/edit`} className="text-brand hover:underline">
                    Tahrirlash
                  </Link>
                </>
              )}
              {onFocus && (
                <>
                  <span className="text-ink-faint">·</span>
                  {/* Re-centring on a person is how you reach their side of the family;
                      walking up from a descendant only ever shows one ancestor line. */}
                  <button
                    type="button"
                    onClick={() => onFocus(person.id)}
                    className="text-brand hover:underline"
                  >
                    Markazga olish
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="-mt-1 -mr-1 flex h-11 w-11 items-center justify-center rounded-lg text-ink-faint hover:bg-paper-sunken hover:text-ink sm:h-9 sm:w-9">
          ✕
        </button>
      </div>

      {canClaim && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-line bg-brand-soft px-3 py-2">
          <p className="text-sm text-ink">Shajarada oʻzingizni topdingizmi?</p>
          <button
            type="button"
            disabled={pending}
            onClick={handleClaim}
            className={`${buttonSecondary} min-h-9 shrink-0 px-3 py-1 text-sm sm:min-h-8`}
          >
            {pending ? "Bajarilmoqda..." : "Bu menman"}
          </button>
        </div>
      )}

      {!person.details_visible && (
        <p className="rounded-lg border border-gold-line bg-gold-soft px-3 py-2 text-xs text-notice">
          Tirik qarindoshlarning shaxsiy ma&apos;lumotlari yopiq. Bu yerda faqat ism va
          qarindoshlik ko&apos;rsatiladi.
        </p>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      <RelationSlot
        label="Otasi"
        existing={father}
        addLabel="+ Ota qo'shish"
        pending={pending}
        canEdit={canEdit}
        onRemove={(id) => handleRemove("father", id)}
        createHref={`/person/new?relation=father&of=${person.id}`}
        personHref={personHref}
      />
      <RelationSlot
        label="Onasi"
        existing={mother}
        addLabel="+ Ona qo'shish"
        pending={pending}
        canEdit={canEdit}
        onRemove={(id) => handleRemove("mother", id)}
        createHref={`/person/new?relation=mother&of=${person.id}`}
        personHref={personHref}
      />

      <RelationList
        label="Turmush o'rtog'i"
        items={spouses.map(({ person: p, family }) => ({
          id: p.id,
          name: personName(p),
          note: family.relation_type === "divorced" ? "ajrashgan" : undefined,
        }))}
        addLabel="+ Turmush o'rtog'i qo'shish"
        pending={pending}
        canEdit={canEdit}
        onRemove={(id) => handleRemove("spouse", id)}
        createHref={`/person/new?relation=spouse&of=${person.id}`}
        personHref={personHref}
      />

      <RelationList
        label="Farzandlari"
        items={children.map((c) => ({ id: c.id, name: personName(c) }))}
        addLabel="+ Farzand qo'shish"
        pending={pending}
        canEdit={canEdit}
        onRemove={(id) => handleRemove("child", id)}
        createHref={`/person/new?relation=child&of=${person.id}`}
        personHref={personHref}
      />
    </aside>
  );
}

// Adding a relative used to open an inline search-existing-or-create picker
// here (RelativePicker). That extra step is gone by request — "+ X qo'shish"
// now goes straight to the create-person window, which is the only place a
// relative gets added from. Nothing about *removing* a wrong link changed.

function RelationSlot({
  label,
  existing,
  addLabel,
  pending,
  canEdit,
  onRemove,
  createHref,
  personHref,
}: {
  label: string;
  existing?: Person;
  addLabel: string;
  pending: boolean;
  canEdit: boolean;
  onRemove: (id: string) => void;
  createHref: string;
  personHref: (id: string) => string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      {existing ? (
        <div className="flex items-center gap-2">
          <Link href={personHref(existing.id)} className="inline-flex min-h-11 items-center text-sm text-ink hover:text-brand hover:underline sm:min-h-0">
            {personName(existing)}
          </Link>
          {canEdit && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onRemove(existing.id)}
              className="inline-flex min-h-11 items-center rounded-card px-2 text-sm text-danger hover:bg-danger-soft disabled:opacity-50 sm:min-h-8"
            >
              olib tashlash
            </button>
          )}
        </div>
      ) : canEdit ? (
        <Link href={createHref} className="inline-flex min-h-11 items-center rounded-card px-2 text-sm text-brand hover:bg-brand-soft sm:min-h-8">
          {addLabel}
        </Link>
      ) : (
        <p className="text-sm text-ink-faint">—</p>
      )}
    </div>
  );
}

function RelationList({
  label,
  items,
  addLabel,
  pending,
  canEdit,
  onRemove,
  createHref,
  personHref,
}: {
  label: string;
  items: { id: string; name: string; note?: string }[];
  addLabel: string;
  pending: boolean;
  canEdit: boolean;
  onRemove: (id: string) => void;
  createHref: string;
  personHref: (id: string) => string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <div className="mt-1 flex flex-col gap-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Link href={personHref(item.id)} className="inline-flex min-h-11 items-center text-sm text-ink hover:text-brand hover:underline sm:min-h-0">
              {item.name}
            </Link>
            {item.note && <span className="text-xs text-ink-faint">({item.note})</span>}
            {canEdit && (
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(item.id)}
                className="inline-flex min-h-11 items-center rounded-card px-2 text-sm text-danger hover:bg-danger-soft disabled:opacity-50 sm:min-h-8"
              >
                olib tashlash
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-ink-faint">—</p>}
        {canEdit && (
          <Link
            href={createHref}
            className="inline-flex min-h-11 items-center self-start rounded-card px-2 text-sm text-brand hover:bg-brand-soft sm:min-h-8"
          >
            {addLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
