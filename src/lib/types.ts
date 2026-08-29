export type Gender = "male" | "female";
export type RelationKind = "father" | "mother" | "spouse" | "child";
export type TreeRole = "owner" | "admin" | "member" | "viewer";
export type Visibility = "family" | "public";

/** GEDCOM-style: a family is a couple (either slot may be empty) plus their children. */
export type FamilyRelationType = "married" | "divorced" | "widowed" | "partners" | "unknown";
/** Tracked per parent, so a child can be birth to one and step/adopted to the other. */
export type ChildRelation = "birth" | "adopted" | "step" | "foster";

export interface Tree {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface TreeMember {
  tree_id: string;
  role: TreeRole;
  tree_name: string;
}

export interface TreeMemberRow {
  tree_id: string;
  user_id: string;
  role: TreeRole;
  joined_at: string;
}

/**
 * A row from `people_view`. Detail columns come back null for living people unless
 * the viewer is an admin, the person opted their record public, or it is their own
 * record — `details_visible` says which case applies, so the UI can explain a blank
 * field instead of implying the data was never entered.
 */
export interface Person {
  id: string;
  tree_id: string;
  first_name: string;
  last_name: string | null;
  patronymic: string | null;
  gender: Gender;
  is_deceased: boolean;
  visibility: Visibility;
  claimed_by: string | null;
  details_visible: boolean;
  birth_date: string | null;
  birth_date_approx: string | null;
  death_date: string | null;
  birth_country: string | null;
  birth_region: string | null;
  birth_district: string | null;
  birth_mahalla: string | null;
  current_country: string | null;
  current_region: string | null;
  current_district: string | null;
  current_address: string | null;
  millat: string | null;
  urug: string | null;
  aymoq: string | null;
  tarmoq: string | null;
  telegram: string | null;
  instagram: string | null;
  photo_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  tree_id: string;
  husband_id: string | null;
  wife_id: string | null;
  relation_type: FamilyRelationType;
  married_date: string | null;
  marriage_order: number;
}

export interface FamilyChild {
  id: string;
  tree_id: string;
  family_id: string;
  child_id: string;
  father_relation: ChildRelation;
  mother_relation: ChildRelation;
}

export interface PersonRevision {
  id: string;
  person_id: string;
  changed_by: string | null;
  changed_at: string;
  action: "insert" | "update" | "delete";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}
