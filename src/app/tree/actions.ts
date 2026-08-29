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

export async function createTree(name: string): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessiya tugagan. Qaytadan kiring.");

  const { data, error } = await supabase.rpc("create_tree", { tree_name: name });
  if (error) throw new Error(error.message);

  await setCurrentTreeCookie(data as string);
  revalidatePath("/", "layout");
  return { id: data as string };
}

export async function joinTreeByCode(code: string): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessiya tugagan. Qaytadan kiring.");

  const { data, error } = await supabase.rpc("join_tree_by_code", {
    invite_code_input: code,
  });
  if (error) throw new Error(error.message);

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
