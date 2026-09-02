"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { canEditRole, isAdminRole } from "@/lib/roles";
import type { TreeRole } from "@/lib/types";

export function AppHeader({
  signedIn,
  displayName,
  role,
}: {
  /** The sentinel is the session itself, never the email. Telegram sign-in
   * returns no email at all, and keying visibility off `userEmail` used to hide
   * the entire header — nav and sign-out included — from anyone without one. */
  signedIn: boolean;
  displayName: string | null;
  role: TreeRole | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!signedIn || pathname.startsWith("/login") || pathname.startsWith("/reset-password")) {
    return null;
  }

  const links = [
    { href: "/tree", label: "Shajara" },
    { href: "/world", label: "Dunyo boʻylab" },
    ...(canEditRole(role) ? [{ href: "/person/new", label: "Odam qoʻshish" }] : []),
    ...(isAdminRole(role) ? [{ href: "/duplicates", label: "Takrorlar" }] : []),
    { href: "/profile", label: "Profilim" },
    { href: "/settings", label: "Sozlamalar" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/tree" className="flex items-center gap-2">
          <Image
            src="/brand/icon.png"
            alt=""
            width={40}
            height={40}
            className="h-9 w-9 rounded-full md:h-7 md:w-7"
          />
          {/* Two-toned to match the mark itself: gold numeral, navy word. */}
          <span className="font-display text-lg font-semibold tracking-tight">
            <span className="text-brand">7</span>
            <span className="text-ink">avlod</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href} active={pathname === link.href}>
              {link.label}
            </NavLink>
          ))}
          <span className="ml-2 max-w-[14rem] truncate text-sm text-ink-faint">
            {displayName}
          </span>
          <SignOutButton />
        </nav>

        {/* Mobile-only quick link to the world map, sitting between the logo
            and the hamburger toggle — desktop already has it in the nav list
            above, so this doesn't duplicate there (md:hidden). */}
        <Link
          href="/world"
          aria-label="Dunyo boʻylab"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-paper-sunken md:hidden"
        >
          {/* A sphere with landmasses reads as "world" at a glance, unlike the
              latitude/longitude wireframe this replaced — that one, alone and
              unlabeled next to the menu button, was easy to mistake for a
              settings gear or a target. */}
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3" />
            <g fill="currentColor">
              <ellipse cx="8.1" cy="7.7" rx="3.2" ry="2.2" transform="rotate(-20 8.1 7.7)" />
              <ellipse cx="13" cy="12.4" rx="2.2" ry="1.6" transform="rotate(20 13 12.4)" />
              <ellipse cx="6.8" cy="13.6" rx="1.3" ry="0.9" transform="rotate(8 6.8 13.6)" />
            </g>
          </svg>
        </Link>

        {/* Mobile toggle — 44px target, the minimum comfortable tap size */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Menyu"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-paper-sunken md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            {menuOpen ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-line bg-surface px-4 py-2 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-lg px-3 py-3 text-base ${
                pathname === link.href
                  ? "bg-brand-soft font-medium text-brand"
                  : "text-ink-muted hover:bg-paper-sunken"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-line px-3 pt-3 pb-1">
            <span className="truncate text-base text-ink-faint">{displayName}</span>
            <SignOutButton />
          </div>
        </nav>
      )}
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-brand-soft font-medium text-brand" : "text-ink-muted hover:bg-paper-sunken"
      }`}
    >
      {children}
    </Link>
  );
}
