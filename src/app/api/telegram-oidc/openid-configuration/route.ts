import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TELEGRAM_DISCOVERY = "https://oauth.telegram.org/.well-known/openid-configuration";

/**
 * Telegram's OIDC discovery document with `jwks_uri` repointed at our filtered
 * key set (see ../jwks/route.ts for why that filtering is necessary).
 *
 * Everything else is passed through verbatim — crucially `issuer`, which stays
 * `https://oauth.telegram.org` so the `iss` claim on the ID token still
 * validates against the real provider. This document is what Supabase's
 * "Discovery URL" field should point at.
 */
export async function GET(request: Request) {
  const res = await fetch(TELEGRAM_DISCOVERY, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Telegram konfiguratsiyasini olib boʻlmadi." },
      { status: 502 },
    );
  }

  const doc = (await res.json()) as Record<string, unknown>;

  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = forwardedHost ? `https://${forwardedHost}` : url.origin;

  return NextResponse.json(
    { ...doc, jwks_uri: `${origin}/api/telegram-oidc/jwks` },
    {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    },
  );
}
