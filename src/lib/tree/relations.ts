import type { Family, FamilyChild, Person } from "@/lib/types";

/**
 * Indexed view over the family-unit tables. Every relationship question the UI asks
 * ("who are her children", "which marriage does he belong to") is answered from
 * families rather than re-derived from edges at each call site.
 */
export class FamilyGraph {
  readonly people: Person[];
  readonly personById: Map<string, Person>;
  readonly familyById: Map<string, Family>;
  /** Families where the person is a partner (GEDCOM FAMS). */
  private readonly familiesAsPartner: Map<string, Family[]>;
  /** The single family where the person is a child (GEDCOM FAMC). */
  private readonly familyAsChild: Map<string, Family>;
  private readonly childrenByFamily: Map<string, FamilyChild[]>;
  private readonly childLinkByChild: Map<string, FamilyChild>;

  constructor(people: Person[], families: Family[], familyChildren: FamilyChild[]) {
    this.people = people;
    this.personById = new Map(people.map((p) => [p.id, p]));
    this.familyById = new Map(families.map((f) => [f.id, f]));
    this.familiesAsPartner = new Map();
    this.familyAsChild = new Map();
    this.childrenByFamily = new Map();
    this.childLinkByChild = new Map();

    for (const family of families) {
      for (const partnerId of [family.husband_id, family.wife_id]) {
        if (!partnerId) continue;
        const list = this.familiesAsPartner.get(partnerId);
        if (list) list.push(family);
        else this.familiesAsPartner.set(partnerId, [family]);
      }
    }
    for (const list of this.familiesAsPartner.values()) {
      list.sort((a, b) => a.marriage_order - b.marriage_order);
    }

    for (const link of familyChildren) {
      const family = this.familyById.get(link.family_id);
      if (!family) continue;
      this.familyAsChild.set(link.child_id, family);
      this.childLinkByChild.set(link.child_id, link);
      const list = this.childrenByFamily.get(link.family_id);
      if (list) list.push(link);
      else this.childrenByFamily.set(link.family_id, [link]);
    }
  }

  parentFamilyOf(personId: string): Family | undefined {
    return this.familyAsChild.get(personId);
  }

  childLinkOf(personId: string): FamilyChild | undefined {
    return this.childLinkByChild.get(personId);
  }

  fatherOf(personId: string): Person | undefined {
    const id = this.familyAsChild.get(personId)?.husband_id;
    return id ? this.personById.get(id) : undefined;
  }

  motherOf(personId: string): Person | undefined {
    const id = this.familyAsChild.get(personId)?.wife_id;
    return id ? this.personById.get(id) : undefined;
  }

  familiesOf(personId: string): Family[] {
    return this.familiesAsPartner.get(personId) ?? [];
  }

  childLinksOfFamily(familyId: string): FamilyChild[] {
    return this.childrenByFamily.get(familyId) ?? [];
  }

  /** Every child across all of the person's families, in family order. */
  childrenOf(personId: string): Person[] {
    const out: Person[] = [];
    for (const family of this.familiesOf(personId)) {
      for (const link of this.childLinksOfFamily(family.id)) {
        const child = this.personById.get(link.child_id);
        if (child) out.push(child);
      }
    }
    return out;
  }

  partnerOf(family: Family, personId: string): Person | undefined {
    const otherId = family.husband_id === personId ? family.wife_id : family.husband_id;
    return otherId ? this.personById.get(otherId) : undefined;
  }

  /** Partners across all the person's families, paired with the family they share. */
  spousesOf(personId: string): { person: Person; family: Family }[] {
    const out: { person: Person; family: Family }[] = [];
    for (const family of this.familiesOf(personId)) {
      const partner = this.partnerOf(family, personId);
      if (partner) out.push({ person: partner, family });
    }
    return out;
  }

  /**
   * Full siblings share the person's family outright. Half siblings are found through
   * each parent's *other* families — which the old edge model had to guess at by
   * comparing parent sets.
   */
  siblingsOf(personId: string): { id: string; half: boolean }[] {
    const family = this.familyAsChild.get(personId);
    if (!family) return [];

    const result = new Map<string, boolean>();
    for (const link of this.childLinksOfFamily(family.id)) {
      if (link.child_id !== personId) result.set(link.child_id, false);
    }

    for (const parentId of [family.husband_id, family.wife_id]) {
      if (!parentId) continue;
      for (const other of this.familiesOf(parentId)) {
        if (other.id === family.id) continue;
        for (const link of this.childLinksOfFamily(other.id)) {
          if (link.child_id === personId) continue;
          if (!result.has(link.child_id)) result.set(link.child_id, true);
        }
      }
    }

    return [...result.entries()].map(([id, half]) => ({ id, half }));
  }

  /** People with no family ties at all — they'd otherwise be invisible in every view. */
  unlinkedPeople(): Person[] {
    return this.people.filter(
      (p) => !this.familyAsChild.has(p.id) && this.familiesOf(p.id).length === 0,
    );
  }
}
