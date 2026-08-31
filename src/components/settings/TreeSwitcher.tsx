"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { switchTree } from "@/app/tree/actions";
import type { TreeMember } from "@/lib/types";

export function TreeSwitcher({
  memberships,
  currentTreeId,
}: {
  memberships: TreeMember[];
  currentTreeId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  if (memberships.length <= 1) return null;

  async function handleChange(treeId: string) {
    setError(null);
    const result = await switchTree(treeId);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.push("/tree");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1 rounded-card border border-line bg-transparent p-4 shadow-[0_1px_2px_rgba(27,26,24,0.08)] sm:p-5">
      <h2 className="font-display text-sm font-semibold tracking-wide text-ink-muted uppercase">
        Faol shajara
      </h2>
      {error && <p className="text-sm text-danger">{error}</p>}
      <select
        value={currentTreeId}
        onChange={(e) => handleChange(e.target.value)}
        className="mt-1 min-h-11 rounded-card border border-line-strong bg-surface px-3 text-base sm:min-h-10 sm:text-sm"
      >
        {memberships.map((m) => (
          <option key={m.tree_id} value={m.tree_id}>
            {m.tree_name}
          </option>
        ))}
      </select>
    </div>
  );
}
