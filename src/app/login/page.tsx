"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonPrimary, inputClass, Field } from "@/components/ui/primitives";
import { OrnamentalDivider } from "@/components/ui/Ornament";

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
        {/* The emblem-only mark (no baked-in wordmark) — set the actual "7avlod"
            text below it, two-toned the same way as the header, rather than
            re-rasterizing type into the image. */}
        <Image
          src="/brand/logo-mark.png"
          alt=""
          width={760}
          height={709}
          priority
          className="mx-auto h-32 w-auto sm:h-36"
        />
        <p className="font-display text-3xl tracking-wide">
          <span className="text-brand">7</span>
          <span className="text-ink">avlod</span>
        </p>
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

          {mode === "signin" && (
            <Link
              href="/reset-password"
              className="-mt-2 self-end text-xs text-ink-muted hover:text-brand hover:underline"
            >
              Parolni unutdingizmi?
            </Link>
          )}

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
