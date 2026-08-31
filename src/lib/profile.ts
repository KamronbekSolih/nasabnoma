import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  telegram_username: string | null;
}

const COLUMNS = "id, full_name, avatar_url, telegram_username";

/** The signed-in user's own profile, or null if signed out. React-cached so the
 * layout and a page in the same render share one query. */
export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select(COLUMNS).eq("id", user.id).maybeSingle();
  return (data as Profile | null) ?? null;
});

/** Profiles for a set of user ids, keyed by id.
 *
 * Used to put real names on the members list. Deliberately a separate query
 * rather than a PostgREST embed: tree_members.user_id and profiles.id both point
 * at auth.users, and PostgREST has no relationship to traverse between them
 * without adding an FK that would make profile creation a hard prerequisite for
 * joining a tree. */
export async function getProfilesByIds(ids: string[]): Promise<Map<string, Profile>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(COLUMNS).in("id", ids);
  return new Map(((data as Profile[] | null) ?? []).map((p) => [p.id, p]));
}

/**
 * What to call someone in the UI.
 *
 * Never falls back to the email address: before profiles existed no member could
 * see any part of another member's email, and a display-name default is not a
 * reason to change that. Your own email is fine to show back to you, which is
 * why the caller passes it explicitly or not at all.
 */
export function displayName(profile: Profile | null | undefined, ownEmail?: string | null): string {
  const name = profile?.full_name?.trim();
  if (name) return name;
  if (ownEmail) return ownEmail;
  return "Foydalanuvchi";
}
