"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileResult = { ok: true } | { error: string };

export async function updateMyProfile(fullName: string): Promise<ProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessiya tugagan. Qaytadan kiring." };

  const name = fullName.trim();
  if (name.length > 100) return { error: "Ism juda uzun (100 belgidan oshmasin)." };

  // upsert rather than update: the signup trigger deliberately swallows its own
  // errors, so a profile row can legitimately be missing. An update matching zero
  // rows returns 200 with an empty array — the form would report success and
  // change nothing, forever, with no error to notice.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, full_name: name || null }, { onConflict: "id" });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Detach yourself from a person record you claimed by mistake. */
export async function releaseMyClaim(personId: string): Promise<ProfileResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_own_claim", { p_person_id: personId });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
