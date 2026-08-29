import type { FamilyGraph } from "./relations";

/**
 * Picks the most useful default centre for the tree view: the eldest known ancestor,
 * preferring whichever has the most descendants.
 *
 * relatives-tree renders a full descendant tree (every generation, spouses included)
 * when walking downward from the root, but only a single ancestor chain when walking
 * upward — so centring on the top of a line shows far more of the family than
 * centring on a descendant.
 */
export function pickDefaultRootId(graph: FamilyGraph): string {
  if (graph.people.length === 0) return "";

  const roots = graph.people.filter((p) => !graph.parentFamilyOf(p.id));
  if (roots.length === 0) return graph.people[0].id;
  if (roots.length === 1) return roots[0].id;

  const countDescendants = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return 0;
    seen.add(id);
    let count = 0;
    for (const child of graph.childrenOf(id)) {
      count += 1 + countDescendants(child.id, seen);
    }
    return count;
  };

  let best = roots[0];
  let bestCount = -1;
  for (const candidate of roots) {
    const count = countDescendants(candidate.id, new Set());
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best.id;
}
