import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { TreeMember, TreeRole } from "@/lib/types";

const COOKIE_NAME = "tree_id";

interface TreeMembershipRow {
  tree_id: string;
  role: TreeRole;
  trees: { name: string } | { name: string }[] | null;
}

/** All trees the current user belongs to, oldest membership first.
 * Wrapped in React's `cache` so the several call sites in one render — layout,
 * page, and each server action — share a single query instead of repeating it. */
export const getUserTrees = cache(async (): Promise<TreeMember[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tree_members")
    .select("tree_id, role, trees(name)")
    .order("joined_at");

  return ((data as TreeMembershipRow[] | null) ?? []).map((row) => {
    const tree = Array.isArray(row.trees) ? row.trees[0] : row.trees;
    return {
      tree_id: row.tree_id,
      role: row.role,
      tree_name: tree?.name ?? "Oilaviy shajara",
    };
  });
});

/** The tree the current request should operate on: whichever the "tree_id" cookie
 * names, if the user is still a member of it — otherwise their first membership.
 * Returns null if the user belongs to no tree yet (send them to /onboarding). */
export async function getCurrentTree(): Promise<TreeMember | null> {
  const memberships = await getUserTrees();
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const cookieTreeId = cookieStore.get(COOKIE_NAME)?.value;
  const fromCookie = cookieTreeId
    ? memberships.find((m) => m.tree_id === cookieTreeId)
    : undefined;
  return fromCookie ?? memberships[0];
}

export async function getCurrentTreeId(): Promise<string | null> {
  return (await getCurrentTree())?.tree_id ?? null;
}

export { isAdminRole, canEditRole } from "@/lib/roles";
export { COOKIE_NAME as TREE_COOKIE_NAME };
