import Image from "next/image";
import Link from "next/link";
import { buttonPrimary, buttonSecondary } from "@/components/ui/primitives";
import { ArchFrame, OrnamentalDivider, StarRosette } from "@/components/ui/Ornament";

/**
 * The public marketing page at "/" — the first thing an anonymous visitor
 * sees, before any login prompt. It doesn't use AppHeader (which renders
 * nothing for a signed-out visitor, same as /login) — instead it carries its
 * own minimal top bar, in the same spirit as the login card being
 * self-contained rather than living inside the app chrome.
 *
 * Every feature described here is real and shipped (interactive tree,
 * world map, invite links, role-based privacy masking) — nothing here is
 * aspirational copy for a feature that doesn't exist yet.
 */
export function Landing() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <TopBar />
      <Hero />
      <Features />
      <HowItWorks />
      <FinalCta />
      <Footer />
    </div>
  );
}

function TopBar() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/brand/icon.png" alt="" width={28} height={28} className="rounded-full" />
          <span className="font-display text-lg font-semibold tracking-tight">
            <span className="text-brand">7</span>
            <span className="text-ink">avlod</span>
          </span>
        </div>
        <Link href="/login" className={buttonSecondary}>
          Kirish
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative px-4 pt-14 pb-16 text-center sm:px-6 sm:pt-20 sm:pb-20">
      <ArchFrame className="mx-auto flex max-w-xs flex-col items-center px-6 pt-8 pb-6">
        <Image
          src="/brand/logo-mark.png"
          alt=""
          width={760}
          height={709}
          priority
          className="h-28 w-auto sm:h-32"
        />
        <p className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">
          <span className="text-brand">7</span>
          <span className="text-ink">avlod</span>
        </p>
      </ArchFrame>

      <p className="mx-auto mt-2 max-w-xl font-body text-lg text-ink-muted italic sm:text-xl">
        Oila shajarangizni saqlang, tuzing va avlodlarga qoldiring
      </p>
      <p className="mx-auto mt-4 max-w-lg text-sm text-ink-faint sm:text-base">
        Oʻzbek va MDH oilalari uchun — ota-bobolardan bugungi kungacha butun
        qarindoshlik daraxtini birga tuzadigan, bepul xizmat.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/login?mode=signup" className={buttonPrimary}>
          Bepul boshlash
        </Link>
        <Link href="/login" className={buttonSecondary}>
          Hisobim bor, kirish
        </Link>
      </div>

      <OrnamentalDivider className="mx-auto mt-14 max-w-md" />
    </section>
  );
}

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const features: Feature[] = [
  {
    title: "Interaktiv shajara",
    description:
      "Ota-bobolaringizdan eng yosh avlodgacha — barcha qarindoshlaringizni bitta daraxtda bogʻlang. Istalgan odamni markazga qoʻyib, shajarani istagan tarafdan koʻring.",
    icon: <TreeIcon />,
  },
  {
    title: "Dunyo boʻylab",
    description:
      "Qarindoshlaringiz qayerda yashashidan qatʼiy nazar — ularni jahon xaritasida oʻz shahrida koʻring. Kim qaysi davlatda ekanini bir qarashda bilib oling.",
    icon: <GlobeIcon />,
  },
  {
    title: "Bitta havola bilan taklif",
    description:
      "Oilangizni taklif qilish uchun bitta havola yetarli. Qarindoshingiz shu havola orqali roʻyxatdan oʻtishi bilan, avtomatik ravishda sizning shajarangizga qoʻshiladi.",
    icon: <LinkIcon />,
  },
  {
    title: "Maxfiylik nazorati",
    description:
      "Tirik odamlarning shaxsiy maʼlumotlari faqat oila aʼzolariga koʻrinadi. Kimga nima koʻrinishini administrator boshqaradi — hech narsa ochiq internetda yotmaydi.",
    icon: <ShieldIcon />,
  },
];

function Features() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="illuminated flex gap-4 rounded-card border border-line-strong bg-surface p-5"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-line bg-brand-soft text-brand">
              {f.icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{f.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = [
  {
    title: "Roʻyxatdan oʻting",
    description: "Bir necha soniyada bepul hisob oching — bank kartasi shart emas.",
  },
  {
    title: "Birinchi odamni kiriting",
    description:
      "Oʻzingizdan yoki ota-bobolaringizdan boshlang, keyin qarindoshlaringizni birma-bir ulang.",
  },
  {
    title: "Oilangizni taklif qiling",
    description:
      "Havolani qarindoshlaringizga yuboring — ular qoʻshilgach, shajara birgalikda oʻsib boradi.",
  },
];

function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Qanday ishlaydi
        </h2>
        <OrnamentalDivider className="my-4" />
      </div>

      <ol className="mt-8 grid gap-6 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="flex flex-col items-center text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-line bg-brand-soft font-display text-lg font-semibold text-brand">
              {i + 1}
            </span>
            <h3 className="mt-3 font-display text-base font-semibold text-ink">{step.title}</h3>
            <p className="mt-1 text-sm text-ink-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="illuminated mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-card border border-line-strong bg-surface px-6 py-10 text-center sm:px-10">
        <StarRosette size={40} />
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Oilangizning tarixi bugundan boshlanadi
        </h2>
        <p className="max-w-md text-sm text-ink-muted">
          Shajarani birga tuzing, qarindoshlaringizni taklif qiling va bu tarixni
          keyingi avlodlarga qoldiring.
        </p>
        <Link href="/login?mode=signup" className={buttonPrimary}>
          Bepul boshlash
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line px-4 py-6 text-center sm:px-6">
      <p className="text-xs text-ink-faint">
        © {new Date().getFullYear()} <span className="text-brand">7</span>avlod
      </p>
    </footer>
  );
}

// Minimal line-art glyphs matching the ornament rule's hairline weight, drawn
// directly in currentColor so they inherit the icon badge's brand tone with
// no extra props.

function TreeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="4" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="4" cy="15" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="15" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 6.2V10M10 10L4 12.8M10 10L16 12.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 10h14M10 3c2.4 2 2.4 12 0 14M10 3c-2.4 2-2.4 12 0 14" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="7" width="8" height="6" rx="3" stroke="currentColor" strokeWidth="1.4" transform="rotate(-30 6.5 10)" />
      <rect x="9.5" y="7" width="8" height="6" rx="3" stroke="currentColor" strokeWidth="1.4" transform="rotate(-30 13.5 10)" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.5l6 2.2v4.6c0 4-2.6 7-6 8.2-3.4-1.2-6-4.2-6-8.2V4.7l6-2.2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M7.3 10l1.9 1.9 3.5-3.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
