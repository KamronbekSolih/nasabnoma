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
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">
        Faol shajara
      </h2>
      {error && <p className="text-sm text-danger">{error}</p>}
      <select
        value={currentTreeId}
        onChange={(e) => handleChange(e.target.value)}
        className="mt-1 rounded-lg border border-line-strong px-3 py-2 text-sm"
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
