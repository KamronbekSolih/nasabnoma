import { notFound, redirect } from "next/navigation";
import { getCurrentTree } from "@/lib/tree/current";
import { canEditRole } from "@/lib/roles";
import { loadTreeData } from "@/lib/tree/load";
import { PersonProfile } from "@/components/people/PersonProfile";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tree = await getCurrentTree();
  if (!tree) redirect("/onboarding");

  const { id } = await params;
  const { graph } = await loadTreeData(tree);

  const person = graph.personById.get(id);
  if (!person) notFound();

  return (
    <main className="flex-1">
      <PersonProfile person={person} graph={graph} canEdit={canEditRole(tree.role)} />
    </main>
  );
}
