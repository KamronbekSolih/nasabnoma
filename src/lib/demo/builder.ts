import type {
  Family,
  FamilyChild,
  FamilyRelationType,
  Gender,
  Person,
} from "@/lib/types";

/**
 * A tiny in-memory builder for constructing a Person/Family/FamilyChild graph
 * by hand — the exact same GEDCOM-style shape `loadTreeData` produces from
 * Supabase, just assembled from a literal script instead of a database. This
 * is what lets the real FamilyGraph/FamilyTreeView/PersonProfile components
 * render a historical demo tree with zero changes to how they work: they
 * have no idea this data didn't come from Postgres.
 *
 * IDs are short, readable slugs ("temur", "shahrukh") rather than UUIDs —
 * nothing here or in the rendering components validates format, they're only
 * ever used as Map keys.
 */
export class DemoTreeBuilder {
  readonly treeId: string;
  readonly people: Person[] = [];
  readonly families: Family[] = [];
  readonly familyChildren: FamilyChild[] = [];
  private familyCounter = 0;
  private childCounter = 0;

  constructor(treeId: string) {
    this.treeId = treeId;
  }

  /** Adds one person and returns their id (== the `id` you passed in), so call
   * sites can do `const temur = t.person({id: "temur", ...}).id`. */
  person(opts: {
    id: string;
    name: string;
    gender: Gender;
    /** Free-text approximate birth ("570", "c. 1420") — used when an exact
     * ISO date isn't confidently documented. */
    bornApprox?: string;
    /** Full ISO date — only set where the source material gives a real day,
     * not just a year, so precision here is never fabricated. */
    birthDate?: string;
    deathDate?: string;
    /** Defaults to true: every person in these two trees is a historical
     * figure. */
    living?: boolean;
    /** Shown as the small gold line under the name on the tree card — a
     * place, not necessarily a modern country ("Makka", "Samarqand"). */
    place?: string;
    /** Shown on the person's own detail page. */
    bio?: string;
  }): string {
    this.people.push({
      id: opts.id,
      tree_id: this.treeId,
      first_name: opts.name,
      last_name: null,
      patronymic: null,
      gender: opts.gender,
      is_deceased: !opts.living,
      visibility: "public",
      claimed_by: null,
      details_visible: true,
      birth_date: opts.birthDate ?? null,
      birth_date_approx: opts.bornApprox ?? null,
      death_date: opts.deathDate ?? null,
      birth_country: null,
      birth_region: null,
      birth_district: null,
      birth_mahalla: null,
      current_country: opts.place ?? null,
      current_region: null,
      current_district: null,
      current_address: null,
      current_lat: null,
      current_lng: null,
      millat: null,
      urug: null,
      aymoq: null,
      tarmoq: null,
      telegram: null,
      instagram: null,
      photo_url: null,
      bio: opts.bio ?? null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    return opts.id;
  }

  /** Registers a couple (either side may be omitted — e.g. an unrecorded
   * mother) and links each id in `children` to it. Returns the family id, in
   * case a second marriage needs its own record later (`marriage_order`). */
  union(
    husband: string | null,
    wife: string | null,
    children: string[] = [],
    opts: { relationType?: FamilyRelationType; order?: number } = {},
  ): string {
    this.familyCounter += 1;
    const familyId = `fam-${this.familyCounter}`;
    this.families.push({
      id: familyId,
      tree_id: this.treeId,
      husband_id: husband,
      wife_id: wife,
      relation_type: opts.relationType ?? "married",
      married_date: null,
      marriage_order: opts.order ?? 1,
    });
    for (const childId of children) {
      this.childCounter += 1;
      this.familyChildren.push({
        id: `fc-${this.childCounter}`,
        tree_id: this.treeId,
        family_id: familyId,
        child_id: childId,
        father_relation: "birth",
        mother_relation: "birth",
      });
    }
    return familyId;
  }
}
