import { JoinAccept } from "@/components/join/JoinAccept";

// Auth is already guaranteed here: middleware sends unauthenticated visitors to
// /login?redirect=/join/<code> before this page ever renders. The actual join
// (which sets a cookie + revalidates) happens client-side via JoinAccept, since
// a Server Component's render isn't allowed to mutate cookies directly.
export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="flex flex-1 items-center justify-center bg-paper px-4">
      <JoinAccept code={code} />
    </main>
  );
}
