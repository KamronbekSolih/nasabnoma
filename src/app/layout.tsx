import type { Metadata, Viewport } from "next";
import { Inter, Lora, Cormorant_Garamond } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTree } from "@/lib/tree/current";

// Both faces are loaded with the Cyrillic subset: the audience reads Uzbek in Latin
// and Cyrillic and Russian, and a missing subset shows as tofu boxes for half of them.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

// Display face for the wordmark and page titles — Cormorant Garamond at weight
// 600, the exact heading pairing from the project's Classical design system.
// Unlike Marcellus it carries Cyrillic too, which the language switcher needs.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "7avlod",
  description: "Oilaviy shajara — o'zbek va MDH oilalari uchun",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Not locked: pinch-zoom is how older users read small text.
  maximumScale: 5,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tree = user ? await getCurrentTree() : null;

  return (
    <html
      lang="uz"
      className={`${inter.variable} ${lora.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper">
        <AppHeader userEmail={user?.email ?? null} role={tree?.role ?? null} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
