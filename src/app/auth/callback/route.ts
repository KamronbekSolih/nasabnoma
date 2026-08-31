import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Completes an OAuth sign-in by turning the returned code into a cookie session.
 *
 * There are two different callback URLs in this flow and mixing them up is the
 * classic silent failure: the URL registered in BotFather is Supabase's own
 * (https://<ref>.supabase.co/auth/v1/callback) — Telegram redirects there.
 * Supabase then redirects to *this* route, which is what actually establishes
 * the session for @supabase/ssr's cookie-based auth. BotFather never sees this
 * path.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  // Behind Vercel's proxy the request URL's host is internal; the forwarded
  // host is the one the user is actually on.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = forwardedHost ? `https://${forwardedHost}` : url.origin;

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/tree";

  const fail = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  // The provider can redirect here with an error instead of a code — e.g. if
  // the Supabase provider is configured to require an email and Telegram, which
  // never returns one, did not supply it. Without this branch the user would
  // land on a blank route-handler response with no explanation.
  const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (providerError) return fail(providerError);
  if (!code) return fail("Kirishni yakunlab boʻlmadi. Qaytadan urinib koʻring.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);

  // Belt and braces for the profile row. The handle_new_user trigger fires on
  // the auth.users INSERT, but for OAuth the provider's claims can land in a
  // subsequent UPDATE, and the trigger's `on conflict do nothing` will not go
  // back and fill them in. This runs after the identity is fully populated, so
  // it is the reliable path for a Telegram user's name and avatar.
  const user = data.user;
  if (user) {
    const meta = user.user_metadata ?? {};
    const derivedName =
      (meta.full_name as string) ||
      (meta.name as string) ||
      [meta.given_name, meta.family_name].filter(Boolean).join(" ") ||
      null;

    const { data: existing } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, telegram_username")
      .eq("id", user.id)
      .maybeSingle();

    // Never overwrite a name the person chose for themselves.
    const patch: Record<string, unknown> = { id: user.id };
    if (!existing?.full_name && derivedName) patch.full_name = derivedName.trim();
    if (!existing?.avatar_url && meta.picture) patch.avatar_url = meta.picture;
    if (!existing?.telegram_username && meta.preferred_username) {
      patch.telegram_username = meta.preferred_username;
    }
    if (Object.keys(patch).length > 1) {
      await supabase.from("profiles").upsert(patch, { onConflict: "id" });
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
