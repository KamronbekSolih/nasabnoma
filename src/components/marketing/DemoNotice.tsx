import Link from "next/link";

/** The strip explaining that a demo tree isn't a real user's data — shown on
 * every page of every demo tree, since a visitor can land on a person's
 * profile directly from a search engine without ever seeing the tree view
 * first. */
export function DemoNotice({ title }: { title: string }) {
  return (
    <div className="border-b border-brand-line bg-brand-soft px-4 py-2.5 text-center sm:px-6">
      <p className="text-sm text-brand">
        <strong className="font-display">{title}</strong> — 7avlod ilovasi qanday
        ishlashini koʻrsatish uchun tuzilgan namuna shajara.{" "}
        <Link href="/login?mode=signup" className="underline hover:no-underline">
          Oʻz oilangiz uchun bepul boshlang →
        </Link>
      </p>
    </div>
  );
}
