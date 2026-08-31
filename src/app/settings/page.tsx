import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree, getUserTrees, isAdminRole } from "@/lib/tree/current";
import { InviteCard } from "@/components/settings/InviteCard";
import { TreeSwitcher } from "@/components/settings/TreeSwitcher";
import { MembersCard } from "@/components/settings/MembersCard";
import { AddTreeCard } from "@/components/settings/AddTreeCard";
import type { TreeMemberRow } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  owner: "Ega",
  admin: "Administrator",
  member: "A'zo",
  viewer: "Kuzatuvchi",
};

export default async function SettingsPage() {
  const tree = await getCurrentTree();
  if (!tree) redirect("/onboarding");

  const memberships = await getUserTrees();
  const isAdmin = isAdminRole(tree.role);
  const supabase = await createClient();

  const [{ data: treeRow }, { data: members }, { data: auth }] = await Promise.all([
    supabase.from("trees").select("id, name, invite_code").eq("id", tree.tree_id).single(),
    supabase.from("tree_members").select("*").eq("tree_id", tree.tree_id).order("joined_at"),
    supabase.auth.getUser(),
  ]);

  if (!treeRow) redirect("/onboarding");
  const memberRows = (members as TreeMemberRow[]) ?? [];

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-ink">Sozlamalar</h1>

      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {treeRow.name}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {memberRows.length} a&apos;zo · sizning rolingiz: {ROLE_LABEL[tree.role] ?? tree.role}
        </p>
      </div>

      {isAdmin && (
        <>
          <InviteCard code={treeRow.invite_code} />
          <MembersCard members={memberRows} currentUserId={auth.user?.id ?? ""} />
          <Link
            href="/duplicates"
            className="rounded-xl border border-line bg-surface p-5 transition-colors hover:bg-paper"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Takrorlangan yozuvlar
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Bir odam ikki marta kiritilgan bo&apos;lsa, topib birlashtirish →
            </p>
          </Link>
        </>
      )}

      <TreeSwitcher memberships={memberships} currentTreeId={tree.tree_id} />

      <AddTreeCard />
    </main>
  );
}
