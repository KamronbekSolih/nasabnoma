import { redirect } from "next/navigation";
import { getUserTrees } from "@/lib/tree/current";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export default async function OnboardingPage() {
  const memberships = await getUserTrees();
  if (memberships.length > 0) redirect("/tree");

  return (
    <main className="flex flex-1 items-center justify-center bg-paper px-4">
      <OnboardingForm />
    </main>
  );
}
