import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree } from "@/lib/tree/current";
import { loadTreeData } from "@/lib/tree/load";
import { WorldView } from "@/components/world/WorldView";
import type { CountryCount } from "@/components/world/MapLibreGlobe";

export const metadata = {
  title: "Dunyo boʻylab — 7avlod",
};

export default async function WorldPage() {
  const tree = await getCurrentTree();
  if (!tree) redirect("/onboarding");

  const supabase = await createClient();

  // The RPC gives per-country COUNTS for everyone (it sees past the privacy mask
  // but only ever returns aggregates) — kept for the country list even though
  // current_country is now public through people_view too, so the totals still
  // include anyone whose current_country wasn't parseable into a map point.
  const [{ data: distribution, error }, { people }] = await Promise.all([
    supabase.rpc("country_distribution", { p_tree_id: tree.tree_id }),
    loadTreeData(tree),
  ]);

  if (error) {
    throw new Error(`Davlatlar boʻyicha maʼlumotni oʻqib boʻlmadi: ${error.message}`);
  }

  // Current location is public (people_view no longer masks it), so every living
  // person who entered one is named here — not just admin-visible or opted-public
  // ones, the way it worked before that field's classification changed.
  const namedAbroad = people.filter((p) => !p.is_deceased && p.current_country);

  return (
    <main className="flex-1">
      <WorldView
        distribution={(distribution as CountryCount[]) ?? []}
        people={namedAbroad}
      />
    </main>
  );
}
