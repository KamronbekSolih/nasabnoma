import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree } from "@/lib/tree/current";
import { canEditRole, isAdminRole } from "@/lib/roles";
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
  const supabase = await createClient();
  const [{ graph }, { data: auth }] = await Promise.all([
    loadTreeData(tree),
    supabase.auth.getUser(),
  ]);

  const person = graph.personById.get(id);
  if (!person) notFound();

  return (
    <main className="flex-1">
      <PersonProfile
        person={person}
        graph={graph}
        canEdit={canEditRole(tree.role)}
        currentUserId={auth.user?.id ?? null}
        isAdmin={isAdminRole(tree.role)}
      />
    </main>
  );
}
