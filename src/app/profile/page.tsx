import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree, canEditRole, isAdminRole } from "@/lib/tree/current";
import { loadTreeData } from "@/lib/tree/load";
import { getMyProfile } from "@/lib/profile";
import { getPersonDocuments } from "@/lib/documents";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { LinkedAccounts } from "@/components/profile/LinkedAccounts";
import { PersonProfile } from "@/components/people/PersonProfile";
import { Card, Notice } from "@/components/ui/primitives";
import type { FamilyGraph } from "@/lib/tree/relations";
import type { Person } from "@/lib/types";

export const metadata = { title: "Profilim — 7avlod" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/profile");

  const [profile, tree] = await Promise.all([getMyProfile(), getCurrentTree()]);

  // Which person in the current tree this account is linked to, if any — and
  // if so, its full graph, so the relatives/location/bio cards below can
  // render the same way /person/[id] does rather than repeating that logic.
  let claimed: Person | null = null;
  let graph: FamilyGraph | null = null;
  if (tree) {
    const [{ data }, treeData] = await Promise.all([
      supabase
        .from("people_view")
        .select("*")
        .eq("tree_id", tree.tree_id)
        .eq("claimed_by", user.id)
        .maybeSingle(),
      loadTreeData(tree),
    ]);
    claimed = (data as Person | null) ?? null;
    graph = treeData.graph;
  }

  const canEdit = tree ? canEditRole(tree.role) : false;
  const isAdmin = tree ? isAdminRole(tree.role) : false;
  // Your own record is always details_visible to you (can_view_details returns
  // true for claimed_by = auth.uid()), so there's no visibility branch here.
  const documents = claimed ? await getPersonDocuments(claimed.id) : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Profilim</h1>

      <Card title="Ismingiz">
        <ProfileForm initialName={profile?.full_name ?? ""} />
      </Card>

      <Card
        title="Kirish usullari"
        description="Bitta hisobga bir nechta kirish usulini bogʻlashingiz mumkin."
      >
        <LinkedAccounts
          providers={(user.identities ?? []).map((i) => i.provider)}
        />
      </Card>

      <Card title="Hisob">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
              Email
            </dt>
            <dd className="mt-1 text-sm text-ink">{user.email ?? "—"}</dd>
          </div>
          {profile?.telegram_username && (
            <div>
              <dt className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
                Telegram
              </dt>
              <dd className="mt-1 text-sm text-ink">@{profile.telegram_username}</dd>
            </div>
          )}
        </dl>
      </Card>

      {!profile?.full_name && (
        <Notice tone="warning">
          Ismingiz kiritilmagan — hozircha boshqa aʼzolar sizni
          &laquo;Foydalanuvchi&raquo; deb koʻradi.
        </Notice>
      )}

      {/* The shajara-side profile — picture, relatives, tarjimai hol and so on —
          used to live only at /person/[id], so a claimed user effectively had
          two separate profiles. Folding the same view in here, after the
          account-level cards above, makes this one page instead of two. */}
      {claimed && graph ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">
            Shajaradagi profilim
          </h2>
          <PersonProfile
            person={claimed}
            graph={graph}
            canEdit={canEdit}
            currentUserId={user.id}
            isAdmin={isAdmin}
            embedded
            documents={documents}
          />
        </div>
      ) : (
        <Card
          title="Shajaradagi oʻrningiz"
          description="Shajaradagi qaysi yozuv oʻzingiz ekanini belgilashingiz mumkin."
        >
          <p className="text-sm text-ink-muted">
            Hali hech qaysi yozuv sizga biriktirilmagan. Shajarada oʻzingizni toping
            va u yerda <strong>&laquo;Bu menman&raquo;</strong> tugmasini bosing.
          </p>
        </Card>
      )}

      <Link href="/tree" className="text-sm text-brand hover:underline">
        ← Shajaraga qaytish
      </Link>
    </main>
  );
}
