import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEditRole, getCurrentTree } from "@/lib/tree/current";
import { loadTreeData } from "@/lib/tree/load";
import { PersonForm, type RelationContext, type InheritedClan } from "@/components/people/PersonForm";
import { personName } from "@/lib/people";
import type { Person, RelationKind } from "@/lib/types";

export default async function NewPersonPage({
  searchParams,
}: {
  searchParams: Promise<{ relation?: string; of?: string }>;
}) {
  const tree = await getCurrentTree();
  if (!tree) redirect("/onboarding");
  if (!canEditRole(tree.role)) redirect("/tree");

  const { relation, of } = await searchParams;
  const supabase = await createClient();
  const [{ people, graph }, { data: { user } }] = await Promise.all([
    loadTreeData(tree),
    supabase.auth.getUser(),
  ]);
  // Offer to self-claim the new record only while this account hasn't already
  // identified as someone else in this tree — see PersonForm's own comment on
  // the "Bu menman" checkbox for why.
  const alreadyClaimed = user ? people.some((p) => p.claimed_by === user.id) : true;

  let relationContext: RelationContext | undefined;
  let initialFatherId: string | undefined;
  let initialMotherId: string | undefined;
  let inheritedClan: InheritedClan | undefined;

  if (relation && of) {
    const target = graph.personById.get(of);
    if (target) {
      relationContext = {
        relation: relation as RelationKind,
        ofId: of,
        ofName: personName(target),
      };

      // Adding a child of X: X's gender fixes which parent slot they fill, and their
      // partner — unambiguous when there is exactly one — fills the other. The clan
      // (millat/urugʻ/aymoq/tarmoq) is inherited paternally, so it comes from
      // whichever of the two is the father.
      if (relation === "child") {
        const partners = graph.spousesOf(of).map((s) => s.person);
        let father: Person | undefined;

        if (target.gender === "male") {
          father = target;
          if (partners.length === 1) initialMotherId = partners[0].id;
        } else if (partners.length === 1) {
          father = partners[0];
          initialFatherId = father.id;
        }

        if (father) {
          inheritedClan = {
            millat: father.millat,
            urug: father.urug,
            aymoq: father.aymoq,
            tarmoq: father.tarmoq,
          };
        }
      }
    }
  }

  return (
    <main className="flex-1">
      <h1 className="mx-auto max-w-2xl px-6 pt-6 text-xl font-semibold text-ink">
        Yangi odam qo&apos;shish
      </h1>
      <PersonForm
        people={people}
        role={tree.role}
        relationContext={relationContext}
        initialFatherId={initialFatherId}
        initialMotherId={initialMotherId}
        inheritedClan={inheritedClan}
        alreadyClaimed={alreadyClaimed}
      />
    </main>
  );
}
