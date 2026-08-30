import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  // Public regardless of auth state, in both directions: an unauthenticated
  // visitor needs to reach it to request a reset, and a signed-in one needs to
  // reach it too — a recovery link's #access_token is consumed into a real
  // session client-side (never visible to this server-side check at all, since
  // URL fragments are never sent in the request), so by the time the "set a new
  // password" form is showing, this middleware already sees them as logged in.
  // Treating this route like /login would bounce them to /tree mid-flow.
  const isResetRoute = request.nextUrl.pathname.startsWith("/reset-password");
  // Exact match only — this is the public marketing page, not a prefix that
  // would otherwise swallow every real route in the app.
  const isLandingRoute = request.nextUrl.pathname === "/";
  // The two demo shajaras (Temuriylar, Muhammad sav) — static, read-only,
  // built from local data rather than a real tree_id, so there's nothing
  // here for a signed-out visitor to be gated away from.
  const isDemoRoute = request.nextUrl.pathname.startsWith("/shajara");

  if (!user && !isAuthRoute && !isResetRoute && !isLandingRoute && !isDemoRoute) {
    const url = request.nextUrl.clone();
    const redirectTarget = url.pathname + url.search;
    url.pathname = "/login";
    url.search = "";
    if (redirectTarget !== "/") url.searchParams.set("redirect", redirectTarget);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/tree";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
