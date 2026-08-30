import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { demoTrees } from "@/lib/demo/registry";
import { FamilyGraph } from "@/lib/tree/relations";
import { personName } from "@/lib/people";
import { PersonProfile } from "@/components/people/PersonProfile";
import { PublicTopBar } from "@/components/marketing/PublicTopBar";
import { DemoNotice } from "@/components/marketing/DemoNotice";

export function generateStaticParams() {
  return Object.entries(demoTrees).flatMap(([slug, demo]) =>
    demo.people.map((p) => ({ slug, personId: p.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; personId: string }>;
}): Promise<Metadata> {
  const { slug, personId } = await params;
  const demo = demoTrees[slug];
  const person = demo?.people.find((p) => p.id === personId);
  if (!demo || !person) return {};
  return {
    title: `${personName(person)} — ${demo.title} — 7avlod`,
    description: person.bio ?? demo.subtitle,
  };
}

export default async function DemoPersonPage({
  params,
}: {
  params: Promise<{ slug: string; personId: string }>;
}) {
  const { slug, personId } = await params;
  const demo = demoTrees[slug];
  if (!demo) notFound();

  const graph = new FamilyGraph(demo.people, demo.families, demo.familyChildren);
  const person = graph.personById.get(personId);
  if (!person) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <PublicTopBar />
      <DemoNotice title={demo.title} />
      <PersonProfile
        person={person}
        graph={graph}
        canEdit={false}
        personHref={(id) => `/shajara/${slug}/${id}`}
        backHref={`/shajara/${slug}`}
        backLabel={`← ${demo.title}ga qaytish`}
      />
    </div>
  );
}
