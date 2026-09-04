import { createClient } from "@/lib/supabase/server";

export interface PersonDocument {
  id: string;
  title: string | null;
  created_at: string;
  /** Short-lived signed link to the small grid rendition. */
  thumbUrl: string | null;
  /** Short-lived signed link to the readable full size. */
  fullUrl: string | null;
}

/** An hour comfortably outlives a page view without leaving long-lived links
 * to identity documents sitting in browser history or a shared screenshot. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * A person's archive, with freshly signed URLs.
 *
 * The `documents` bucket is private, so unlike avatars there is no public URL
 * to store — every view mints a temporary link. Authorisation is not done here:
 * RLS on person_documents (migration 027) already restricts rows to tree
 * members who may see this person's private details, and the storage read
 * policy independently re-checks the same rule when the URL is signed. A
 * caller that forgets to check permissions therefore gets an empty list rather
 * than a leak.
 */
export async function getPersonDocuments(personId: string): Promise<PersonDocument[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("person_documents")
    .select("id, title, created_at, storage_path, thumb_path")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const store = supabase.storage.from("documents");
  // One batch call per rendition rather than two per document.
  const [thumbs, fulls] = await Promise.all([
    store.createSignedUrls(
      rows.map((r) => r.thumb_path ?? r.storage_path),
      SIGNED_URL_TTL_SECONDS,
    ),
    store.createSignedUrls(
      rows.map((r) => r.storage_path),
      SIGNED_URL_TTL_SECONDS,
    ),
  ]);

  return rows.map((row, i) => ({
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    thumbUrl: thumbs.data?.[i]?.signedUrl ?? null,
    fullUrl: fulls.data?.[i]?.signedUrl ?? null,
  }));
}
