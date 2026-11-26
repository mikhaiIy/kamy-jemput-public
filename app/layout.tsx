import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Playfair_Display, Great_Vibes, Cinzel, Fraunces, Dancing_Script, Caveat, Amatic_SC, Bodoni_Moda } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display faces used by Template-level Gaya presets (lib/themes/presets.ts):
// Cinzel = engraved roman caps (royal / imperial / corporate-luxe),
// Fraunces = characterful editorial serif (modern / romantic).
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// Bouncy romantic script used by the Sakura Story Gaya (lib/themes/presets.ts).
const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

// Hand-drawn faces for the scrapbook/doodle hero + gallery photo designs:
// Caveat = marker handwriting, Amatic SC = tall crayon condensed.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const amaticSC = Amatic_SC({
  variable: "--font-amatic",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

// High-contrast didone used by the Cinema Story Gaya (lib/themes/presets.ts) —
// the film-title face of the editorial_cinema preset.
const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "kamy jemput — Jemputan Digital yang Indah",
    template: "%s — kamy jemput",
  },
  description:
    "Cipta dan kongsi jemputan digital yang cantik untuk perkahwinan, hari jadi, dan majlis korporat. Dibuat dengan penuh kasih di Malaysia.",
  openGraph: {
    type: "website",
    locale: "ms_MY",
    siteName: "kamy jemput",
    title: "kamy jemput — Jemputan Digital yang Indah",
    description:
      "Cipta dan kongsi jemputan digital yang cantik untuk perkahwinan, hari jadi, dan majlis korporat.",
    images: "/opengraph-image",
  },
  twitter: {
    card: "summary_large_image",
    title: "kamy jemput — Jemputan Digital yang Indah",
    description:
      "Cipta dan kongsi jemputan digital yang cantik untuk perkahwinan, hari jadi, dan majlis korporat.",
    images: "/opengraph-image",
  },
};

export const viewport: Viewport = {
  themeColor: "#2c1a4a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ms"
      className={`${cormorant.variable} ${jakarta.variable} ${playfair.variable} ${greatVibes.variable} ${geistMono.variable} ${cinzel.variable} ${fraunces.variable} ${dancingScript.variable} ${caveat.variable} ${amaticSC.variable} ${bodoniModa.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
