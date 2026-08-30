import type { ExtNode } from "relatives-tree/lib/types";
import { personName } from "@/lib/people";
import type { Person } from "@/lib/types";

const WIDTH = 180;
const HEIGHT = 100;

function formatYears(person: Person): string {
  // Dates come back null for living people the viewer can't see details of, so the
  // card shows nothing rather than a misleading "?" implying the data was never entered.
  if (!person.details_visible) return "";
  const birth = person.birth_date
    ? person.birth_date.slice(0, 4)
    : (person.birth_date_approx ?? "?");
  const death = person.is_deceased
    ? person.death_date
      ? person.death_date.slice(0, 4)
      : "?"
    : null;
  return death ? `${birth} – ${death}` : birth;
}

export function FamilyNode({
  node,
  person,
  selected,
  matched,
  dimmed,
  onSelect,
}: {
  node: ExtNode;
  person: Person;
  selected: boolean;
  /** Highlighted as a search hit. */
  matched?: boolean;
  /** Faded because a search is active and this person isn't a hit. */
  dimmed?: boolean;
  onSelect: (id: string) => void;
}) {
  const isFemale = person.gender === "female";
  const years = formatYears(person);
  // Country only, as asked — district made the line too long and it's already on
  // the profile page for anyone who wants more.
  const location = person.current_country ?? "";

  // This is a patrilineal shajara: a wife's own parents aren't part of it (she has
  // no recorded parent edge here), so she's visually distinct from an actual blood
  // descendant. Only the HEIGHT shrinks, never the width: relatives-tree lays
  // spouses out edge-to-edge horizontally, so narrowing the card would open a gap
  // toward whichever side the husband sits on. A married daughter keeps full size —
  // she has a parent edge in this tree.
  const marriedIn = isFemale && node.spouses.length > 0 && node.parents.length === 0;

  return (
    <div
      data-tree-node
      style={{
        width: WIDTH,
        height: HEIGHT,
        transform: `translate(${(node.left * WIDTH) / 2}px, ${(node.top * HEIGHT) / 2}px)`,
      }}
      className="absolute top-0 left-0 flex items-center justify-center p-1.5"
    >
      <button
        type="button"
        onClick={() => onSelect(person.id)}
        style={{ width: "100%", height: marriedIn ? "76%" : "100%" }}
        // bg-surface/bg-paper-sunken are both fully opaque — never an /NN alpha
        // modifier here, or the connector line drawn behind the card shows through it.
        className={`relative flex flex-col justify-center gap-0.5 overflow-hidden rounded-lg border bg-surface px-3 py-2 text-left shadow-[0_1px_2px_rgba(42,36,25,0.06)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(42,36,25,0.18)] ${
          isFemale ? "border-female/35" : "border-male/35"
        } ${selected ? "ring-2 ring-brand ring-offset-1" : ""} ${
          matched ? "ring-2 ring-gold" : ""
        } ${dimmed ? "opacity-30" : ""} ${person.is_deceased ? "bg-paper-sunken" : ""}`}
      >
        {/* Glazed edge marking lineage, in the mosaic palette rather than pastel */}
        <span
          className={`absolute inset-y-2 left-0 w-1 rounded-full ${
            isFemale ? "bg-female" : "bg-male"
          }`}
          aria-hidden="true"
        />
        <span
          className={`truncate pl-1.5 font-display leading-snug text-ink ${marriedIn ? "text-xs" : "text-sm"}`}
        >
          {personName(person)}
        </span>
        {years && <span className="pl-1.5 text-xs text-ink-muted">{years}</span>}
        {location && (
          <span className="truncate pl-1.5 text-[11px] text-gold">{location}</span>
        )}
      </button>
    </div>
  );
}
