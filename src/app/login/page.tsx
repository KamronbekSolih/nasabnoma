"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonPrimary, buttonSecondary, inputClass, Field } from "@/components/ui/primitives";
import { OrnamentalDivider } from "@/components/ui/Ornament";

type Mode = "signin" | "signup";

/** Set once the Custom OIDC provider exists in the Supabase dashboard, e.g.
 * "custom:telegram". Until then the button stays hidden rather than showing
 * relatives a control that returns "provider is not enabled". */
const TELEGRAM_PROVIDER = process.env.NEXT_PUBLIC_TELEGRAM_PROVIDER;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = searchParams.get("redirect") || "/tree";
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin",
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // The OAuth callback route reports failures by redirecting here with ?error=.
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleTelegram() {
    if (!TELEGRAM_PROVIDER) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      // Custom providers are addressed with a "custom:" prefix on the slug
      // chosen in the dashboard.
      provider: TELEGRAM_PROVIDER as Parameters<
        typeof supabase.auth.signInWithOAuth
      >[0]["provider"],
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
    // On success the browser navigates away, so this only runs on failure.
    if (error) {
      setLoading(false);
      setError(error.message);
    }
  }

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
      // full_name rides along in user metadata, which the handle_new_user
      // trigger reads to create the profile row. Collected as two fields for a
      // cleaner form, joined back into the one string the trigger expects.
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name } },
      });
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
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-xs text-ink-faint hover:text-brand"
      >
        ← Bosh sahifa
      </Link>
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

        {TELEGRAM_PROVIDER && (
          <>
            <button
              type="button"
              onClick={handleTelegram}
              disabled={loading}
              className={`${buttonSecondary} mt-5 w-full gap-2`}
            >
              <TelegramMark />
              Telegram orqali kirish
            </button>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-xs text-ink-faint">yoki email bilan</span>
              <span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ism" htmlFor="first_name">
                <input
                  id="first_name"
                  required
                  autoComplete="given-name"
                  maxLength={50}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Kamronbek"
                  className={inputClass}
                />
              </Field>
              <Field label="Familiya" htmlFor="last_name">
                <input
                  id="last_name"
                  required
                  autoComplete="family-name"
                  maxLength={50}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Solihov"
                  className={inputClass}
                />
              </Field>
              <p className="col-span-2 -mt-2 text-xs text-ink-faint">
                Qarindoshlaringiz sizni shu ism bilan koʻradi.
              </p>
            </div>
          )}

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

function TelegramMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.9 4.3 18.7 19.4c-.24 1.07-.88 1.33-1.78.83l-4.9-3.62-2.37 2.28c-.26.26-.48.48-.99.48l.35-4.99 9.09-8.21c.4-.35-.09-.55-.61-.2L6.26 12.4 1.4 10.88c-1.06-.33-1.08-1.06.22-1.57l19-7.32c.88-.32 1.65.2 1.28 2.31z" />
    </svg>
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
