"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { attachRelative, detachRelative } from "@/app/person/actions";
import { RelativePicker } from "./RelativePicker";
import { personName } from "@/lib/people";
import type { FamilyGraph } from "@/lib/tree/relations";
import type { Person, RelationKind } from "@/lib/types";

export function PersonPanel({
  person,
  graph,
  canEdit,
  onClose,
  onFocus,
  personHref = (id) => `/person/${id}`,
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
}) {
  const router = useRouter();
  const [addingRelation, setAddingRelation] = useState<RelationKind | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const father = graph.fatherOf(person.id);
  const mother = graph.motherOf(person.id);
  const spouses = graph.spousesOf(person.id);
  const children = graph.childrenOf(person.id);

  const excluded = new Set([
    person.id,
    ...children.map((c) => c.id),
    ...spouses.map((s) => s.person.id),
  ]);
  const fatherCandidates = graph.people.filter((p) => p.gender === "male" && p.id !== person.id);
  const motherCandidates = graph.people.filter((p) => p.gender === "female" && p.id !== person.id);
  const childCandidates = graph.people.filter((p) => !excluded.has(p.id));
  const spouseCandidates = graph.people.filter((p) => !excluded.has(p.id));

  async function run(fn: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await fn();
      setAddingRelation(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi.");
    } finally {
      setPending(false);
    }
  }

  const handlePick = (relation: RelationKind, otherId: string) =>
    run(() => attachRelative(person.id, relation, otherId));

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
            <div className="mt-0.5 flex items-center gap-2 text-xs">
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
        <button onClick={onClose} className="-mt-1 -mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint hover:bg-paper-sunken hover:text-ink">
          ✕
        </button>
      </div>

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
        candidates={fatherCandidates}
        isAdding={addingRelation === "father"}
        pending={pending}
        canEdit={canEdit}
        onStartAdd={() => setAddingRelation("father")}
        onCancelAdd={() => setAddingRelation(null)}
        onPick={(id) => handlePick("father", id)}
        onRemove={(id) => handleRemove("father", id)}
        createHref={`/person/new?relation=father&of=${person.id}`}
        personHref={personHref}
      />
      <RelationSlot
        label="Onasi"
        existing={mother}
        addLabel="+ Ona qo'shish"
        candidates={motherCandidates}
        isAdding={addingRelation === "mother"}
        pending={pending}
        canEdit={canEdit}
        onStartAdd={() => setAddingRelation("mother")}
        onCancelAdd={() => setAddingRelation(null)}
        onPick={(id) => handlePick("mother", id)}
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
        candidates={spouseCandidates}
        isAdding={addingRelation === "spouse"}
        pending={pending}
        canEdit={canEdit}
        onStartAdd={() => setAddingRelation("spouse")}
        onCancelAdd={() => setAddingRelation(null)}
        onPick={(id) => handlePick("spouse", id)}
        onRemove={(id) => handleRemove("spouse", id)}
        createHref={`/person/new?relation=spouse&of=${person.id}`}
        personHref={personHref}
      />

      <RelationList
        label="Farzandlari"
        items={children.map((c) => ({ id: c.id, name: personName(c) }))}
        addLabel="+ Farzand qo'shish"
        candidates={childCandidates}
        isAdding={addingRelation === "child"}
        pending={pending}
        canEdit={canEdit}
        onStartAdd={() => setAddingRelation("child")}
        onCancelAdd={() => setAddingRelation(null)}
        onPick={(id) => handlePick("child", id)}
        onRemove={(id) => handleRemove("child", id)}
        createHref={`/person/new?relation=child&of=${person.id}`}
        personHref={personHref}
      />
    </aside>
  );
}

function RelationSlot({
  label,
  existing,
  addLabel,
  candidates,
  isAdding,
  pending,
  canEdit,
  onStartAdd,
  onCancelAdd,
  onPick,
  onRemove,
  createHref,
  personHref,
}: {
  label: string;
  existing?: Person;
  addLabel: string;
  candidates: Person[];
  isAdding: boolean;
  pending: boolean;
  canEdit: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onPick: (id: string) => void;
  onRemove: (id: string) => void;
  createHref: string;
  personHref: (id: string) => string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      {existing ? (
        <div className="flex items-center gap-2">
          <Link href={personHref(existing.id)} className="text-sm text-ink hover:text-brand hover:underline">
            {personName(existing)}
          </Link>
          {canEdit && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onRemove(existing.id)}
              className="text-xs text-danger hover:underline disabled:opacity-50"
            >
              olib tashlash
            </button>
          )}
        </div>
      ) : isAdding ? (
        <RelativePicker
          candidates={candidates}
          pending={pending}
          onSelect={onPick}
          onCancel={onCancelAdd}
          createHref={createHref}
        />
      ) : canEdit ? (
        <button type="button" onClick={onStartAdd} className="text-sm text-brand hover:underline">
          {addLabel}
        </button>
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
  candidates,
  isAdding,
  pending,
  canEdit,
  onStartAdd,
  onCancelAdd,
  onPick,
  onRemove,
  createHref,
  personHref,
}: {
  label: string;
  items: { id: string; name: string; note?: string }[];
  addLabel: string;
  candidates: Person[];
  isAdding: boolean;
  pending: boolean;
  canEdit: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onPick: (id: string) => void;
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
            <Link href={personHref(item.id)} className="text-sm text-ink hover:text-brand hover:underline">
              {item.name}
            </Link>
            {item.note && <span className="text-xs text-ink-faint">({item.note})</span>}
            {canEdit && (
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(item.id)}
                className="text-xs text-danger hover:underline disabled:opacity-50"
              >
                olib tashlash
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && !isAdding && <p className="text-sm text-ink-faint">—</p>}
        {isAdding ? (
          <RelativePicker
            candidates={candidates}
            pending={pending}
            onSelect={onPick}
            onCancel={onCancelAdd}
            createHref={createHref}
          />
        ) : (
          canEdit && (
            <button
              type="button"
              onClick={onStartAdd}
              className="text-left text-sm text-brand hover:underline"
            >
              {addLabel}
            </button>
          )
        )}
      </div>
    </div>
  );
}
