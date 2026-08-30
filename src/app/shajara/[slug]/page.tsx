import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { demoTrees } from "@/lib/demo/registry";
import { DemoTreeView } from "@/components/tree/DemoTreeView";
import { PublicTopBar } from "@/components/marketing/PublicTopBar";
import { DemoNotice } from "@/components/marketing/DemoNotice";

// Both demo trees are static data known at build time — prerender them like
// any other content page instead of hitting this route dynamically.
export function generateStaticParams() {
  return Object.keys(demoTrees).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const demo = demoTrees[slug];
  if (!demo) return {};
  return {
    title: `${demo.title} — 7avlod`,
    description: demo.subtitle,
  };
}

export default async function DemoTreePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const demo = demoTrees[slug];
  if (!demo) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <PublicTopBar />
      <DemoNotice title={demo.title} />
      {/* role="viewer" (set inside DemoTreeView) — canEditRole("viewer") is
          false, so every add/edit/remove affordance in the tree and its side
          panel is hidden; this is a read-only view onto data that isn't
          backed by a real tree_id a visitor could accidentally be granted a
          role on. */}
      <DemoTreeView
        slug={slug}
        people={demo.people}
        families={demo.families}
        familyChildren={demo.familyChildren}
      />
    </div>
  );
}
