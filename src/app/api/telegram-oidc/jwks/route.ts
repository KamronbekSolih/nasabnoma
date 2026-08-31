import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TELEGRAM_JWKS = "https://oauth.telegram.org/.well-known/jwks.json";

/**
 * Telegram's signing keys, minus the ones Supabase's JWT library cannot parse.
 *
 * Telegram publishes four keys; one of them (kid `oidc-es256k-1`) uses the
 * secp256k1 curve, offered for Web3 clients. Supabase's Go library (go-jose)
 * does not support that curve AND fails the whole key set when it meets one —
 * it does not skip the key it cannot read. So every Telegram sign-in died with
 * "failed to decode keys: unsupported elliptic curve 'secp256k1'", surfacing in
 * the UI as "Error getting user profile from external provider", even though
 * the ID token itself is signed with plain RS256 that go-jose handles fine.
 *
 * This filters that single key out and passes everything else through
 * untouched. It is a transport shim, not a trust boundary: the keys are fetched
 * live from Telegram over HTTPS on every request and never cached to disk,
 * rewritten, or replaced with our own — remove a key, change nothing else. If
 * Telegram rotates its keys, this serves the new ones on the next request.
 */
export async function GET() {
  const res = await fetch(TELEGRAM_JWKS, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Telegram kalitlarini olib boʻlmadi." },
      { status: 502 },
    );
  }

  const jwks = (await res.json()) as { keys?: Record<string, unknown>[] };
  const keys = (jwks.keys ?? []).filter(
    (k) => k.crv !== "secp256k1" && k.alg !== "ES256K",
  );

  return NextResponse.json(
    { keys },
    {
      headers: {
        // Short cache: long enough to avoid hammering Telegram, short enough
        // that a key rotation propagates quickly.
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}
