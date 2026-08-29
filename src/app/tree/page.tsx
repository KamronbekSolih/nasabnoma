import { redirect } from "next/navigation";
import { getCurrentTree } from "@/lib/tree/current";
import { loadTreeData } from "@/lib/tree/load";
import { FamilyTreeView } from "@/components/tree/FamilyTreeView";

export default async function TreePage() {
  const tree = await getCurrentTree();
  if (!tree) redirect("/onboarding");

  const { people, families, familyChildren } = await loadTreeData(tree);

  return (
    <FamilyTreeView
      people={people}
      families={families}
      familyChildren={familyChildren}
      role={tree.role}
    />
  );
}
