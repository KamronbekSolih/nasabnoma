import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree } from "@/lib/tree/current";
import { loadTreeData } from "@/lib/tree/load";
import { FamilyTreeView } from "@/components/tree/FamilyTreeView";

export default async function TreePage() {
  const tree = await getCurrentTree();
  if (!tree) redirect("/onboarding");

  const supabase = await createClient();
  const [{ people, families, familyChildren }, { data: { user } }] = await Promise.all([
    loadTreeData(tree),
    supabase.auth.getUser(),
  ]);

  // Which person (if any) this account already identified as, in this tree.
  // `claimed_by` comes straight off people_view and is never masked, so this
  // needs no extra query beyond the one loadTreeData already made.
  const myClaimedPersonId = user
    ? (people.find((p) => p.claimed_by === user.id)?.id ?? null)
    : null;

  return (
    <FamilyTreeView
      people={people}
      families={families}
      familyChildren={familyChildren}
      role={tree.role}
      currentUserId={user?.id ?? null}
      myClaimedPersonId={myClaimedPersonId}
    />
  );
}
