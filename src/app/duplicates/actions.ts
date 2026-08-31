"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree, isAdminRole } from "@/lib/tree/current";
import { canonicalPair } from "@/lib/duplicates";

export type DismissResult = { ok: true } | { error: string };

/**
 * Records "these are two different people" so the pair stops resurfacing.
 *
 * Stored with the two ids in canonical order — see canonicalPair() for why the
 * raw a/b order from the detector cannot be trusted as a key.
 */
export async function dismissDuplicatePair(
  personAId: string,
  personBId: string,
): Promise<DismissResult> {
  const tree = await getCurrentTree();
  if (!tree) return { error: "Avval shajara tanlang yoki yarating." };
  if (!isAdminRole(tree.role)) {
    return { error: "Bu amal faqat administrator huquqi bilan mumkin." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { lo, hi } = canonicalPair(personAId, personBId);

  const { error } = await supabase.from("duplicate_dismissals").insert({
    tree_id: tree.tree_id,
    person_a_id: lo,
    person_b_id: hi,
    dismissed_by: user?.id ?? null,
  });

  // 23505 = unique violation: the pair was already dismissed, which is the
  // desired end state, not a failure worth showing anyone.
  if (error && error.code !== "23505") return { error: error.message };

  revalidatePath("/duplicates");
  return { ok: true };
}

/** Undo — brings a dismissed pair back into the review list. */
export async function restoreDuplicatePair(
  personAId: string,
  personBId: string,
): Promise<DismissResult> {
  const tree = await getCurrentTree();
  if (!tree) return { error: "Avval shajara tanlang yoki yarating." };
  if (!isAdminRole(tree.role)) {
    return { error: "Bu amal faqat administrator huquqi bilan mumkin." };
  }

  const supabase = await createClient();
  const { lo, hi } = canonicalPair(personAId, personBId);

  const { error } = await supabase
    .from("duplicate_dismissals")
    .delete()
    .eq("tree_id", tree.tree_id)
    .eq("person_a_id", lo)
    .eq("person_b_id", hi);
  if (error) return { error: error.message };

  revalidatePath("/duplicates");
  return { ok: true };
}
