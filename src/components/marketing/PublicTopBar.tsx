import Image from "next/image";
import Link from "next/link";
import { buttonSecondary } from "@/components/ui/primitives";

/**
 * Shared top bar for every public (signed-out) page — the landing page and
 * the two demo shajara trees. AppHeader renders nothing for a signed-out
 * visitor (see AppHeader.tsx), so these pages carry their own minimal chrome
 * instead, consistently, rather than each improvising one.
 */
export function PublicTopBar() {
  return (
    <header className="border-b border-line">
      {/* Two rows always, not just a wrap-when-narrow: identity + the one action
          that matters (Kirish) belong together on row one; the demo links are
          secondary and get their own row so they never crowd the logo on a
          narrow screen (that crowding was the original bug report). */}
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/icon.png"
              alt=""
              width={40}
              height={40}
              className="h-9 w-9 rounded-full sm:h-7 sm:w-7"
            />
            <span className="font-display text-lg font-semibold tracking-tight">
              <span className="text-brand">7</span>
              <span className="text-ink">avlod</span>
            </span>
          </Link>
          <Link href="/login" className={buttonSecondary}>
            Kirish
          </Link>
        </div>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link
            href="/shajara/temuriylar"
            className="text-sm whitespace-nowrap text-ink-muted hover:text-brand hover:underline"
          >
            Temuriylar shajarasi
          </Link>
          <Link
            href="/shajara/muhammad-sav"
            className="text-sm whitespace-nowrap text-ink-muted hover:text-brand hover:underline"
          >
            Muhammad (sav) shajarasi
          </Link>
        </nav>
      </div>
    </header>
  );
}
