import { redirect } from "next/navigation";
import { getCurrentTree, isAdminRole } from "@/lib/tree/current";
import { loadTreeData } from "@/lib/tree/load";
import { findDuplicateCandidates } from "@/lib/duplicates";
import { DuplicateList } from "@/components/duplicates/DuplicateList";

export default async function DuplicatesPage() {
  const tree = await getCurrentTree();
  if (!tree) redirect("/onboarding");
  if (!isAdminRole(tree.role)) redirect("/tree");

  const { people } = await loadTreeData(tree);
  const pairs = findDuplicateCandidates(people);

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
