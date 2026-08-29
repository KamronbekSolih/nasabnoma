"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { personName } from "@/lib/people";
import type { Person } from "@/lib/types";

/** Search-existing-or-create-new picker for linking a relative. This is the fix for
 * the duplicate-person problem: adding a relative used to always create a brand new
 * person, so anyone already in the tree got a duplicate record instead of a link. */
export function RelativePicker({
  candidates,
  onSelect,
  createHref,
  pending,
  onCancel,
}: {
  candidates: Person[];
  onSelect: (id: string) => void;
  createHref: string;
  pending?: boolean;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? candidates.filter((p) => personName(p).toLowerCase().includes(q)) : candidates;
    return pool.slice(0, 8);
  }, [query, candidates]);

  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded-lg border border-line bg-paper p-2">
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ism bo'yicha qidirish..."
          disabled={pending}
          className="flex-1 rounded-md border border-line-strong px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={onCancel}
          className="px-1 text-ink-faint hover:text-ink"
        >
          ✕
        </button>
      </div>

      {filtered.length > 0 ? (
        <ul className="flex flex-col">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => onSelect(p.id)}
                className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-paper-sunken disabled:opacity-50"
              >
                {personName(p)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-2 py-1 text-xs text-ink-faint">Mos keluvchi topilmadi.</p>
      )}

      <Link href={createHref} className="px-2 text-xs text-brand hover:underline">
        + Ro&apos;yxatda yo&apos;q — yangi odam sifatida qo&apos;shish
      </Link>
    </div>
  );
}
