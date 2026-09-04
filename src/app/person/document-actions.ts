"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canEditRole, getCurrentTree } from "@/lib/tree/current";

// Same convention as the rest of the app's actions: failures come back as
// values, never thrown, so the Uzbek message survives Next.js's production
// error redaction. See the note in src/app/person/actions.ts.
export type ActionError = { error: string };

/**
 * Records an already-uploaded document. The file itself goes straight from the
 * browser to storage (see uploadPersonDocument) — this only writes the index
 * row, so a scan never has to squeeze through a server action's body limit.
 *
 * Both halves are authorised independently: the storage INSERT policy checked
 * can_edit_tree from the path's tree id, and person_documents' own insert
 * policy re-checks it here. Neither trusts this function.
 */
export async function recordPersonDocument(input: {
  personId: string;
  storagePath: string;
  thumbPath: string;
  title: string | null;
  sizeBytes: number;
}): Promise<{ ok: true } | ActionError> {
  const supabase = await createClient();
  const tree = await getCurrentTree();
  if (!tree) return { error: "Avval shajara tanlang yoki yarating." };
  if (!canEditRole(tree.role)) {
    return { error: "Sizda tahrirlash huquqi yoʻq — faqat koʻrish mumkin." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessiya tugagan. Qaytadan kiring." };

  // The person must belong to the active tree. Without this a caller could
  // record a document against someone in a different tree entirely, since the
  // insert policy only checks that they may edit the tree_id they supplied.
  const { data: person } = await supabase
    .from("people")
    .select("id")
    .eq("id", input.personId)
    .eq("tree_id", tree.tree_id)
    .maybeSingle();
  if (!person) return { error: "Odam topilmadi." };

  const { error } = await supabase.from("person_documents").insert({
    tree_id: tree.tree_id,
    person_id: input.personId,
    storage_path: input.storagePath,
    thumb_path: input.thumbPath,
    title: input.title?.trim() || null,
    mime_type: "image/jpeg",
    size_bytes: input.sizeBytes,
    uploaded_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/person/${input.personId}`);
  revalidatePath("/profile");
  return { ok: true };
}

/** Removes a document — both storage renditions and the row. */
export async function deletePersonDocument(
  documentId: string,
): Promise<{ ok: true } | ActionError> {
  const supabase = await createClient();
  const tree = await getCurrentTree();
  if (!tree) return { error: "Avval shajara tanlang yoki yarating." };

  // Read the paths before deleting the row — afterwards RLS would hide it and
  // the storage objects would be orphaned with no way left to find them.
  const { data: doc } = await supabase
    .from("person_documents")
    .select("id, person_id, storage_path, thumb_path")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { error: "Hujjat topilmadi." };

  const { error } = await supabase.from("person_documents").delete().eq("id", documentId);
  if (error) return { error: error.message };

  // Best-effort: the row is gone either way, and a leftover object only costs
  // quota. Doing it in this order means a storage failure can't leave a row
  // pointing at a file the user already believes is deleted.
  const paths = [doc.storage_path, doc.thumb_path].filter(Boolean) as string[];
  if (paths.length > 0) {
    await supabase.storage.from("documents").remove(paths);
  }

  revalidatePath(`/person/${doc.person_id}`);
  revalidatePath("/profile");
  return { ok: true };
}
