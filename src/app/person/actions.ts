"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canEditRole, getCurrentTree, isAdminRole } from "@/lib/tree/current";
import { dmyToISO } from "@/lib/dates";
import type { ChildRelation, RelationKind, TreeMember } from "@/lib/types";

interface SpouseInput {
  id: string;
  status: string;
}

interface ChildInput {
  id: string;
  family_id?: string | null;
  father_relation?: ChildRelation;
  mother_relation?: ChildRelation;
}

function parseJsonField<T>(raw: FormDataEntryValue | null): T[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function requireEditableTree(): Promise<TreeMember> {
  const tree = await getCurrentTree();
  if (!tree) throw new Error("Avval shajara tanlang yoki yarating.");
  if (!canEditRole(tree.role)) {
    throw new Error("Sizda tahrirlash huquqi yoʻq — faqat koʻrish mumkin.");
  }
  return tree;
}

async function requireAdminTree(): Promise<TreeMember> {
  const tree = await getCurrentTree();
  if (!tree) throw new Error("Avval shajara tanlang yoki yarating.");
  if (!isAdminRole(tree.role)) {
    throw new Error("Bu amal faqat administrator huquqi bilan mumkin.");
  }
  return tree;
}

export async function savePerson(formData: FormData): Promise<{ id: string }> {
  const supabase = await createClient();
  const tree = await requireEditableTree();
  const treeId = tree.tree_id;

  const id = (formData.get("id") as string) || null;
  const first_name = (formData.get("first_name") as string)?.trim();
  const gender = formData.get("gender") as string;
  if (!first_name || !gender) {
    throw new Error("Ism va jinsi majburiy.");
  }

  const record = {
    tree_id: treeId,
    first_name,
    last_name: (formData.get("last_name") as string)?.trim() || null,
    patronymic: (formData.get("patronymic") as string)?.trim() || null,
    gender,
    birth_date: dmyToISO(formData.get("birth_date") as string),
    birth_date_approx: (formData.get("birth_date_approx") as string)?.trim() || null,
    death_date: dmyToISO(formData.get("death_date") as string),
    is_deceased: formData.get("is_deceased") === "on",
    visibility: formData.get("visibility") === "public" ? "public" : "family",
    birth_country: (formData.get("birth_country") as string)?.trim() || null,
    birth_region: (formData.get("birth_region") as string)?.trim() || null,
    birth_district: (formData.get("birth_district") as string)?.trim() || null,
    birth_mahalla: (formData.get("birth_mahalla") as string)?.trim() || null,
    current_country: (formData.get("current_country") as string)?.trim() || null,
    current_region: (formData.get("current_region") as string)?.trim() || null,
    current_district: (formData.get("current_district") as string)?.trim() || null,
    current_address: (formData.get("current_address") as string)?.trim() || null,
    millat: (formData.get("millat") as string)?.trim() || null,
    urug: (formData.get("urug") as string)?.trim() || null,
    aymoq: (formData.get("aymoq") as string)?.trim() || null,
    tarmoq: (formData.get("tarmoq") as string)?.trim() || null,
    telegram: (formData.get("telegram") as string)?.trim() || null,
    instagram: (formData.get("instagram") as string)?.trim() || null,
    photo_url: (formData.get("photo_url") as string)?.trim() || null,
    bio: (formData.get("bio") as string)?.trim() || null,
  };

  let personId = id;

  if (id) {
    // Scoped to the active tree as well as the id: without it, editing a person
    // while the tree cookie pointed elsewhere would rewrite their tree_id and tear
    // them out of the tree holding all their relations.
    const { error } = await supabase
      .from("people")
      .update(record)
      .eq("id", id)
      .eq("tree_id", treeId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("people").insert(record).select("id").single();
    if (error) throw new Error(error.message);
    personId = data.id;
  }

  // One transaction on the database side: parents, spouses and children either all
  // apply or none do. Previously these were separate delete-then-insert round trips,
  // so a failure part-way through destroyed relations it never restored.
  const { error: relError } = await supabase.rpc("save_person_relations", {
    p_person_id: personId,
    p_father_id: (formData.get("father_id") as string) || null,
    p_mother_id: (formData.get("mother_id") as string) || null,
    p_spouses: parseJsonField<SpouseInput>(formData.get("spouses_json")).filter((s) => s.id),
    p_children: parseJsonField<ChildInput>(formData.get("children_json")).filter((c) => c.id),
  });
  if (relError) throw new Error(relError.message);

  revalidatePath("/tree");
  revalidatePath(`/person/${personId}`);
  return { id: personId! };
}

export async function deletePerson(id: string) {
  const supabase = await createClient();
  const tree = await requireAdminTree();

  const { error } = await supabase
    .from("people")
    .delete()
    .eq("id", id)
    .eq("tree_id", tree.tree_id);
  if (error) throw new Error(error.message);

  revalidatePath("/tree");
}

/**
 * Links a person to an existing relative from the tree panel. Everything routes
 * through save_person_relations so the family model stays the single source of
 * truth — there is no second code path that writes relationships.
 */
export async function attachRelative(
  anchorId: string,
  relation: RelationKind,
  otherPersonId: string,
) {
  const supabase = await createClient();
  const tree = await requireEditableTree();
  const treeId = tree.tree_id;

  const { data: anchor } = await supabase
    .from("people")
    .select("id, gender")
    .eq("id", anchorId)
    .eq("tree_id", treeId)
    .single();
  if (!anchor) throw new Error("Odam topilmadi.");

  if (relation === "father" || relation === "mother") {
    const { data: existing } = await supabase
      .from("family_children")
      .select("family_id")
      .eq("child_id", anchorId)
      .maybeSingle();

    let husbandId: string | null = relation === "father" ? otherPersonId : null;
    let wifeId: string | null = relation === "mother" ? otherPersonId : null;

    // Keep the parent already on record: adding a mother must not drop the father.
    if (existing) {
      const { data: family } = await supabase
        .from("families")
        .select("husband_id, wife_id")
        .eq("id", existing.family_id)
        .single();
      if (family) {
        husbandId = relation === "father" ? otherPersonId : family.husband_id;
        wifeId = relation === "mother" ? otherPersonId : family.wife_id;
      }
    }

    const { data: familyId, error } = await supabase.rpc("find_or_create_family", {
      p_tree_id: treeId,
      p_husband_id: husbandId,
      p_wife_id: wifeId,
      p_relation_type: "unknown",
    });
    if (error) throw new Error(error.message);

    await supabase.from("family_children").delete().eq("child_id", anchorId);
    const { error: linkError } = await supabase
      .from("family_children")
      .insert({ tree_id: treeId, family_id: familyId, child_id: anchorId });
    if (linkError) throw new Error(linkError.message);
  } else if (relation === "spouse") {
    const { data: other } = await supabase
      .from("people")
      .select("gender")
      .eq("id", otherPersonId)
      .eq("tree_id", treeId)
      .single();
    const anchorIsHusband = anchor.gender === "male" || other?.gender === "female";
    const { error } = await supabase.rpc("find_or_create_family", {
      p_tree_id: treeId,
      p_husband_id: anchorIsHusband ? anchorId : otherPersonId,
      p_wife_id: anchorIsHusband ? otherPersonId : anchorId,
      p_relation_type: "married",
    });
    if (error) throw new Error(error.message);
  } else if (relation === "child") {
    // Prefer the anchor's earliest family so the child lands with both parents;
    // fall back to a single-parent family when no marriage is recorded.
    const { data: families } = await supabase
      .from("families")
      .select("id")
      .eq("tree_id", treeId)
      .or(`husband_id.eq.${anchorId},wife_id.eq.${anchorId}`)
      .order("marriage_order")
      .limit(1);

    let familyId = families?.[0]?.id;
    if (!familyId) {
      const { data: created, error } = await supabase.rpc("find_or_create_family", {
        p_tree_id: treeId,
        p_husband_id: anchor.gender === "male" ? anchorId : null,
        p_wife_id: anchor.gender === "female" ? anchorId : null,
        p_relation_type: "unknown",
      });
      if (error) throw new Error(error.message);
      familyId = created;
    }

    // A child belongs to exactly one family, so moving them clears the old link.
    await supabase.from("family_children").delete().eq("child_id", otherPersonId);
    const { error: linkError } = await supabase
      .from("family_children")
      .insert({ tree_id: treeId, family_id: familyId, child_id: otherPersonId });
    if (linkError) throw new Error(linkError.message);
  }

  revalidatePath("/tree");
}

/** Undoes an attachRelative link — for correcting a wrong pick. */
export async function detachRelative(
  anchorId: string,
  relation: RelationKind,
  otherPersonId: string,
) {
  const supabase = await createClient();
  const tree = await requireEditableTree();
  const treeId = tree.tree_id;

  if (relation === "father" || relation === "mother") {
    const { data: link } = await supabase
      .from("family_children")
      .select("family_id")
      .eq("child_id", anchorId)
      .maybeSingle();
    if (!link) return;

    const { data: family } = await supabase
      .from("families")
      .select("husband_id, wife_id")
      .eq("id", link.family_id)
      .single();
    if (!family) return;

    const remainingHusband = relation === "father" ? null : family.husband_id;
    const remainingWife = relation === "mother" ? null : family.wife_id;

    await supabase.from("family_children").delete().eq("child_id", anchorId);

    // Re-home the child under whichever parent is left, rather than orphaning them.
    if (remainingHusband || remainingWife) {
      const { data: familyId, error } = await supabase.rpc("find_or_create_family", {
        p_tree_id: treeId,
        p_husband_id: remainingHusband,
        p_wife_id: remainingWife,
        p_relation_type: "unknown",
      });
      if (error) throw new Error(error.message);
      await supabase
        .from("family_children")
        .insert({ tree_id: treeId, family_id: familyId, child_id: anchorId });
    }
  } else if (relation === "child") {
    const { error } = await supabase
      .from("family_children")
      .delete()
      .eq("tree_id", treeId)
      .eq("child_id", otherPersonId);
    if (error) throw new Error(error.message);
  } else if (relation === "spouse") {
    const { data: family } = await supabase
      .from("families")
      .select("id")
      .eq("tree_id", treeId)
      .or(
        `and(husband_id.eq.${anchorId},wife_id.eq.${otherPersonId}),and(husband_id.eq.${otherPersonId},wife_id.eq.${anchorId})`,
      )
      .maybeSingle();
    if (!family) return;

    const { count } = await supabase
      .from("family_children")
      .select("*", { count: "exact", head: true })
      .eq("family_id", family.id);

    if (count && count > 0) {
      // The couple still share children, so they stay recorded as those children's
      // parents — only the marriage claim is dropped.
      await supabase.from("families").update({ relation_type: "unknown" }).eq("id", family.id);
    } else {
      await supabase.from("families").delete().eq("id", family.id);
    }
  }

  revalidatePath("/tree");
}

/** Folds a duplicate person into the one being kept. Admin-only. */
export async function mergePeople(keepId: string, mergeId: string) {
  const supabase = await createClient();
  await requireAdminTree();

  const { error } = await supabase.rpc("merge_people", {
    p_keep_id: keepId,
    p_merge_id: mergeId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/tree");
}

/** Marks a person record as being the signed-in user's own. */
export async function claimPerson(personId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_person", { p_person_id: personId });
  if (error) throw new Error(error.message);

  revalidatePath("/tree");
  revalidatePath(`/person/${personId}`);
}
