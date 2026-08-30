"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserTrees, TREE_COOKIE_NAME } from "@/lib/tree/current";

async function setCurrentTreeCookie(treeId: string) {
  const cookieStore = await cookies();
  cookieStore.set(TREE_COOKIE_NAME, treeId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

// Next.js redacts a thrown Error's message once it crosses the Server
// Function boundary in production — the client only ever sees a generic
// "Minified React error #441" digest, never the actual Uzbek text (confirmed
// live: this was exactly what a user hit trying to join with an invite
// code). Expected, user-facing failures here are modeled as return values
// instead, per the framework's own guidance for this — not thrown — so the
// real message survives to the client.
export type TreeActionResult = { id: string } | { error: string };

export async function createTree(name: string): Promise<TreeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessiya tugagan. Qaytadan kiring." };

  const { data, error } = await supabase.rpc("create_tree", { tree_name: name });
  if (error) return { error: error.message };

  await setCurrentTreeCookie(data as string);
  revalidatePath("/", "layout");
  return { id: data as string };
}

export async function joinTreeByCode(code: string): Promise<TreeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessiya tugagan. Qaytadan kiring." };

  const { data, error } = await supabase.rpc("join_tree_by_code", {
    invite_code_input: code,
  });
  if (error) return { error: error.message };

  await setCurrentTreeCookie(data as string);
  revalidatePath("/", "layout");
  return { id: data as string };
}

export async function switchTree(treeId: string) {
  const memberships = await getUserTrees();
  if (!memberships.some((m) => m.tree_id === treeId)) {
    throw new Error("Siz bu daraxt a'zosi emassiz.");
  }
  await setCurrentTreeCookie(treeId);
  revalidatePath("/", "layout");
}
