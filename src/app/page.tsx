import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Landing } from "@/components/marketing/Landing";

export const metadata = {
  title: "7avlod — oilaviy shajara",
  description:
    "Oʻzbek va MDH oilalari uchun bepul oilaviy shajara xizmati: interaktiv daraxt, dunyo xaritasi va bitta havola bilan taklif.",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A signed-in visitor has no use for the marketing page — straight to their
  // tree, same as the old unconditional redirect this replaces.
  if (user) redirect("/tree");

  return <Landing />;
}
