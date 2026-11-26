import type { Theme, ThemePalette, ThemeColors } from "@/lib/types"

// ThemeColors now lives in lib/types.ts (so Theme can carry an inline palette).
// Re-exported here to keep existing `from "@/lib/sections/theme"` imports valid.
export type { ThemeColors }

const PALETTES: Record<ThemePalette, ThemeColors> = {
  plum_gold: {
    bg: "#faf8f4",
    text: "#1a1208",
    accent: "#2c1a4a",
    gold: "#c9984a",
    muted: "#9a8878",
    border: "#e2d8cc",
    card: "#ffffff",
    divider: "✦",
    opening: "You are invited",
  },
  amber_rose: {
    bg: "#fdf6ec",
    text: "#3a2010",
    accent: "#92450a",
    gold: "#c9984a",
    muted: "#a08878",
    border: "rgba(201,152,74,0.4)",
    card: "rgba(255,252,242,0.92)",
    divider: "✦",
    opening: "Dengan Nama Allah Yang Maha Pemurah Lagi Maha Penyayang",
  },
  red_gold: {
    bg: "#fff7e8",
    text: "#5a1a0e",
    accent: "#8b0000",
    gold: "#c9984a",
    muted: "#9a8878",
    border: "rgba(139,0,0,0.25)",
    card: "#ffffff",
    divider: "❧",
    opening: "囍 Our Wedding 囍",
  },
  sage_ivory: {
    bg: "#f7f5ef",
    text: "#3d3a2c",
    accent: "#5f8263",
    gold: "#c4a882",
    muted: "#8a8674",
    border: "#dad3c2",
    card: "#ffffff",
    divider: "❦",
    opening: "Join us as we celebrate",
  },
  minimal_ink: {
    bg: "#fafafa",
    text: "#1a1a1a",
    accent: "#1a1a1a",
    gold: "#888888",
    muted: "#666666",
    border: "#e0e0e0",
    card: "#ffffff",
    divider: "—",
    opening: "You are invited",
  },
  pastel_green_gold: {
    bg: "#f3f7ee",
    text: "#2d3a2c",
    accent: "#5a7a4a",
    gold: "#c9984a",
    muted: "#8a957a",
    border: "#d8dcce",
    card: "#ffffff",
    divider: "✦",
    opening: "Selamat Datang ke Rumah Terbuka",
  },
}

export function colorsFor(theme: Theme): ThemeColors {
  // A Gaya preset supplies a full inline palette; prefer it over the named one.
  if (theme.colors) return theme.colors
  return PALETTES[theme.palette] ?? PALETTES.plum_gold
}

export function fontFor(theme: Theme, kind: "display" | "body" | "script") {
  const name = theme.fonts[kind]
  if (!name) return undefined
  // Theme.fonts stores font CSS variable names (e.g. "--font-cormorant").
  if (kind === "body") return `var(${name}), sans-serif`
  if (kind === "script") return `var(${name}), cursive`
  return `var(${name}), serif`
}

export const DEFAULT_THEME: Theme = {
  palette: "amber_rose",
  fonts: {
    display: "--font-playfair",
    body: "--font-jakarta",
    script: "--font-great-vibes",
  },
  animation: "fade",
  background: { kind: "solid", value: "#fdf6ec" },
}
