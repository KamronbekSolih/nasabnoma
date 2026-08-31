"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Provider } from "@supabase/supabase-js";
import { buttonSecondary } from "@/components/ui/primitives";

const TELEGRAM_PROVIDER = process.env.NEXT_PUBLIC_TELEGRAM_PROVIDER;

/**
 * Attaches a Telegram identity to the account you are already signed in as.
 *
 * This is the *only* way one person ends up with one account and two ways in.
 * Supabase auto-links identities by matching email address, and Telegram never
 * returns an email — so signing in with Telegram while signed out always
 * creates a second, separate account instead. Linking has to be done from
 * inside an existing session, which is why the button lives here and not on
 * the login page.
 *
 * It is also one-way in time: once a Telegram identity belongs to its own
 * account, it cannot be linked to a different one until that account is gone.
 */
export function LinkedAccounts({ providers }: { providers: string[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasTelegram = !!TELEGRAM_PROVIDER && providers.includes(TELEGRAM_PROVIDER);
  const hasEmail = providers.includes("email");

  async function linkTelegram() {
    if (!TELEGRAM_PROVIDER) return;
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.linkIdentity({
      // Custom providers are addressed as `custom:<slug>`, which the Provider
      // union admits via its template-literal member.
      provider: TELEGRAM_PROVIDER as Provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/profile")}`,
      },
    });
    // On success the browser navigates to Telegram, so this only runs on failure.
    if (error) {
      setPending(false);
      setError(error.message);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        <li className="flex items-center gap-2 text-sm text-ink">
          <Tick on={hasEmail} />
          Email va parol
        </li>
        <li className="flex items-center gap-2 text-sm text-ink">
          <Tick on={hasTelegram} />
          Telegram
        </li>
      </ul>

      {TELEGRAM_PROVIDER && !hasTelegram && (
        <button
          type="button"
          onClick={linkTelegram}
          disabled={pending}
          className={`${buttonSecondary} self-start`}
        >
          {pending ? "Yuklanmoqda..." : "Telegramni bogʻlash"}
        </button>
      )}

      {hasTelegram && hasEmail && (
        <p className="text-sm text-ink-muted">
          Ikkala usul ham shu hisobga bogʻlangan — istagan biri bilan kira olasiz.
        </p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function Tick({ on }: { on: boolean }) {
  return on ? (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-brand">
      <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-ink-faint">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
