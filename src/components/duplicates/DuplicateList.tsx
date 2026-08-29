"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mergePeople } from "@/app/person/actions";
import { personName } from "@/lib/people";
import type { DuplicatePair } from "@/lib/duplicates";
import type { Person } from "@/lib/types";

function summary(person: Person): string {
  const bits = [
    person.birth_date?.slice(0, 4) ?? person.birth_date_approx ?? null,
    person.birth_mahalla,
    person.urug,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "qoʻshimcha ma'lumot yoʻq";
}

export function DuplicateList({ pairs }: { pairs: DuplicatePair[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const visible = pairs.filter((p) => !dismissed.has(`${p.a.id}:${p.b.id}`));

  async function handleMerge(keep: Person, merge: Person) {
    if (
      !confirm(
        `"${personName(merge)}" yozuvi "${personName(keep)}" ichiga birlashtiriladi va oʻchiriladi. Davom etasizmi?`,
      )
    ) {
      return;
    }
    setPending(`${keep.id}:${merge.id}`);
    setError(null);
    try {
      await mergePeople(keep.id, merge.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi.");
    } finally {
      setPending(null);
    }
  }

  if (visible.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface p-5 text-sm text-ink-muted">
        Takrorlangan yozuvlar topilmadi.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}

      {visible.map((pair) => {
        const key = `${pair.a.id}:${pair.b.id}`;
        const busy = pending !== null;
        return (
          <div key={key} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-ink">{pair.reasons.join(" · ")}</p>
              <span className="text-xs text-ink-faint">
                {Math.round(pair.score * 100)}% oʻxshashlik
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[pair.a, pair.b].map((p, idx) => {
                const other = idx === 0 ? pair.b : pair.a;
                return (
                  <div key={p.id} className="flex flex-col gap-2 rounded-lg border border-line p-3">
                    <Link
                      href={`/person/${p.id}`}
                      className="text-sm font-semibold text-ink hover:underline"
                    >
                      {personName(p)}
                    </Link>
                    <p className="text-xs text-ink-muted">{summary(p)}</p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleMerge(p, other)}
                      className="mt-auto rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Shuni saqlab, ikkinchisini birlashtirish
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setDismissed((prev) => new Set(prev).add(key))}
              className="self-start text-xs text-ink-muted hover:underline"
            >
              Bular boshqa-boshqa odamlar — yashirish
            </button>
          </div>
        );
      })}
    </div>
  );
}
