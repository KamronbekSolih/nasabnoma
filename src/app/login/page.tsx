"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonPrimary, inputClass, Field } from "@/components/ui/primitives";
import { MosaicScatter, OrnamentalDivider } from "@/components/ui/Ornament";

type Mode = "signin" | "signup";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = searchParams.get("redirect") || "/tree";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      router.push(destination);
      router.refresh();
    } else {
      const { error, data } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      if (data.session) {
        router.push(destination);
        router.refresh();
      } else {
        setInfo("Emailingizga tasdiqlash havolasi yuborildi. Uni bosib, soʻng kiring.");
      }
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        {/* Mosaic fragments to the left of the wordmark, as in a broken-tile panel.
            Hidden on small screens, where it would crowd the form. */}
        <div className="mb-4 hidden justify-center sm:flex">
          <MosaicScatter className="h-20 w-28 opacity-90" />
        </div>
        <h1 className="font-display text-4xl tracking-wide text-brand">Nasabnoma</h1>
        <OrnamentalDivider className="my-4" />
        <p className="font-body text-sm text-ink-muted italic">
          Oila shajarangizni saqlang, tuzing va avlodlarga qoldiring
        </p>
      </div>

      <div className="illuminated rounded-card border border-line-strong bg-surface p-5 sm:p-6">
        <div className="flex rounded-lg bg-paper-sunken p-1 text-sm font-medium">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`min-h-10 flex-1 rounded-md transition-colors ${
                mode === m
                  ? "bg-surface text-ink shadow-[0_1px_2px_rgba(43,37,33,0.08)]"
                  : "text-ink-muted"
              }`}
            >
              {m === "signin" ? "Kirish" : "Roʻyxatdan oʻtish"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Parol" htmlFor="password" hint="Kamida 6 ta belgi">
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>

          {error && <p className="text-sm text-danger">{error}</p>}
          {info && <p className="text-sm text-brand">{info}</p>}

          <button type="submit" disabled={loading} className={`${buttonPrimary} mt-1 w-full`}>
            {loading ? "Yuklanmoqda..." : mode === "signin" ? "Kirish" : "Roʻyxatdan oʻtish"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
      {/* Girih lattice washed out behind the card — texture, not pattern-as-noise. */}
      <div
        className="girih-field pointer-events-none absolute inset-0 opacity-[0.13]"
        aria-hidden="true"
      />
      {/* useSearchParams needs a Suspense boundary to avoid opting the whole route
          out of static rendering. */}
      <div className="relative">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
