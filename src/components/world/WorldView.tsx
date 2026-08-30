"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FamilyGlobe, type CountryCount } from "./FamilyGlobe";
import { OrnamentalDivider } from "@/components/ui/Ornament";
import { personName } from "@/lib/people";
import { coordsForCountry, isHomeCountry } from "@/lib/reference/coordinates";
import type { Person } from "@/lib/types";

export function WorldView({
  distribution,
  people,
}: {
  distribution: CountryCount[];
  /** Only people whose location the viewer is actually allowed to see. Everyone
   * else still counts toward the totals, but is never named here. */
  people: Person[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const total = distribution.reduce((sum, d) => sum + d.person_count, 0);
  const abroad = distribution
    .filter((d) => !isHomeCountry(d.country))
    .reduce((sum, d) => sum + d.person_count, 0);

  const namedByCountry = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const p of people) {
      if (!p.current_country) continue;
      const list = map.get(p.current_country);
      if (list) list.push(p);
      else map.set(p.current_country, [p]);
    }
    return map;
  }, [people]);

  const selectedRow = selected
    ? distribution.find((d) => d.country === selected)
    : null;
  const namedInSelected = selected ? (namedByCountry.get(selected) ?? []) : [];

  if (distribution.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-3xl text-ink">Dunyo boʻylab</h1>
        <OrnamentalDivider className="my-4" />
        <p className="text-sm text-ink-muted">
          Hozircha hech kimning hozirgi manzili kiritilmagan. Odamlarning
          ma&apos;lumotlarida <strong>Hozirgi manzil</strong> boʻlimini toʻldiring —
          shundan soʻng qarindoshlar shu xaritada koʻrinadi.
        </p>
        <Link href="/tree" className="mt-6 inline-block text-sm text-brand hover:underline">
          ← Shajaraga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="text-center">
        <h1 className="font-display text-3xl text-ink sm:text-4xl">Dunyo boʻylab</h1>
        <OrnamentalDivider className="my-4" />
        <p className="mx-auto max-w-xl font-body text-sm text-ink-muted italic">
          {abroad > 0
            ? `Oilamizning ${total} a'zosi ${distribution.length} davlatda — ${abroad} nafari Oʻzbekistondan tashqarida.`
            : `Oilamizning ${total} a'zosi hozircha bir yurtda.`}
        </p>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* A self-contained globe — a solid-colour sphere plus real country
            border polygons drawn on top, no tile service of any kind. Land,
            ocean, and this card's own background are three deliberately
            distinct tones (see the colour comments in FamilyGlobe.tsx) so the
            globe can never blend into its own frame the way two earlier
            versions of this map did. */}
        <div className="illuminated relative overflow-hidden rounded-card border border-line-strong bg-surface">
          <div className="relative mx-auto w-full max-w-[560px] p-2 sm:p-4">
            <FamilyGlobe
              distribution={distribution}
              people={people}
              selectedCountry={selected}
              onSelectCountry={(c) => setSelected((prev) => (prev === c ? null : c))}
            />
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <div className="rounded-card border border-line bg-transparent p-4">
            <h2 className="font-display text-sm font-semibold tracking-wide text-ink-muted uppercase">
              Davlatlar
            </h2>
            <ul className="mt-3 flex flex-col">
              {distribution.map((row) => {
                const placed = !!coordsForCountry(row.country);
                const active = row.country === selected;
                return (
                  <li key={row.country}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected((prev) => (prev === row.country ? null : row.country))
                      }
                      className={`flex w-full items-center justify-between gap-3 rounded-card px-2 py-2 text-left transition-colors ${
                        active ? "bg-brand-soft" : "hover:bg-paper-sunken"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rotate-45 ${
                            isHomeCountry(row.country) ? "bg-brand-line" : "bg-brand"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate text-sm text-ink">{row.country}</span>
                        {!placed && (
                          <span
                            className="text-xs text-ink-faint"
                            title="Xaritada koʻrsatib boʻlmadi"
                          >
                            ⚑
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-display text-sm text-ink-muted">
                        {row.person_count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selectedRow && (
            <div className="rounded-card border border-line bg-transparent p-4">
              <h3 className="font-display text-base text-ink">{selectedRow.country}</h3>
              <p className="mt-0.5 text-sm text-ink-muted">
                {selectedRow.person_count} qarindosh
              </p>

              {namedInSelected.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                  {namedInSelected.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/person/${p.id}`}
                        className="text-sm text-ink hover:text-brand hover:underline"
                      >
                        {personName(p)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {namedInSelected.length < selectedRow.person_count && (
                <p className="mt-3 text-xs text-ink-faint">
                  {namedInSelected.length === 0
                    ? "Tirik qarindoshlarning manzili yopiq — bu yerda faqat umumiy soni koʻrsatiladi."
                    : `Yana ${selectedRow.person_count - namedInSelected.length} kishining manzili yopiq.`}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
