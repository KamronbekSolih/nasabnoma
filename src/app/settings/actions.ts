"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree, isAdminRole } from "@/lib/tree/current";
import type { TreeRole } from "@/lib/types";

// Same reasoning as person/actions.ts's ActionError: a thrown Error's message
// gets redacted crossing the Server Function boundary in production, so
// expected/user-facing failures are returned as values instead.
export type ActionError = { error: string };

async function requireAdminTreeId(): Promise<string | ActionError> {
  const tree = await getCurrentTree();
  if (!tree) return { error: "Avval shajara tanlang yoki yarating." };
  if (!isAdminRole(tree.role)) {
    return { error: "Bu amal faqat administrator huquqi bilan mumkin." };
  }
  return tree.tree_id;
}

export async function setMemberRole(
  userId: string,
  role: TreeRole,
): Promise<{ ok: true } | ActionError> {
  if (role === "owner") return { error: "Egalik huquqini bu yerdan berib boʻlmaydi." };
  const supabase = await createClient();
  const treeId = await requireAdminTreeId();
  if (typeof treeId !== "string") return treeId;

  const { error } = await supabase
    .from("tree_members")
    .update({ role })
    .eq("tree_id", treeId)
    .eq("user_id", userId)
    .neq("role", "owner");
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<{ ok: true } | ActionError> {
  const supabase = await createClient();
  const treeId = await requireAdminTreeId();
  if (typeof treeId !== "string") return treeId;

  const { error } = await supabase
    .from("tree_members")
    .delete()
    .eq("tree_id", treeId)
    .eq("user_id", userId)
    .neq("role", "owner");
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

/** Rotates the invite code, so a link already shared stops working. */
export async function regenerateInviteCode(): Promise<{ ok: true } | ActionError> {
  const supabase = await createClient();
  const treeId = await requireAdminTreeId();
  if (typeof treeId !== "string") return treeId;

  const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { error } = await supabase
    .from("trees")
    .update({ invite_code: newCode })
    .eq("id", treeId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}
