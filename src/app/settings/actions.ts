"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree, isAdminRole } from "@/lib/tree/current";
import type { TreeRole } from "@/lib/types";

async function requireAdminTreeId(): Promise<string> {
  const tree = await getCurrentTree();
  if (!tree) throw new Error("Avval shajara tanlang yoki yarating.");
  if (!isAdminRole(tree.role)) {
    throw new Error("Bu amal faqat administrator huquqi bilan mumkin.");
  }
  return tree.tree_id;
}

export async function setMemberRole(userId: string, role: TreeRole) {
  if (role === "owner") throw new Error("Egalik huquqini bu yerdan berib boʻlmaydi.");
  const supabase = await createClient();
  const treeId = await requireAdminTreeId();

  const { error } = await supabase
    .from("tree_members")
    .update({ role })
    .eq("tree_id", treeId)
    .eq("user_id", userId)
    .neq("role", "owner");
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

export async function removeMember(userId: string) {
  const supabase = await createClient();
  const treeId = await requireAdminTreeId();

  const { error } = await supabase
    .from("tree_members")
    .delete()
    .eq("tree_id", treeId)
    .eq("user_id", userId)
    .neq("role", "owner");
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

/** Rotates the invite code, so a link already shared stops working. */
export async function regenerateInviteCode() {
  const supabase = await createClient();
  const treeId = await requireAdminTreeId();

  const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { error } = await supabase
    .from("trees")
    .update({ invite_code: newCode })
    .eq("id", treeId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
