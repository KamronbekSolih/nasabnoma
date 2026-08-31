import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree } from "@/lib/tree/current";
import { getMyProfile } from "@/lib/profile";
import { personName } from "@/lib/people";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { LinkedAccounts } from "@/components/profile/LinkedAccounts";
import { Card, Notice } from "@/components/ui/primitives";
import type { Person } from "@/lib/types";

export const metadata = { title: "Profilim — 7avlod" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/profile");

  const [profile, tree] = await Promise.all([getMyProfile(), getCurrentTree()]);

  // Which person in the current tree this account is linked to, if any.
  let claimed: Person | null = null;
  if (tree) {
    const { data } = await supabase
      .from("people_view")
      .select("*")
      .eq("tree_id", tree.tree_id)
      .eq("claimed_by", user.id)
      .maybeSingle();
    claimed = (data as Person | null) ?? null;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Profilim</h1>

      <Card title="Ismingiz">
        <ProfileForm initialName={profile?.full_name ?? ""} />
      </Card>

      <Card
        title="Shajaradagi oʻrningiz"
        description="Shajaradagi qaysi yozuv oʻzingiz ekanini belgilashingiz mumkin."
      >
        {claimed ? (
          <div className="flex flex-col gap-2">
            <Link
              href={`/person/${claimed.id}`}
              className="font-display text-lg text-ink hover:text-brand hover:underline"
            >
              {personName(claimed)}
            </Link>
            <p className="text-sm text-ink-muted">
              Bu yozuv sizga biriktirilgan — oʻz maʼlumotlaringizni koʻra olasiz.
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Hali hech qaysi yozuv sizga biriktirilmagan. Shajarada oʻzingizni toping
            va u yerda <strong>&laquo;Bu menman&raquo;</strong> tugmasini bosing.
          </p>
        )}
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

      <Link href="/tree" className="text-sm text-brand hover:underline">
        ← Shajaraga qaytish
      </Link>
    </main>
  );
}
