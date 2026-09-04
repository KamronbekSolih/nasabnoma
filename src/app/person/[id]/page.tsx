import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree } from "@/lib/tree/current";
import { canEditRole, isAdminRole } from "@/lib/roles";
import { loadTreeData } from "@/lib/tree/load";
import { getPersonDocuments } from "@/lib/documents";
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

  // Only worth the signed-URL round trip when this viewer may see the person's
  // private details at all — RLS would return nothing otherwise.
  const documents = person.details_visible ? await getPersonDocuments(person.id) : [];

  return (
    <main className="flex-1">
      <PersonProfile
        person={person}
        graph={graph}
        canEdit={canEditRole(tree.role)}
        currentUserId={auth.user?.id ?? null}
        isAdmin={isAdminRole(tree.role)}
        documents={documents}
      />
    </main>
  );
}
