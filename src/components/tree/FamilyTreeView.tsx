"use client";

import { useMemo, useState } from "react";
import ReactFamilyTree from "react-family-tree";
import type { ExtNode } from "relatives-tree/lib/types";
import Link from "next/link";
import { buildTreeNodes } from "@/lib/tree/buildTree";
import { pickDefaultRootId } from "@/lib/tree/connectivity";
import { FamilyGraph } from "@/lib/tree/relations";
import { FamilyNode } from "./FamilyNode";
import { PersonPanel } from "./PersonPanel";
import { TreeCanvas } from "./TreeCanvas";
import { personName } from "@/lib/people";
import { canEditRole } from "@/lib/roles";
import { buttonPrimary, inputClass } from "@/components/ui/primitives";
import { StarRosette } from "@/components/ui/Ornament";
import type { Family, FamilyChild, Person, TreeRole } from "@/lib/types";

const WIDTH = 180;
const HEIGHT = 100;

/** Matches the apostrophe variants and case differences that make the same Uzbek
 * name look like two different strings. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[ʻʼ'`’]/g, "").trim();
}

export function FamilyTreeView({
  people,
  families,
  familyChildren,
  role,
}: {
  people: Person[];
  families: Family[];
  familyChildren: FamilyChild[];
  role: TreeRole;
}) {
  const graph = useMemo(
    () => new FamilyGraph(people, families, familyChildren),
    [people, families, familyChildren],
  );
  const nodes = useMemo(() => buildTreeNodes(graph), [graph]);
  const defaultRootId = useMemo(() => pickDefaultRootId(graph), [graph]);
  const unlinkedPeople = useMemo(() => graph.unlinkedPeople(), [graph]);

  const [rootId, setRootId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const effectiveRootId = rootId && graph.personById.has(rootId) ? rootId : defaultRootId;
  const selectedPerson = selectedId ? graph.personById.get(selectedId) : undefined;
  const canEdit = canEditRole(role);

  const matches = useMemo(() => {
    const q = normalize(query);
    if (!q) return null;
    return new Set(
      people.filter((p) => normalize(personName(p)).includes(q)).map((p) => p.id),
    );
  }, [query, people]);

  const searchResults = useMemo(() => {
    if (!matches) return [];
    return people.filter((p) => matches.has(p.id)).slice(0, 6);
  }, [matches, people]);

  if (people.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <StarRosette size={56} className="opacity-70" />
        <div>
          <h2 className="font-display text-xl text-ink">Shajara hali boʻsh</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Birinchi odamni qoʻshing — odatda oʻzingizdan yoki bobongizdan boshlanadi.
          </p>
        </div>
        {canEdit && (
          <Link href="/person/new" className={buttonPrimary}>
            Birinchi odamni qoʻshish
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface/90 px-3 py-2.5 backdrop-blur sm:px-4">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ism boʻyicha qidirish..."
            className={inputClass}
          />
          {searchResults.length > 0 && (
            <ul className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border border-line-strong bg-surface shadow-lg">
              {searchResults.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setRootId(p.id);
                      setSelectedId(p.id);
                      setQuery("");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-brand-soft"
                  >
                    {personName(p)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label htmlFor="root" className="ml-auto hidden text-sm text-ink-muted sm:block">
          Markaz:
        </label>
        <select
          id="root"
          value={effectiveRootId}
          onChange={(e) => setRootId(e.target.value)}
          className="min-h-11 max-w-[45vw] rounded-lg border border-line-strong bg-surface px-2 text-sm text-ink sm:min-h-9 sm:max-w-none"
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {personName(p)}
            </option>
          ))}
        </select>
      </div>

      <TreeCanvas contentKey={effectiveRootId}>
        <ReactFamilyTree
          nodes={nodes}
          rootId={effectiveRootId}
          width={WIDTH}
          height={HEIGHT}
          className="relative"
          renderNode={(node: ExtNode) => {
            const person = graph.personById.get(node.id);
            if (!person) return null;
            return (
              <FamilyNode
                key={node.id}
                node={node}
                person={person}
                selected={node.id === selectedId}
                matched={matches?.has(node.id)}
                dimmed={!!matches && !matches.has(node.id)}
                onSelect={setSelectedId}
              />
            );
          }}
        />
      </TreeCanvas>

      {unlinkedPeople.length > 0 && (
        <div className="border-t border-gold-line bg-gold-soft px-4 py-2.5">
          <p className="text-sm font-medium text-notice">
            Bogʻlanmagan odamlar — daraxtda koʻrinmaydi:
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {unlinkedPeople.map((p) => (
              <Link
                key={p.id}
                href={`/person/${p.id}`}
                className="text-sm text-notice underline hover:no-underline"
              >
                {personName(p)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {selectedPerson && (
        <PersonPanel
          person={selectedPerson}
          graph={graph}
          canEdit={canEdit}
          onClose={() => setSelectedId(null)}
          onFocus={(id) => setRootId(id)}
        />
      )}
    </div>
  );
}
