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
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">
        Oila a&apos;zolarini taklif qilish
      </h2>
      <p className="text-sm text-ink-muted">
        Quyidagi havolani qarindoshlaringizga yuboring — ular hisob yaratib, shu shajaraga
        avtomatik qo&apos;shiladi.
      </p>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          className="flex-1 rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink"
        />
        <button
          type="button"
          onClick={() => copy(link, "link")}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
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
          className="text-brand hover:underline"
        >
          {copied === "code" ? "Nusxalandi!" : "Nusxalash"}
        </button>
      </div>
    </div>
  );
}
