"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { canEditRole, isAdminRole } from "@/lib/roles";
import type { TreeRole } from "@/lib/types";

export function AppHeader({
  userEmail,
  role,
}: {
  userEmail: string | null;
  role: TreeRole | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!userEmail || pathname.startsWith("/login")) return null;

  const links = [
    { href: "/tree", label: "Shajara" },
    ...(canEditRole(role) ? [{ href: "/person/new", label: "Odam qoʻshish" }] : []),
    ...(isAdminRole(role) ? [{ href: "/duplicates", label: "Takrorlar" }] : []),
    { href: "/settings", label: "Sozlamalar" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/tree" className="flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold tracking-tight text-brand">
            Nasabnoma
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
            {userEmail}
          </span>
          <SignOutButton />
        </nav>

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
            <span className="truncate text-sm text-ink-faint">{userEmail}</span>
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
