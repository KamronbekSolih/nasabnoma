import { createClient } from "@/lib/supabase/server";
import { FamilyGraph } from "./relations";
import type { Family, FamilyChild, Person, TreeMember } from "@/lib/types";

export interface TreeData {
  tree: TreeMember;
  people: Person[];
  families: Family[];
  familyChildren: FamilyChild[];
  graph: FamilyGraph;
}

/**
 * Loads a tree's whole graph. People come from `people_view`, never the base table:
 * the view masks living people's private columns for non-admins, so a page can't
 * leak them by forgetting to filter.
 */
export async function loadTreeData(tree: TreeMember): Promise<TreeData> {
  const supabase = await createClient();
  const treeId = tree.tree_id;

  const [peopleRes, familiesRes, childrenRes] = await Promise.all([
    supabase.from("people_view").select("*").eq("tree_id", treeId).order("first_name"),
    supabase.from("families").select("*").eq("tree_id", treeId).order("marriage_order"),
    supabase.from("family_children").select("*").eq("tree_id", treeId),
  ]);

  // Surface failures instead of returning empty arrays — a failed query and a genuinely
  // empty tree otherwise render identically as "nobody has been added yet".
  const failure = peopleRes.error ?? familiesRes.error ?? childrenRes.error;
  if (failure) {
    throw new Error(`Shajara ma'lumotlarini o'qib bo'lmadi: ${failure.message}`);
  }

  const { data: people } = peopleRes;
  const { data: families } = familiesRes;
  const { data: familyChildren } = childrenRes;

  const peopleList = (people as Person[]) ?? [];
  const familyList = (families as Family[]) ?? [];
  const childList = (familyChildren as FamilyChild[]) ?? [];

  return {
    tree,
    people: peopleList,
    families: familyList,
    familyChildren: childList,
    graph: new FamilyGraph(peopleList, familyList, childList),
  };
}
