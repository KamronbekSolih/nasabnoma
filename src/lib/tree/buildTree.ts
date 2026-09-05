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
 * Birth year as a sortable number, or null when unknown.
 *
 * Reads the approximate field too, since plenty of older relatives only have
 * something like "1920 yillar" recorded — a four-digit year anywhere in that
 * text is still enough to order them against a sibling with an exact date.
 */
function birthYear(person: Person | undefined): number | null {
  if (!person) return null;
  if (person.birth_date) {
    const y = Number(person.birth_date.slice(0, 4));
    if (Number.isFinite(y)) return y;
  }
  const match = person.birth_date_approx?.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

/**
 * Orders siblings oldest-first, left to right.
 *
 * Anyone without a usable year keeps their relative position at the end rather
 * than being interleaved on a guess. Note this depends on what the viewer may
 * see: birth dates of living people are masked from ordinary members, so an
 * admin can order a row of living siblings by age where a member sees them in
 * their original order. That is a consequence of the privacy model, not a bug
 * here — the alternative is leaking ages through the layout.
 */
function bySeniority(graph: FamilyGraph) {
  return (a: { id: string }, b: { id: string }): number => {
    const ya = birthYear(graph.personById.get(a.id));
    const yb = birthYear(graph.personById.get(b.id));
    if (ya === null && yb === null) return 0;
    if (ya === null) return 1;
    if (yb === null) return -1;
    return ya - yb;
  };
}

/**
 * Projects the family graph into the flat node shape relatives-tree wants. Because
 * families own their children, parents and siblings come straight off the family
 * rather than being inferred by comparing parent sets.
 */
export function buildTreeNodes(graph: FamilyGraph): RelNode[] {
  const seniority = bySeniority(graph);
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

    // relatives-tree lays children out in the order it receives them, so
    // sorting here is what puts the eldest on the left.
    children.sort(seniority);
    siblings.sort(seniority);

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

/**
 * Narrows the graph to one person's line: everything below them, and a single
 * chain of ancestors above.
 *
 * Without this, centring on someone mid-tree pulls in their parents' other
 * children, those cousins' families, and so on outward — which is most of the
 * tree, and none of it is what you asked to look at. The rule here is the one
 * a shajara is actually read by: descendants in full, ancestry as a bare line
 * (father, his father, his father), and nothing hanging off that line. Tapping
 * an ancestor re-centres on them, which is what expands their own children.
 *
 * Parents are ordered husband-then-wife upstream, so `parents[0]` follows the
 * paternal line where one is recorded and falls back to the mother where it
 * isn't — an unbroken line either way rather than a dead end.
 */
export function pruneToLineage(nodes: RelNode[], rootId: string): RelNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (!byId.has(rootId)) return nodes;

  const keep = new Set<string>();

  // Everyone below the root, plus the people they married — a descendant's
  // spouse belongs on the card next to them even though they're not blood.
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (keep.has(id)) continue;
    keep.add(id);
    const node = byId.get(id);
    if (!node) continue;
    for (const spouse of node.spouses) keep.add(spouse.id);
    for (const child of node.children) stack.push(child.id);
  }

  // The line upward. `seen` guards against a cycle: cousin marriage can make
  // the ancestry graph loop back on itself, and this walk must still terminate.
  const seen = new Set<string>([rootId]);
  let current = byId.get(rootId);
  while (current) {
    const parent = current.parents[0];
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    keep.add(parent.id);
    current = byId.get(parent.id);
  }

  // Re-point every edge at the surviving set. relatives-tree assumes an edge it
  // is given resolves to a node it also has, so a dangling id would break the
  // layout rather than simply render less.
  return nodes
    .filter((node) => keep.has(node.id))
    .map((node) => ({
      ...node,
      parents: node.parents.filter((r) => keep.has(r.id)),
      children: node.children.filter((r) => keep.has(r.id)),
      siblings: node.siblings.filter((r) => keep.has(r.id)),
      spouses: node.spouses.filter((r) => keep.has(r.id)),
    }));
}
