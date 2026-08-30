"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { joinTreeByCode } from "@/app/tree/actions";

export function JoinAccept({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    joinTreeByCode(code).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/tree");
      router.refresh();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (error) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-ink">Qo&apos;shilib bo&apos;lmadi</h1>
        <p className="mt-2 text-sm text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
      <p className="text-sm text-ink-muted">Shajaraga qo&apos;shilmoqdasiz...</p>
    </div>
  );
}
