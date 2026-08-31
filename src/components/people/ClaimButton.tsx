"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimPerson, revokeClaim } from "@/app/person/actions";
import { releaseMyClaim } from "@/app/profile/actions";
import { buttonSecondary } from "@/components/ui/primitives";

type State = "mine" | "unclaimed" | "taken";

/**
 * "This is me" — links the signed-in account to this person record.
 *
 * Claiming is a real privilege change, not a label: it unmasks this person's
 * private fields to the claimer. The database enforces who may do it
 * (migration 022 restricts claim_person to can_edit_tree, so a read-only viewer
 * cannot); this component only decides what to offer.
 */
export function ClaimButton({
  personId,
  state,
  canRevoke,
}: {
  personId: string;
  state: State;
  /** Admins can detach a claim someone else made. */
  canRevoke: boolean;
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
    <div className="flex flex-col gap-2">
      {state === "mine" && (
        <>
          <p className="text-sm text-brand">Bu yozuv sizga biriktirilgan.</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => releaseMyClaim(personId))}
            className={`${buttonSecondary} self-start`}
          >
            {pending ? "Bajarilmoqda..." : "Biriktirishni bekor qilish"}
          </button>
        </>
      )}

      {state === "unclaimed" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => claimPerson(personId))}
          className={`${buttonSecondary} self-start`}
        >
          {pending ? "Bajarilmoqda..." : "Bu menman"}
        </button>
      )}

      {state === "taken" && (
        <>
          <p className="text-sm text-ink-muted">
            Bu yozuv boshqa foydalanuvchiga biriktirilgan.
          </p>
          {canRevoke && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => revokeClaim(personId))}
              className={`${buttonSecondary} self-start`}
            >
              {pending ? "Bajarilmoqda..." : "Biriktirishni olib tashlash"}
            </button>
          )}
        </>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
