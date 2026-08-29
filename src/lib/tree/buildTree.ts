import type { Gender, Node as RelNode, RelType } from "relatives-tree/lib/types";
import type { ChildRelation, Person } from "@/lib/types";
import type { FamilyGraph } from "./relations";

// relatives-tree declares Gender/RelType as ambient const enums, which
// isolatedModules forbids importing as values — so these are cast from plain
// strings that match the enum's runtime values instead of referencing the enum.
const GENDER: Record<Person["gender"], Gender> = {
  male: "male" as Gender,
  female: "female" as Gender,
};

const BLOOD = "blood" as RelType;
const HALF = "half" as RelType;
const ADOPTED = "adopted" as RelType;
const MARRIED = "married" as RelType;
const DIVORCED = "divorced" as RelType;

/** The layout only distinguishes blood from adopted; step/foster render as adopted. */
function parentRelType(relation: ChildRelation): RelType {
  return relation === "birth" ? BLOOD : ADOPTED;
}

/**
 * Projects the family graph into the flat node shape relatives-tree wants. Because
 * families own their children, parents and siblings come straight off the family
 * rather than being inferred by comparing parent sets.
 */
export function buildTreeNodes(graph: FamilyGraph): RelNode[] {
  return graph.people.map((person): RelNode => {
    const parentFamily = graph.parentFamilyOf(person.id);
    const childLink = graph.childLinkOf(person.id);

    const parents: { id: string; type: RelType }[] = [];
    if (parentFamily && childLink) {
      if (parentFamily.husband_id) {
        parents.push({
          id: parentFamily.husband_id,
          type: parentRelType(childLink.father_relation),
        });
      }
      if (parentFamily.wife_id) {
        parents.push({
          id: parentFamily.wife_id,
          type: parentRelType(childLink.mother_relation),
        });
      }
    }

    const children: { id: string; type: RelType }[] = [];
    for (const family of graph.familiesOf(person.id)) {
      const isFather = family.husband_id === person.id;
      for (const link of graph.childLinksOfFamily(family.id)) {
        children.push({
          id: link.child_id,
          type: parentRelType(isFather ? link.father_relation : link.mother_relation),
        });
      }
    }

    const spouses = graph.spousesOf(person.id).map(({ person: partner, family }) => ({
      id: partner.id,
      type: family.relation_type === "divorced" ? DIVORCED : MARRIED,
    }));

    const siblings = graph.siblingsOf(person.id).map(({ id, half }) => ({
      id,
      type: half ? HALF : BLOOD,
    }));

    return {
      id: person.id,
      gender: GENDER[person.gender],
      parents,
      children,
      siblings,
      spouses,
    };
  });
}
