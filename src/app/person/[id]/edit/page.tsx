import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentTree } from "@/lib/tree/current";
import { canEditRole } from "@/lib/roles";
import { loadTreeData } from "@/lib/tree/load";
import { PersonForm } from "@/components/people/PersonForm";
import { personName } from "@/lib/people";

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tree = await getCurrentTree();
  if (!tree) redirect("/onboarding");

  const { id } = await params;
  // Viewers have no business on an edit route — send them to the profile instead of
  // rendering a form every control is disabled in.
  if (!canEditRole(tree.role)) redirect(`/person/${id}`);

  const { people, graph } = await loadTreeData(tree);

  const person = graph.personById.get(id);
  if (!person) notFound();

  const father = graph.fatherOf(id);
  const mother = graph.motherOf(id);
  const childLink = graph.childLinkOf(id);

  const initialSpouses = graph.spousesOf(id).map(({ person: partner, family }) => ({
    id: partner.id,
    status: family.relation_type,
  }));

  const initialChildren = graph
    .familiesOf(id)
    .flatMap((family) =>
      graph.childLinksOfFamily(family.id).map((link) => ({
        id: link.child_id,
        family_id: family.id,
        father_relation: link.father_relation,
        mother_relation: link.mother_relation,
      })),
    );

  const familyOptions = graph.familiesOf(id).map((family) => {
    const partner = graph.partnerOf(family, id);
    return { id: family.id, label: partner ? personName(partner) : "Turmush o'rtog'isiz" };
  });

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        <Link href={`/person/${person.id}`} className="text-sm text-brand hover:underline">
          ← {personName(person)}
        </Link>
        <h1 className="mt-1 font-display text-2xl text-ink">Ma&apos;lumotlarni tahrirlash</h1>
      </div>
      <PersonForm
        person={person}
        people={people}
        role={tree.role}
        initialFatherId={father?.id}
        initialFatherRelation={childLink?.father_relation}
        initialMotherId={mother?.id}
        initialMotherRelation={childLink?.mother_relation}
        initialSpouses={initialSpouses}
        initialChildren={initialChildren}
        familyOptions={familyOptions}
      />
    </main>
  );
}
