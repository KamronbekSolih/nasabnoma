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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/brand/icon.png" alt="" width={28} height={28} className="rounded-full" />
          <span className="font-display text-lg font-semibold tracking-tight">
            <span className="text-brand">7</span>
            <span className="text-ink">avlod</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
          <Link href="/login" className={buttonSecondary}>
            Kirish
          </Link>
        </nav>
      </div>
    </header>
  );
}
