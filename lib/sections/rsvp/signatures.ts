import type { TemplateType, Theme } from "@/lib/types"
import { colorsFor, fontFor, type ThemeColors } from "@/lib/sections/theme"

/**
 * RSVP variant "signatures".
 *
 * The card carries a single cross-cutting `theme` (palette + fonts) that every
 * Section inherits. RSVP is the one block we deliberately let break out of that
 * theme: each variant ships its own *culturally-grounded* colour signature so a
 * "Double Happiness" RSVP reads unmistakably Chinese (crimson + gold) even when
 * it sits inside an otherwise sage-and-ivory card.
 *
 * This is intentional — see docs/RSVP_VARIANTS.md. A Malay + Chinese family can
 * pick a Walimah card and still drop a red-gold Chinese RSVP block for the other
 * side of the family. Variants are therefore **language/culture agnostic**: any
 * variant is available on any template; the editor only *recommends* the closest
 * match for the chosen event type.
 *
 * Colour research (sources in docs/RSVP_VARIANTS.md):
 *  - Chinese: red = luck/joy/prosperity, gold = wealth; white & black = mourning
 *    (avoided as dominant) → crimson + gold on warm ivory, never pure white.
 *  - Malay/Islamic: green = renewal/Islam, gold = royalty (songket benang emas)
 *    → songket emerald + gold on ivory.
 *  - Indian: marigold/saffron = the sun, brightness, auspiciousness; red = love;
 *    turmeric yellow = blessings → marigold + crimson + turmeric.
 */

export type RsvpAmbient =
  | "lanterns" // Chinese — drifting paper lanterns / embers
  | "petals_rose" // romance — soft rose petals
  | "petals_marigold" // Indian — marigold petals
  | "motes" // Malay — slow gold dust (songket shimmer)
  | "confetti" // joyful — rising confetti
  | "grid" // corporate — faint travelling grid lines
  | "none"

export type RsvpSignatureId =
  | "walimah"
  | "double_happiness"
  | "marigold"
  | "romance_envelope"
  | "confetti_pop"
  | "boardroom_badge"

type FontRoles = { display: string; body: string; script?: string }

export type RsvpSignature = {
  colors: ThemeColors
  /** Complementary jewel tone used for secondary accents / ambient particles. */
  accent2: string
  fonts: FontRoles
  ambient: RsvpAmbient
  /** Hero glyph for the success / header flourish. */
  glyph: string
  /** Template types this variant is the natural fit for (editor ordering only). */
  recommendedFor: TemplateType[]
}

const F = {
  playfair: "--font-playfair",
  cormorant: "--font-cormorant",
  jakarta: "--font-jakarta",
  greatVibes: "--font-great-vibes",
}

export const RSVP_SIGNATURES: Record<RsvpSignatureId, RsvpSignature> = {
  // Malay / Islamic — songket emerald + benang emas on ivory
  walimah: {
    colors: {
      bg: "#f6f1e4",
      text: "#22301f",
      accent: "#1f6b4f",
      gold: "#c9a227",
      muted: "#7e7a5e",
      border: "rgba(31,107,79,0.22)",
      card: "#fffdf6",
      divider: "✿",
      opening: "",
    },
    accent2: "#7c1f3a",
    fonts: { display: F.playfair, body: F.jakarta, script: F.greatVibes },
    ambient: "motes",
    glyph: "☾",
    recommendedFor: [
      "wedding_malay",
      "engagement_malay",
      "aqiqah",
      "cukur_jambul",
      "khatam_quran",
      "khenduri",
      "open_house_raya",
      "religious_gathering",
    ],
  },

  // Chinese — crimson lacquer + gold on warm rice-paper ivory (never white-dominant)
  double_happiness: {
    colors: {
      bg: "#fbf1e3",
      text: "#4a130c",
      accent: "#c1272d",
      gold: "#d4af37",
      muted: "#9c7a55",
      border: "rgba(193,39,45,0.26)",
      card: "#fffaf1",
      divider: "❧",
      opening: "",
    },
    accent2: "#7a0f12",
    fonts: { display: F.cormorant, body: F.jakarta, script: F.greatVibes },
    ambient: "lanterns",
    glyph: "囍",
    recommendedFor: ["wedding_chinese", "open_house_cny", "full_moon"],
  },

  // Indian — marigold/saffron + crimson + turmeric
  marigold: {
    colors: {
      bg: "#fff3df",
      text: "#5a230a",
      accent: "#d2691e",
      gold: "#e0a92e",
      muted: "#a3743f",
      border: "rgba(210,105,30,0.3)",
      card: "#fffaf0",
      divider: "❉",
      opening: "",
    },
    accent2: "#b0182b",
    fonts: { display: F.cormorant, body: F.jakarta, script: F.greatVibes },
    ambient: "petals_marigold",
    glyph: "✸",
    recommendedFor: ["wedding_indian", "open_house_deepavali"],
  },

  // General weddings / anniversaries — dusty rose + sage + ivory
  romance_envelope: {
    colors: {
      bg: "#faf5f1",
      text: "#43383a",
      accent: "#a9646f",
      gold: "#c4a882",
      muted: "#9a8a86",
      border: "rgba(169,100,111,0.24)",
      card: "#fffdfb",
      divider: "❦",
      opening: "",
    },
    accent2: "#6f8268",
    fonts: { display: F.cormorant, body: F.jakarta, script: F.greatVibes },
    ambient: "petals_rose",
    glyph: "♡",
    recommendedFor: [
      "wedding_general",
      "engagement_general",
      "anniversary",
      "baby_shower",
    ],
  },

  // Birthdays / graduations / reveals — bright, playful
  confetti_pop: {
    colors: {
      bg: "#fff7f9",
      text: "#3a2342",
      accent: "#ff5d8f",
      gold: "#ffd166",
      muted: "#9a8aa0",
      border: "rgba(255,93,143,0.3)",
      card: "#ffffff",
      divider: "✦",
      opening: "",
    },
    accent2: "#7ee0c6",
    fonts: { display: F.playfair, body: F.jakarta, script: F.greatVibes },
    ambient: "confetti",
    glyph: "🎉",
    recommendedFor: [
      "birthday_kids",
      "birthday_milestone",
      "graduation",
      "gender_reveal",
      "open_house_christmas",
    ],
  },

  // Corporate — ink + steel, one sharp accent, restrained motion
  boardroom_badge: {
    colors: {
      bg: "#f5f6f8",
      text: "#161a20",
      accent: "#26303f",
      gold: "#9aa3ad",
      muted: "#6b7480",
      border: "#d9dee5",
      card: "#ffffff",
      divider: "—",
      opening: "",
    },
    accent2: "#3b82f6",
    fonts: { display: F.cormorant, body: F.jakarta },
    ambient: "grid",
    glyph: "▦",
    recommendedFor: [
      "corporate_dinner",
      "corporate_launch",
      "workshop_seminar",
      "memorial",
    ],
  },
}

function familyFor(varName: string | undefined, kind: keyof FontRoles): string {
  if (!varName) return "var(--font-jakarta), system-ui, sans-serif"
  if (kind === "body") return `var(${varName}), system-ui, sans-serif`
  if (kind === "script") return `var(${varName}), cursive`
  return `var(${varName}), serif`
}

export type ResolvedRsvpTheme = {
  c: ThemeColors
  accent2: string
  fonts: { display: string; body: string; script: string }
  ambient: RsvpAmbient
  glyph: string
}

/**
 * Resolve the colours + fonts a variant should render with.
 *
 * By default a variant uses its own cultural signature (self-themed). When the
 * customer opts to "match the card's colours" (`inherit`), we fall back to the
 * card-level palette/fonts so the RSVP harmonises with the rest of the card —
 * the ambient motion + hero glyph still come from the variant so it keeps its
 * personality.
 */
export function resolveRsvpTheme(
  id: RsvpSignatureId,
  theme: Theme,
  opts?: { inherit?: boolean }
): ResolvedRsvpTheme {
  const sig = RSVP_SIGNATURES[id] ?? RSVP_SIGNATURES.walimah
  if (opts?.inherit) {
    return {
      c: colorsFor(theme),
      accent2: sig.accent2,
      fonts: {
        display: fontFor(theme, "display") || familyFor(sig.fonts.display, "display"),
        body: fontFor(theme, "body") || familyFor(sig.fonts.body, "body"),
        script:
          fontFor(theme, "script") ||
          fontFor(theme, "display") ||
          familyFor(sig.fonts.script, "script"),
      },
      ambient: sig.ambient,
      glyph: sig.glyph,
    }
  }
  return {
    c: sig.colors,
    accent2: sig.accent2,
    fonts: {
      display: familyFor(sig.fonts.display, "display"),
      body: familyFor(sig.fonts.body, "body"),
      script: familyFor(sig.fonts.script ?? sig.fonts.display, "script"),
    },
    ambient: sig.ambient,
    glyph: sig.glyph,
  }
}

/** Editor swatch (CSS gradient) per variant — mirrors the signature's hero hues. */
export function rsvpSwatch(id: RsvpSignatureId): string {
  const s = RSVP_SIGNATURES[id]
  if (!s) return "linear-gradient(135deg,#c9984a,#2c1a4a)"
  return `linear-gradient(135deg, ${s.colors.accent} 0%, ${s.colors.gold} 70%, ${s.accent2} 130%)`
}
