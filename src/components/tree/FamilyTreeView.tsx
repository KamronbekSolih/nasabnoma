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
import { personName } from "@/lib/people";
import { canEditRole } from "@/lib/roles";
import { buttonPrimary, inputClass } from "@/components/ui/primitives";
import { StarRosette } from "@/components/ui/Ornament";
import type { Family, FamilyChild, Person, TreeRole } from "@/lib/types";

const WIDTH = 180;
const HEIGHT = 100;

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 1.15;

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

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
  // The tree only ever grows as people are added, so a fixed-size canvas eventually
  // stops fitting the screen — this scales the whole rendered tree rather than any
  // one node, so relative layout (who's next to whom) never changes, only the size.
  const [zoom, setZoom] = useState(1);

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
    <div className="relative flex flex-1 flex-col overflow-hidden">
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

      {/* flex-1 + overflow-hidden here (not on the scroll div itself) gives the zoom
          toolbar a positioning box that's exactly the visible canvas area — already
          excluding the toolbar row above and the unlinked-people bar below, and
          never the reach of PersonPanel's z-20 side drawer, without it scrolling
          away with the tree underneath it. */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 overflow-auto p-6">
          {/* CSS transform scales the whole canvas without touching the layout math
              inside ReactFamilyTree/FamilyNode (still WIDTH×HEIGHT per node) — the
              wrapper's own box shrinks to fit its (pre-scale) content so the scrolling
              ancestor sees the right, already-scaled scroll extents. */}
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }} className="inline-block">
            <ReactFamilyTree
              nodes={nodes}
              rootId={effectiveRootId}
              width={WIDTH}
              height={HEIGHT}
              className="family-tree-root relative"
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
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 bottom-4 z-10 sm:right-6">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-line-strong bg-surface/95 p-1 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z / ZOOM_STEP))}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Kichraytirish"
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-ink hover:bg-paper-sunken disabled:opacity-30"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="min-w-11 rounded-md px-1 text-center text-xs text-ink-muted hover:bg-paper-sunken"
              title="Asl oʻlchamga qaytarish"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z * ZOOM_STEP))}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Kattalashtirish"
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-ink hover:bg-paper-sunken disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      </div>

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
