"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTree, joinTreeByCode } from "@/app/tree/actions";

type Mode = "create" | "join";

export function OnboardingForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [treeName, setTreeName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "create") {
        await createTree(treeName || "Oilaviy shajara");
      } else {
        await joinTreeByCode(code);
      }
      router.push("/tree");
      router.refresh();
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-ink">Nasabnoma&apos;ga xush kelibsiz</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Yangi shajara boshlang yoki oila a&apos;zosi sifatida qo&apos;shiling
      </p>

      <div className="mt-6 flex rounded-lg bg-paper-sunken p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex-1 rounded-md py-1.5 transition-colors ${
            mode === "create" ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
          }`}
        >
          Yangi shajara
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex-1 rounded-md py-1.5 transition-colors ${
            mode === "join" ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
          }`}
        >
          Taklif kodi bilan
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {mode === "create" ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="treeName" className="text-sm font-medium text-ink">
              Shajara nomi
            </label>
            <input
              id="treeName"
              value={treeName}
              onChange={(e) => setTreeName(e.target.value)}
              placeholder="Masalan: Solihovlar shajarasi"
              className="rounded-lg border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="code" className="text-sm font-medium text-ink">
              Taklif kodi
            </label>
            <input
              id="code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="masalan, a1b2c3d4e5f6"
              className="rounded-lg border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Yuklanmoqda..." : mode === "create" ? "Boshlash" : "Qo'shilish"}
        </button>
      </form>
    </div>
  );
}
