"use client";

import { useCallback } from "react";
import { FamilyTreeView } from "./FamilyTreeView";
import type { Family, FamilyChild, Person } from "@/lib/types";

/**
 * Thin client wrapper around FamilyTreeView for the demo shajaras. The page
 * itself is a server component (so the two large static datasets never touch
 * client JS beyond what's rendered) — but a function prop like `personHref`
 * can't cross that server→client boundary directly ("Functions cannot be
 * passed directly to Client Components"), so this wrapper takes the plain,
 * serializable `slug` string instead and builds the function on the client
 * side where it's actually consumed.
 */
export function DemoTreeView({
  slug,
  people,
  families,
  familyChildren,
}: {
  slug: string;
  people: Person[];
  families: Family[];
  familyChildren: FamilyChild[];
}) {
  const personHref = useCallback((id: string) => `/shajara/${slug}/${id}`, [slug]);

  return (
    <FamilyTreeView
      people={people}
      families={families}
      familyChildren={familyChildren}
      role="viewer"
      personHref={personHref}
    />
  );
}
