import { temuriylarDemo } from "./temuriylar";
import { muhammadSavDemo } from "./muhammad-sav";
import type { Family, FamilyChild, Person } from "@/lib/types";

export interface DemoTree {
  slug: string;
  title: string;
  subtitle: string;
  people: Person[];
  families: Family[];
  familyChildren: FamilyChild[];
}

/** Every public demo tree, keyed by the slug in its URL. Both purposes the
 * user asked for — a working demo of the app, and standalone informative
 * content — are served by the same static, read-only data, never Supabase. */
export const demoTrees: Record<string, DemoTree> = {
  [temuriylarDemo.slug]: temuriylarDemo,
  [muhammadSavDemo.slug]: muhammadSavDemo,
};
