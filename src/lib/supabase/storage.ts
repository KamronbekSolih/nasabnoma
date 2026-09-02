import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "avatars";
const MAX_DIMENSION = 480;
const JPEG_QUALITY = 0.82;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Downscales + re-encodes an image client-side before upload, so a 1GB storage bucket
 * stretches to thousands of photos instead of hundreds. */
export async function compressImage(file: File): Promise<Blob> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Rasm juda katta (15 MB dan oshmasin).");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Browsers can't decode every format they'll happily let you pick — HEIC from
    // an iPhone is the common one. Fail with something actionable.
    throw new Error(
      "Bu rasm formatini oʻqib boʻlmadi. JPG yoki PNG formatida saqlab, qaytadan urinib koʻring.",
    );
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas mavjud emas.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Rasmni siqib boʻlmadi."))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/** Uploads under the owner's own folder (storage RLS scopes read/write to it), returns the public URL. */
export async function uploadAvatar(
  supabase: SupabaseClient,
  ownerId: string,
  file: File,
): Promise<string> {
  const compressed = await compressImage(file);
  const path = `${ownerId}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Copies an external image (a Telegram userpic, at the moment) into our own
 * storage bucket and returns the new public URL. Server-safe — unlike
 * uploadAvatar above, this never touches `document`/`createImageBitmap`/canvas,
 * so it works from a server action, not just the browser.
 *
 * Deliberately a copy, not a hotlink: Telegram's userpic URL always resolves to
 * whatever that account's *current* photo is, so storing the URL itself in
 * `people.photo_url` would make it silently change (or vanish) if the relative
 * later changes or removes their Telegram photo — including for people they
 * don't manage, since claiming is between the account and the person record,
 * not something the photo's owner reviews per change. Copying the bytes now
 * makes the shajara photo a permanent, independent choice at the moment of
 * claiming, same as an uploaded one.
 */
export async function uploadAvatarFromUrl(
  supabase: SupabaseClient,
  ownerId: string,
  sourceUrl: string,
): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Rasmni yuklab boʻlmadi (${res.status}).`);

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("Manba rasm emas.");
  }

  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Rasm juda katta.");
  }

  const ext = contentType === "image/png" ? "png" : "jpg";
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort cleanup of a replaced photo. Uploads are keyed by random UUID, so a
 * superseded file is unreachable forever otherwise — it would just consume quota. */
export async function deleteAvatarByUrl(supabase: SupabaseClient, url: string): Promise<void> {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length).split("?")[0];
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
