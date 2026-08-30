"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonPrimary, inputClass, Field } from "@/components/ui/primitives";
import { OrnamentalDivider } from "@/components/ui/Ornament";

/**
 * Two sub-flows share this one route, distinguished only by what's in the URL
 * when it loads — Supabase's own convention, not a choice made here:
 *
 * - No recovery token at all → "request" (the ordinary case: someone clicked
 *   "Forgot password?" and needs to submit their email).
 * - `#access_token=...&type=recovery` → the browser client's detectSessionInUrl
 *   auto-consumes it into a real (if short-lived) session and fires a
 *   PASSWORD_RECOVERY auth event — that's the cue to show "set a new password".
 * - `#error=...&error_code=otp_expired...` → the link was already used or is
 *   past Supabase's expiry window. The client never turns this into a session,
 *   so it's ours to read out of the hash and show something better than a
 *   dead localhost redirect.
 */
type Stage = "loading" | "request" | "update" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStage("update");
    });

    // Deferred a tick so the state updates below happen from a callback rather
    // than synchronously in the effect body (the lint rule for that flags even
    // one-time, non-reactive mount work like reading window.location.hash).
    queueMicrotask(() => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const hashError = hash.get("error_description");

      if (hashError) {
        setError(hashError.replace(/\+/g, " "));
        setStage("request");
        // Strip the error out of the address bar — it's been read, and a stale
        // otp_expired error shouldn't survive a page refresh.
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      if (!window.location.hash.includes("type=recovery")) {
        setStage("request");
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setInfo("Havola emailingizga yuborildi. Pochtangizni tekshiring.");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      return setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
    }
    if (password !== confirm) {
      return setError("Parollar bir-biriga mos kelmadi.");
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    setStage("done");
    setTimeout(() => {
      router.push("/tree");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={760}
            height={709}
            priority
            className="mx-auto h-24 w-auto"
          />
          <p className="font-display text-2xl tracking-wide">
            <span className="text-brand">7</span>
            <span className="text-ink">avlod</span>
          </p>
          <OrnamentalDivider className="my-4" />
        </div>

        <div className="illuminated rounded-card border border-line-strong bg-surface p-5 sm:p-6">
          {stage === "loading" && (
            <p className="py-4 text-center text-sm text-ink-muted">Yuklanmoqda...</p>
          )}

          {stage === "request" && (
            <form onSubmit={handleRequest} className="flex flex-col gap-4">
              <div className="text-center">
                <h1 className="font-display text-xl text-ink">Parolni tiklash</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Emailingizni kiriting — tiklash havolasini yuboramiz.
                </p>
              </div>
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
              {error && <p className="text-sm text-danger">{error}</p>}
              {info && <p className="text-sm text-brand">{info}</p>}
              <button type="submit" disabled={loading} className={`${buttonPrimary} w-full`}>
                {loading ? "Yuborilmoqda..." : "Havola yuborish"}
              </button>
              <Link
                href="/login"
                className="text-center text-sm text-ink-muted hover:text-brand hover:underline"
              >
                ← Kirishga qaytish
              </Link>
            </form>
          )}

          {stage === "update" && (
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div className="text-center">
                <h1 className="font-display text-xl text-ink">Yangi parol</h1>
                <p className="mt-1 text-sm text-ink-muted">Yangi parolingizni kiriting.</p>
              </div>
              <Field label="Yangi parol" htmlFor="password" hint="Kamida 6 ta belgi">
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Parolni tasdiqlang" htmlFor="confirm">
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                />
              </Field>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" disabled={loading} className={`${buttonPrimary} w-full`}>
                {loading ? "Saqlanmoqda..." : "Parolni saqlash"}
              </button>
            </form>
          )}

          {stage === "done" && (
            <p className="py-4 text-center text-sm text-brand">
              Parol yangilandi. Yo&apos;naltirilmoqda...
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
