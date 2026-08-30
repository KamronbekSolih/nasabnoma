"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeMember, setMemberRole } from "@/app/settings/actions";
import type { TreeMemberRow, TreeRole } from "@/lib/types";

const ROLE_LABEL: Record<TreeRole, string> = {
  owner: "Ega",
  admin: "Administrator",
  member: "A'zo",
  viewer: "Kuzatuvchi",
};

const ROLE_HELP: Record<TreeRole, string> = {
  owner: "Shajarani yaratgan — barcha huquqlar, o'chirib bo'lmaydi.",
  admin: "Hamma narsani ko'radi va tahrirlaydi, tirik odamlarning yopiq ma'lumotlari ham.",
  member: "Tahrirlay oladi, lekin tirik qarindoshlarning shaxsiy ma'lumotlarini ko'rmaydi.",
  viewer: "Faqat ko'radi, hech narsani o'zgartira olmaydi.",
};

export function MembersCard({
  members,
  currentUserId,
}: {
  members: TreeMemberRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ ok: true } | { error: string }>) {
    setPending(true);
    setError(null);
    const result = await fn();
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
        A&apos;zolar va huquqlar
      </h2>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col divide-y divide-line">
        {members.map((m) => {
          const isOwner = m.role === "owner";
          const isSelf = m.user_id === currentUserId;
          return (
            <div key={m.user_id} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="flex-1">
                <p className="text-sm text-ink">
                  {isSelf ? "Siz" : `Foydalanuvchi ${m.user_id.slice(0, 8)}`}
                </p>
                <p className="text-xs text-ink-faint">{ROLE_HELP[m.role]}</p>
              </div>
              {isOwner ? (
                <span className="rounded-md bg-paper-sunken px-2 py-1 text-xs font-medium text-ink-muted">
                  {ROLE_LABEL.owner}
                </span>
              ) : (
                <>
                  <select
                    value={m.role}
                    disabled={pending}
                    onChange={(e) =>
                      run(() => setMemberRole(m.user_id, e.target.value as TreeRole))
                    }
                    className="rounded-lg border border-line-strong px-2 py-1 text-sm"
                  >
                    <option value="admin">{ROLE_LABEL.admin}</option>
                    <option value="member">{ROLE_LABEL.member}</option>
                    <option value="viewer">{ROLE_LABEL.viewer}</option>
                  </select>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm("Bu a'zoni shajaradan chiqarasizmi?")) return;
                      run(() => removeMember(m.user_id));
                    }}
                    className="text-xs text-danger hover:underline disabled:opacity-50"
                  >
                    chiqarish
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
