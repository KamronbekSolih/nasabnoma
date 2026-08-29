import type { TreeRole } from "@/lib/types";

/** Pure role predicates, kept out of lib/tree/current.ts so client components can
 * use them without pulling in `next/headers` (server-only). */
export function isAdminRole(role: TreeRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canEditRole(role: TreeRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "member";
}
