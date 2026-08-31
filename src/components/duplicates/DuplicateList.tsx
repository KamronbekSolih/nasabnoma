"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mergePeople } from "@/app/person/actions";
import { dismissDuplicatePair } from "@/app/duplicates/actions";
import { pairKey } from "@/lib/duplicates";
import { personName } from "@/lib/people";
import { buttonPrimary, buttonSecondary } from "@/components/ui/primitives";
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
  // Hides the card the moment it is dismissed; the server is the source of
  // truth and the refresh below reconciles it. Without this the row would sit
  // there until the round-trip finished.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const visible = pairs.filter((p) => !hidden.has(pairKey(p.a.id, p.b.id)));

  async function handleMerge(keep: Person, merge: Person) {
    if (
      !confirm(
        `"${personName(merge)}" yozuvi "${personName(keep)}" ichiga birlashtiriladi va oʻchiriladi. Davom etasizmi?`,
      )
    ) {
      return;
    }
    setPending(pairKey(keep.id, merge.id));
    setError(null);
    const result = await mergePeople(keep.id, merge.id);
    setPending(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDismiss(pair: DuplicatePair) {
    const key = pairKey(pair.a.id, pair.b.id);
    setPending(key);
    setError(null);
    const result = await dismissDuplicatePair(pair.a.id, pair.b.id);
    setPending(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setHidden((prev) => new Set(prev).add(key));
    router.refresh();
  }

  if (visible.length === 0) {
    return (
      <p className="rounded-card border border-line bg-transparent p-4 text-sm text-ink-muted sm:p-5">
        Takrorlangan yozuvlar topilmadi.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}

      {visible.map((pair) => {
        const key = pairKey(pair.a.id, pair.b.id);
        const busy = pending !== null;
        return (
          <div
            key={key}
            className="flex flex-col gap-3 rounded-card border border-line bg-transparent p-4 shadow-[0_1px_2px_rgba(27,26,24,0.08)] sm:p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-ink">{pair.reasons.join(" · ")}</p>
              <span className="text-xs text-ink-faint">
                {Math.round(pair.score * 100)}% oʻxshashlik
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[pair.a, pair.b].map((p, idx) => {
                const other = idx === 0 ? pair.b : pair.a;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-2 rounded-card border border-line p-3"
                  >
                    <Link
                      href={`/person/${p.id}`}
                      className="text-sm font-semibold text-ink hover:text-brand hover:underline"
                    >
                      {personName(p)}
                    </Link>
                    <p className="text-sm text-ink-muted">{summary(p)}</p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleMerge(p, other)}
                      className={`${buttonPrimary} mt-auto w-full`}
                    >
                      {pending === key ? "Bajarilmoqda..." : "Shuni saqlab, birlashtirish"}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => handleDismiss(pair)}
              className={`${buttonSecondary} self-start`}
            >
              Bular boshqa-boshqa odamlar
            </button>
          </div>
        );
      })}
    </div>
  );
}
