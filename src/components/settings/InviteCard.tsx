"use client";

import { useState } from "react";

export function InviteCard({ code }: { code: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : "";

  async function copy(text: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard API can be unavailable (e.g. non-HTTPS); the text is still selectable.
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-transparent p-4 shadow-[0_1px_2px_rgba(27,26,24,0.08)] sm:p-5">
      <h2 className="font-display text-sm font-semibold tracking-wide text-ink-muted uppercase">
        Oila a&apos;zolarini taklif qilish
      </h2>
      <p className="text-sm text-ink-muted">
        Quyidagi havolani qarindoshlaringizga yuboring — ular hisob yaratib, shu shajaraga
        avtomatik qo&apos;shiladi.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={link}
          className="min-h-11 flex-1 rounded-card border border-line-strong bg-paper px-3 text-base text-ink sm:min-h-10 sm:text-sm"
        />
        <button
          type="button"
          onClick={() => copy(link, "link")}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-card border border-brand px-4 font-display text-sm font-semibold text-brand transition-colors hover:bg-brand-soft sm:min-h-10"
        >
          {copied === "link" ? "Nusxalandi!" : "Nusxalash"}
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span>Yoki kod:</span>
        <code className="rounded bg-paper-sunken px-2 py-1 font-mono">{code}</code>
        <button
          type="button"
          onClick={() => copy(code, "code")}
          className="inline-flex min-h-11 items-center rounded-card px-2 text-brand hover:bg-brand-soft sm:min-h-8"
        >
          {copied === "code" ? "Nusxalandi!" : "Nusxalash"}
        </button>
      </div>
    </div>
  );
}
