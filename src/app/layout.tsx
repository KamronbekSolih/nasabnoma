import type { Metadata, Viewport } from "next";
import { Inter, Lora, Marcellus } from "next/font/google";
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

// Display face for the wordmark and page titles: Roman-inscriptional, with the
// flared serifs and wide caps that sit well against geometric tilework. Latin-only,
// so anything that must render in Cyrillic uses Lora instead.
const marcellus = Marcellus({
  variable: "--font-marcellus",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nasabnoma",
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
      className={`${inter.variable} ${lora.variable} ${marcellus.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper">
        <AppHeader userEmail={user?.email ?? null} role={tree?.role ?? null} />
        {children}
      </body>
    </html>
  );
}
