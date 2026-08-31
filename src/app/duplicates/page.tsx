import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree, isAdminRole } from "@/lib/tree/current";
import { loadTreeData } from "@/lib/tree/load";
import { findDuplicateCandidates, pairKey } from "@/lib/duplicates";
import { DuplicateList } from "@/components/duplicates/DuplicateList";

export default async function DuplicatesPage() {
  const tree = await getCurrentTree();
  if (!tree) redirect("/onboarding");
  if (!isAdminRole(tree.role)) redirect("/tree");

  const supabase = await createClient();
  const [{ people }, { data: dismissals }] = await Promise.all([
    loadTreeData(tree),
    supabase
      .from("duplicate_dismissals")
      .select("person_a_id, person_b_id")
      .eq("tree_id", tree.tree_id),
  ]);

  // Dismissals are stored canonically (smaller uuid first) and pairKey() rebuilds
  // that same order, so a pair matches regardless of which way round the detector
  // happened to emit it this time.
  const dismissed = new Set(
    (dismissals ?? []).map((d) => pairKey(d.person_a_id, d.person_b_id)),
  );
  const pairs = findDuplicateCandidates(people).filter(
    (p) => !dismissed.has(pairKey(p.a.id, p.b.id)),
  );

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Takrorlangan yozuvlar</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Bir necha qarindosh bir odamni alohida kiritsa, ikki nusxa paydo bo&apos;ladi. Bu
          yerda ehtimoliy takrorlar ko&apos;rsatiladi — birlashtirishdan oldin tekshiring,
          chunki bobosining ismi bilan atalgan nevara ham shunday ko&apos;rinishi mumkin.
        </p>
      </div>
      <DuplicateList pairs={pairs} />
    </main>
  );
}
