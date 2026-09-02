"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canEditRole, getCurrentTree, isAdminRole } from "@/lib/tree/current";
import { dmyToISO } from "@/lib/dates";
import { geocodeCurrentLocation } from "@/lib/geocode";
import { uploadAvatarFromUrl } from "@/lib/supabase/storage";
import type { ChildRelation, RelationKind, TreeMember } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

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

// Next.js redacts a thrown Error's message once it crosses the Server
// Function boundary in production (confirmed live: a user saw a raw
// "Minified React error #441" digest instead of a real message from
// joinTreeByCode). Every action below returns its failure as a value
// instead of throwing, so the actual Uzbek message survives to the client.
export type ActionError = { error: string };

async function requireEditableTree(): Promise<TreeMember | ActionError> {
  const tree = await getCurrentTree();
  if (!tree) return { error: "Avval shajara tanlang yoki yarating." };
  if (!canEditRole(tree.role)) {
    return { error: "Sizda tahrirlash huquqi yoʻq — faqat koʻrish mumkin." };
  }
  return tree;
}

async function requireAdminTree(): Promise<TreeMember | ActionError> {
  const tree = await getCurrentTree();
  if (!tree) return { error: "Avval shajara tanlang yoki yarating." };
  if (!isAdminRole(tree.role)) {
    return { error: "Bu amal faqat administrator huquqi bilan mumkin." };
  }
  return tree;
}

export async function savePerson(formData: FormData): Promise<{ id: string } | ActionError> {
  const supabase = await createClient();
  const tree = await requireEditableTree();
  if ("error" in tree) return tree;
  const treeId = tree.tree_id;

  const id = (formData.get("id") as string) || null;
  const first_name = (formData.get("first_name") as string)?.trim();
  const gender = formData.get("gender") as string;
  if (!first_name || !gender) {
    return { error: "Ism va jinsi majburiy." };
  }

  const current_country = (formData.get("current_country") as string)?.trim() || null;
  const current_region = (formData.get("current_region") as string)?.trim() || null;
  const current_district = (formData.get("current_district") as string)?.trim() || null;

  // City-level, not street-level: geocoding the district/region/country gives
  // the World map an actual city to place a pin at (e.g. Rotterdam) instead of
  // always falling back to the country's capital (Amsterdam) — the only
  // precision available before this. Only worth the request when there's a
  // district to resolve; country-only already has the capital fallback, and a
  // failed/unresolvable lookup just leaves the point null, same as before.
  const currentPoint = await geocodeCurrentLocation({
    district: current_district,
    region: current_region,
    country: current_country,
  });

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
    // Open by default — an unselected/missing field (e.g. a future API caller
    // that doesn't set one) should read as "visible to the family", not the
    // more restrictive setting, matching the form's own default option.
    visibility: formData.get("visibility") === "family" ? "family" : "public",
    birth_country: (formData.get("birth_country") as string)?.trim() || null,
    birth_region: (formData.get("birth_region") as string)?.trim() || null,
    birth_district: (formData.get("birth_district") as string)?.trim() || null,
    birth_mahalla: (formData.get("birth_mahalla") as string)?.trim() || null,
    current_country,
    current_region,
    current_district,
    current_address: (formData.get("current_address") as string)?.trim() || null,
    current_lat: currentPoint?.lat ?? null,
    current_lng: currentPoint?.lng ?? null,
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
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from("people").insert(record).select("id").single();
    if (error) return { error: error.message };
    personId = data.id;
  }

  // One transaction on the database side: parents, spouses and children either all
  // apply or none do.
  const { error: relError } = await supabase.rpc("save_person_relations", {
    p_person_id: personId,
    p_father_id: (formData.get("father_id") as string) || null,
    p_mother_id: (formData.get("mother_id") as string) || null,
    p_spouses: parseJsonField<SpouseInput>(formData.get("spouses_json")).filter((s) => s.id),
    p_children: parseJsonField<ChildInput>(formData.get("children_json")).filter((c) => c.id),
  });
  if (relError) return { error: relError.message };

  revalidatePath("/tree");
  revalidatePath(`/person/${personId}`);
  return { id: personId! };
}

export async function deletePerson(id: string): Promise<{ ok: true } | ActionError> {
  const supabase = await createClient();
  const tree = await requireAdminTree();
  if ("error" in tree) return tree;

  const { error } = await supabase
    .from("people")
    .delete()
    .eq("id", id)
    .eq("tree_id", tree.tree_id);
  if (error) return { error: error.message };

  revalidatePath("/tree");
  return { ok: true };
}

interface RelationSnapshot {
  fatherId: string | null;
  motherId: string | null;
  spouses: SpouseInput[];
  children: ChildInput[];
}

/**
 * Reads a person's complete current relationship set. attachRelative/detachRelative
 * both need this: save_person_relations replaces a person's whole set atomically in
 * one transaction — it has no "add/remove just one" mode — so the only safe way to
 * change a single relation is to load everything, edit that one piece in memory, and
 * write the whole snapshot back.
 *
 * This is deliberately the *only* place that reads relations for a write. An earlier
 * version of attachRelative hand-rolled its own father/mother/spouse/child writes
 * directly against `families`/`family_children`, duplicating (and quietly diverging
 * from) the logic in save_person_relations — exactly the kind of two-code-paths-for-
 * one-write bug that caused the duplicate-record issues earlier in this project.
 */
async function loadRelationSnapshot(
  supabase: SupabaseClient,
  treeId: string,
  personId: string,
): Promise<RelationSnapshot> {
  const [{ data: childLink }, { data: partnerFamilies }] = await Promise.all([
    supabase
      .from("family_children")
      .select("family_id")
      .eq("tree_id", treeId)
      .eq("child_id", personId)
      .maybeSingle(),
    supabase
      .from("families")
      .select("id, husband_id, wife_id, relation_type")
      .eq("tree_id", treeId)
      .or(`husband_id.eq.${personId},wife_id.eq.${personId}`)
      .order("marriage_order"),
  ]);

  let fatherId: string | null = null;
  let motherId: string | null = null;
  if (childLink) {
    const { data: parentFamily } = await supabase
      .from("families")
      .select("husband_id, wife_id")
      .eq("id", childLink.family_id)
      .single();
    fatherId = parentFamily?.husband_id ?? null;
    motherId = parentFamily?.wife_id ?? null;
  }

  const families = partnerFamilies ?? [];
  const spouses: SpouseInput[] = families
    .map((f) => ({
      id: f.husband_id === personId ? f.wife_id : f.husband_id,
      status: f.relation_type as string,
    }))
    .filter((s): s is SpouseInput => !!s.id);

  let children: ChildInput[] = [];
  if (families.length > 0) {
    const { data: childrenLinks } = await supabase
      .from("family_children")
      .select("family_id, child_id, father_relation, mother_relation")
      .in(
        "family_id",
        families.map((f) => f.id),
      );
    children = (childrenLinks ?? []).map((c) => ({
      id: c.child_id,
      family_id: c.family_id,
      father_relation: c.father_relation,
      mother_relation: c.mother_relation,
    }));
  }

  return { fatherId, motherId, spouses, children };
}

async function writeRelationSnapshot(
  supabase: SupabaseClient,
  personId: string,
  snapshot: RelationSnapshot,
): Promise<{ ok: true } | ActionError> {
  const { error } = await supabase.rpc("save_person_relations", {
    p_person_id: personId,
    p_father_id: snapshot.fatherId,
    p_mother_id: snapshot.motherId,
    p_spouses: snapshot.spouses,
    p_children: snapshot.children,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/** Links a person to an existing relative from the tree panel — loads the anchor's
 * current relations, adds the one requested, and writes the whole set back through
 * the same atomic path the main form uses. */
export async function attachRelative(
  anchorId: string,
  relation: RelationKind,
  otherPersonId: string,
): Promise<{ ok: true } | ActionError> {
  const supabase = await createClient();
  const tree = await requireEditableTree();
  if ("error" in tree) return tree;
  const treeId = tree.tree_id;

  const { data: anchor } = await supabase
    .from("people")
    .select("id")
    .eq("id", anchorId)
    .eq("tree_id", treeId)
    .single();
  if (!anchor) return { error: "Odam topilmadi." };

  const snapshot = await loadRelationSnapshot(supabase, treeId, anchorId);

  if (relation === "father") {
    if (snapshot.fatherId) return { error: "Ota allaqachon qoʻshilgan." };
    snapshot.fatherId = otherPersonId;
  } else if (relation === "mother") {
    if (snapshot.motherId) return { error: "Ona allaqachon qoʻshilgan." };
    snapshot.motherId = otherPersonId;
  } else if (relation === "spouse") {
    if (!snapshot.spouses.some((s) => s.id === otherPersonId)) {
      snapshot.spouses.push({ id: otherPersonId, status: "married" });
    }
  } else if (relation === "child") {
    if (!snapshot.children.some((c) => c.id === otherPersonId)) {
      snapshot.children.push({
        id: otherPersonId,
        family_id: null,
        father_relation: "birth",
        mother_relation: "birth",
      });
    }
  }

  const result = await writeRelationSnapshot(supabase, anchorId, snapshot);
  if ("error" in result) return result;

  revalidatePath("/tree");
  revalidatePath(`/person/${anchorId}`);
  revalidatePath(`/person/${otherPersonId}`);
  return { ok: true };
}

/** Undoes an attachRelative link — for correcting a wrong pick. Same snapshot
 * load-edit-write pattern, just removing instead of adding. */
export async function detachRelative(
  anchorId: string,
  relation: RelationKind,
  otherPersonId: string,
): Promise<{ ok: true } | ActionError> {
  const supabase = await createClient();
  const tree = await requireEditableTree();
  if ("error" in tree) return tree;
  const treeId = tree.tree_id;

  const { data: anchor } = await supabase
    .from("people")
    .select("id")
    .eq("id", anchorId)
    .eq("tree_id", treeId)
    .single();
  if (!anchor) return { error: "Odam topilmadi." };

  const snapshot = await loadRelationSnapshot(supabase, treeId, anchorId);

  if (relation === "father") {
    snapshot.fatherId = null;
  } else if (relation === "mother") {
    snapshot.motherId = null;
  } else if (relation === "spouse") {
    snapshot.spouses = snapshot.spouses.filter((s) => s.id !== otherPersonId);
  } else if (relation === "child") {
    snapshot.children = snapshot.children.filter((c) => c.id !== otherPersonId);
  }

  const result = await writeRelationSnapshot(supabase, anchorId, snapshot);
  if ("error" in result) return result;

  revalidatePath("/tree");
  revalidatePath(`/person/${anchorId}`);
  revalidatePath(`/person/${otherPersonId}`);
  return { ok: true };
}

/** Folds a duplicate person into the one being kept. Admin-only. */
export async function mergePeople(
  keepId: string,
  mergeId: string,
): Promise<{ ok: true } | ActionError> {
  const supabase = await createClient();
  const tree = await requireAdminTree();
  if ("error" in tree) return tree;

  const { error } = await supabase.rpc("merge_people", {
    p_keep_id: keepId,
    p_merge_id: mergeId,
  });
  if (error) return { error: error.message };

  revalidatePath("/tree");
  return { ok: true };
}

/** Marks a person record as being the signed-in user's own. */
export async function claimPerson(personId: string): Promise<{ ok: true } | ActionError> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_person", { p_person_id: personId });
  if (error) return { error: error.message };

  // If this account signed in through Telegram, carry that handle onto the
  // person record's own contact field — it's the one place a relative
  // actually looks to reach someone. Only fills a blank: a person who already
  // has a telegram handle typed in (their own, or someone else's, before this
  // account claimed them) keeps whatever is there rather than being
  // silently overwritten by whoever happens to claim them.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.telegram_username) {
      await supabase
        .from("people")
        .update({ telegram: profile.telegram_username })
        .eq("id", personId)
        .is("telegram", null);
    }

    // Same fill-only-if-blank rule as the Telegram handle above, and the same
    // reasoning for why it's not fatal if it fails: the claim itself already
    // succeeded, and a photo is a nice-to-have, not the point of claiming.
    // Copies the bytes into our own storage rather than storing Telegram's
    // URL directly — see uploadAvatarFromUrl's own comment for why.
    if (profile?.avatar_url) {
      try {
        const photoUrl = await uploadAvatarFromUrl(supabase, user.id, profile.avatar_url);
        await supabase
          .from("people")
          .update({ photo_url: photoUrl })
          .eq("id", personId)
          .is("photo_url", null);
      } catch {
        // Ignored — see comment above.
      }
    }
  }

  revalidatePath("/tree");
  revalidatePath(`/person/${personId}`);
  return { ok: true };
}

/** Admin override: detach a claim someone else made. Authorization lives in the
 * revoke_claim RPC (migration 022), which checks is_tree_admin. */
export async function revokeClaim(personId: string): Promise<{ ok: true } | ActionError> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_claim", { p_person_id: personId });
  if (error) return { error: error.message };

  revalidatePath("/tree");
  revalidatePath(`/person/${personId}`);
  return { ok: true };
}
