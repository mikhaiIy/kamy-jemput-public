import type {
  Theme,
  ThemeColors,
  ThemePalette,
  TemplateType,
  SectionType,
  SectionInstance,
} from "@/lib/types"

/**
 * Template-level "Gaya" presets.
 *
 * Where the RSVP section self-themes per *variant* (lib/sections/rsvp/
 * signatures.ts), a Gaya preset themes the **whole card**: one pick swaps the
 * card's palette + fonts + background + animation cohesively, because every
 * Section reads `data.theme` through `colorsFor()` / `fontFor()`.
 *
 * Presets carry a full inline `ThemeColors` (so we aren't limited to the 6 named
 * palettes) plus a `palette` fallback key for older code paths. Choosing a Gaya
 * sets `theme.colors`, `theme.fonts`, `theme.preset`, etc. via `applyPreset()`.
 *
 * Culture-agnostic, like the RSVP variants: every Gaya is selectable on every
 * template. `recommendedFor` only orders the editor gallery + shows a badge.
 * See docs/TEMPLATE_GAYA.md.
 */

const F = {
  cormorant: "--font-cormorant",
  playfair: "--font-playfair",
  jakarta: "--font-jakarta",
  greatVibes: "--font-great-vibes",
  cinzel: "--font-cinzel",
  fraunces: "--font-fraunces",
  dancing: "--font-dancing",
  bodoni: "--font-bodoni",
}

export type ThemePreset = {
  id: string
  label: string
  hint: string
  /** Legacy named-palette fallback (for any code path not using inline colours). */
  palette: ThemePalette
  colors: ThemeColors
  fonts: { display: string; body: string; script?: string }
  animation: Theme["animation"]
  /** CSS-renderable surface painted behind every Section in the Section stack
   *  (see components/SectionInvitationCard.tsx). Persisted to `theme.background`
   *  by `applyPreset()` alongside the palette, fonts, and animation. */
  background: Theme["background"]
  recommendedFor: TemplateType[]
  /** Section variants this Gaya suggests. Applied to a card's sections that the
   *  customer hasn't manually re-picked (see applyGayaSections). Mainly the RSVP
   *  cultural variant; other sections can be added over time. */
  sectionVariants?: Partial<Record<SectionType, string>>
}

function solid(value: string): Theme["background"] {
  return { kind: "solid", value }
}

/** A layered CSS background (gradients / repeating patterns) over the base.
 *  `value` is a full CSS `background` shorthand; per-layer positions can be
 *  embedded directly in the layer list. */
function pattern(value: string): Theme["background"] {
  return { kind: "pattern", value }
}

/** Opaque base layer for the bottom of a layered background shorthand. */
function solidGradient(color: string): string {
  return `linear-gradient(${color}, ${color})`
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  // ---- Malay / Islamic --------------------------------------------------
  songket_emerald: {
    id: "songket_emerald",
    label: "Songket Zamrud",
    hint: "Emerald & gold",
    palette: "pastel_green_gold",
    colors: {
      bg: "#f6f1e4", text: "#22301f", accent: "#1f6b4f", gold: "#c9a227",
      muted: "#7e7a5e", border: "rgba(31,107,79,0.22)", card: "#fffdf6",
      divider: "✿", opening: "Dengan penuh kesyukuran",
    },
    fonts: { display: F.playfair, body: F.jakarta, script: F.greatVibes },
    animation: "particles",
    // Songket weave: fine gold diagonal threads over the cream base.
    background: pattern(
      `repeating-linear-gradient(45deg, rgba(201,162,39,0.08) 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, rgba(31,107,79,0.07) 0 2px, transparent 2px 14px), ${solidGradient("#f6f1e4")}`
    ),
    recommendedFor: [
      "wedding_malay", "engagement_malay", "aqiqah", "cukur_jambul",
      "khatam_quran", "khenduri", "open_house_raya", "religious_gathering",
    ],
    sectionVariants: { rsvp: "walimah" },
  },
  royal_maroon: {
    id: "royal_maroon",
    label: "Diraja Marun",
    hint: "Royal maroon & gold",
    palette: "plum_gold",
    colors: {
      bg: "#faf4ee", text: "#3a1822", accent: "#6e1530", gold: "#c9a227",
      muted: "#9a7a78", border: "rgba(110,21,48,0.22)", card: "#fffdfa",
      divider: "❦", opening: "Dengan penuh kesyukuran",
    },
    fonts: { display: F.cinzel, body: F.jakarta, script: F.greatVibes },
    animation: "ken_burns",
    // Royal vignette: deep maroon glow pooling in the corners.
    background: pattern(
      `radial-gradient(120% 90% at 50% 0%, rgba(110,21,48,0.10), transparent 60%), radial-gradient(120% 90% at 50% 100%, rgba(110,21,48,0.12), transparent 60%), ${solidGradient("#faf4ee")}`
    ),
    recommendedFor: ["wedding_malay", "engagement_malay", "khenduri"],
    sectionVariants: { rsvp: "walimah" },
  },
  amber_classic: {
    id: "amber_classic",
    label: "Klasik Amber",
    hint: "Warm amber & cream",
    palette: "amber_rose",
    colors: {
      bg: "#fdf6ec", text: "#3a2010", accent: "#92450a", gold: "#c9984a",
      muted: "#a08878", border: "rgba(201,152,74,0.4)", card: "rgba(255,252,242,0.92)",
      divider: "✦", opening: "Bismillahirrahmanirrahim",
    },
    fonts: { display: F.playfair, body: F.jakarta, script: F.greatVibes },
    animation: "fade",
    background: pattern(
      `linear-gradient(180deg, #fdf6ec 0%, #f8ecd8 55%, #f3e2c4 100%)`
    ),
    recommendedFor: ["wedding_malay", "open_house_raya", "engagement_malay"],
    sectionVariants: { rsvp: "walimah" },
  },

  // ---- Chinese ----------------------------------------------------------
  crimson_lacquer: {
    id: "crimson_lacquer",
    label: "Merah Berlaka",
    hint: "Crimson lacquer & gold",
    palette: "red_gold",
    colors: {
      bg: "#fbf1e3", text: "#4a130c", accent: "#c1272d", gold: "#d4af37",
      muted: "#9c7a55", border: "rgba(193,39,45,0.26)", card: "#fffaf1",
      divider: "❧", opening: "囍 Our Wedding 囍",
    },
    fonts: { display: F.cormorant, body: F.jakarta, script: F.greatVibes },
    animation: "particles",
    // Lacquer lattice: faint gold diamond grid over warm ivory.
    background: pattern(
      `repeating-linear-gradient(60deg, rgba(212,175,55,0.07) 0 1px, transparent 1px 22px), repeating-linear-gradient(-60deg, rgba(212,175,55,0.07) 0 1px, transparent 1px 22px), ${solidGradient("#fbf1e3")}`
    ),
    recommendedFor: ["wedding_chinese", "open_house_cny", "full_moon"],
    sectionVariants: { rsvp: "double_happiness" },
  },
  imperial_gold: {
    id: "imperial_gold",
    label: "Emas Diraja",
    hint: "Ink, ivory & imperial gold",
    palette: "red_gold",
    colors: {
      bg: "#faf5e9", text: "#241d12", accent: "#1d1a14", gold: "#c8a13a",
      muted: "#8c7a55", border: "rgba(200,161,58,0.35)", card: "#fffdf6",
      divider: "❖", opening: "囍",
    },
    fonts: { display: F.cinzel, body: F.jakarta },
    animation: "ken_burns",
    // Imperial silk: soft gold sheen sweeping the ivory field.
    background: pattern(
      `radial-gradient(140% 80% at 20% 10%, rgba(200,161,58,0.12), transparent 55%), radial-gradient(140% 80% at 85% 90%, rgba(200,161,58,0.10), transparent 55%), ${solidGradient("#faf5e9")}`
    ),
    recommendedFor: ["wedding_chinese", "full_moon", "open_house_cny"],
    sectionVariants: { rsvp: "double_happiness" },
  },

  // ---- Indian -----------------------------------------------------------
  marigold_saffron: {
    id: "marigold_saffron",
    label: "Marigold",
    hint: "Marigold, saffron & crimson",
    palette: "amber_rose",
    colors: {
      bg: "#fff3df", text: "#5a230a", accent: "#d2691e", gold: "#e0a92e",
      muted: "#a3743f", border: "rgba(210,105,30,0.3)", card: "#fffaf0",
      divider: "❉", opening: "Shubh Vivah",
    },
    fonts: { display: F.fraunces, body: F.jakarta, script: F.greatVibes },
    animation: "particles",
    // Marigold warmth: saffron glow rising from below.
    background: pattern(
      `radial-gradient(120% 70% at 50% 105%, rgba(224,169,46,0.20), transparent 60%), radial-gradient(100% 60% at 50% -10%, rgba(210,105,30,0.10), transparent 55%), ${solidGradient("#fff3df")}`
    ),
    recommendedFor: ["wedding_indian", "open_house_deepavali"],
    sectionVariants: { rsvp: "marigold" },
  },

  // ---- General weddings / celebrations ----------------------------------
  sakura_blush: {
    id: "sakura_blush",
    label: "Sakura Blush",
    hint: "Cherry-blossom pink & dusty blue",
    palette: "sage_ivory",
    colors: {
      // Modelled on jestudio's cherry-blossom demo: white page, blush pink
      // headings, dusty-blue secondary text, antique-gold hairlines.
      bg: "#fffafb", text: "#4a3a40", accent: "#e8637f", gold: "#c9a23c",
      muted: "#7ab3c8", border: "rgba(232,99,127,0.22)", card: "#ffffff",
      divider: "✿", opening: "You are invited!",
    },
    fonts: { display: F.cormorant, body: F.jakarta, script: F.dancing },
    animation: "particles",
    // Blossom haze: blush blooms drifting across white.
    background: pattern(
      `radial-gradient(38% 30% at 15% 12%, rgba(232,99,127,0.10), transparent 70%), radial-gradient(42% 34% at 88% 28%, rgba(122,179,200,0.10), transparent 70%), radial-gradient(40% 32% at 70% 92%, rgba(232,99,127,0.08), transparent 70%), ${solidGradient("#fffafb")}`
    ),
    recommendedFor: [
      "wedding_general", "wedding_chinese", "engagement_general", "anniversary",
    ],
    sectionVariants: {
      rsvp: "romance_envelope",
      landing: "sakura_depth",
      gallery: "designer",
      calendar: "month_grid",
    },
  },
  midnight_celestial: {
    id: "midnight_celestial",
    label: "Malam Berbintang",
    hint: "Midnight indigo & starlight gold",
    palette: "plum_gold",
    colors: {
      // The catalogue's first dark palette — the whole card is one night sky
      // (see docs/DESIGN_CELESTIAL_STORY.md). Panels are a slightly lighter
      // navy so they read as cards without breaking the sky; muted is a dusty
      // periwinkle so secondary text stays soft against the indigo.
      bg: "#101528", text: "#eae4d6", accent: "#e8c97e", gold: "#c9a96a",
      muted: "#8d97b8", border: "rgba(232,201,126,0.22)", card: "#171f3a",
      divider: "✦", opening: "Written in the stars",
    },
    fonts: { display: F.cormorant, body: F.jakarta, script: F.greatVibes },
    animation: "particles",
    // Night sky: indigo deepening toward the horizon.
    background: pattern(
      `radial-gradient(130% 70% at 50% -10%, rgba(232,201,126,0.10), transparent 55%), linear-gradient(180deg, #171f3a 0%, #101528 45%, #0b1020 100%)`
    ),
    recommendedFor: [
      "wedding_general", "wedding_malay", "engagement_general", "anniversary",
    ],
    sectionVariants: {
      rsvp: "romance_envelope",
      landing: "celestial_gate",
      love_story: "constellation",
      countdown: "lunar_phases",
      calendar: "month_grid",
    },
  },
  editorial_cinema: {
    id: "editorial_cinema",
    label: "Sinema Editorial",
    hint: "Putih editorial, dakwat & emas filem",
    palette: "minimal_ink",
    colors: {
      // Modelled on jestudio's episode-one demo: off-white page, near-black
      // ink headings in a high-contrast didone, muted antique gold for the
      // hairlines and credit lines. The card reads as a film programme.
      bg: "#fafaf9", text: "#1a1a1a", accent: "#0d0d0d", gold: "#b8a070",
      muted: "#888880", border: "rgba(13,13,13,0.14)", card: "#f5f4f2",
      divider: "✳", opening: "A Wedding Production",
    },
    fonts: { display: F.bodoni, body: F.jakarta, script: F.bodoni },
    animation: "none",
    background: solid("#fafaf9"),
    recommendedFor: [
      "wedding_general", "wedding_chinese", "engagement_general", "anniversary",
    ],
    sectionVariants: {
      rsvp: "romance_envelope",
      landing: "premiere_gate",
      love_story: "film_episodes",
      countdown: "film_leader",
      gallery: "designer",
      calendar: "month_grid",
    },
  },
  blush_romance: {
    id: "blush_romance",
    label: "Blush Romance",
    hint: "Dusty rose & ivory",
    palette: "sage_ivory",
    colors: {
      bg: "#faf5f1", text: "#43383a", accent: "#a9646f", gold: "#c4a882",
      muted: "#9a8a86", border: "rgba(169,100,111,0.24)", card: "#fffdfb",
      divider: "❦", opening: "Join us as we celebrate",
    },
    fonts: { display: F.cormorant, body: F.jakarta, script: F.greatVibes },
    animation: "fade",
    // Rose veil: dusty rose light from above.
    background: pattern(
      `radial-gradient(120% 60% at 50% -5%, rgba(169,100,111,0.12), transparent 60%), ${solidGradient("#faf5f1")}`
    ),
    recommendedFor: [
      "wedding_general", "engagement_general", "anniversary", "baby_shower",
    ],
    sectionVariants: { rsvp: "romance_envelope" },
  },
  garden_sage: {
    id: "garden_sage",
    label: "Taman Sage",
    hint: "Botanical sage & gold",
    palette: "pastel_green_gold",
    colors: {
      bg: "#f3f7ee", text: "#2d3a2c", accent: "#5a7a4a", gold: "#c9984a",
      muted: "#8a957a", border: "#d8dcce", card: "#ffffff",
      divider: "❦", opening: "Join us as we celebrate",
    },
    fonts: { display: F.cormorant, body: F.jakarta, script: F.greatVibes },
    animation: "ken_burns",
    // Botanical wash: sage light filtering diagonally.
    background: pattern(
      `linear-gradient(160deg, rgba(90,122,74,0.10) 0%, transparent 45%, rgba(201,152,74,0.08) 100%), ${solidGradient("#f3f7ee")}`
    ),
    recommendedFor: [
      "wedding_general", "baby_shower", "anniversary", "engagement_general",
    ],
    sectionVariants: { rsvp: "romance_envelope" },
  },
  confetti_bright: {
    id: "confetti_bright",
    label: "Ceria",
    hint: "Bright & playful",
    palette: "amber_rose",
    colors: {
      bg: "#fff7f9", text: "#3a2342", accent: "#ff5d8f", gold: "#ffd166",
      muted: "#9a8aa0", border: "rgba(255,93,143,0.3)", card: "#ffffff",
      divider: "✦", opening: "You are invited",
    },
    fonts: { display: F.fraunces, body: F.jakarta },
    animation: "particles",
    // Confetti dots: playful pink/gold sprinkles on white.
    background: pattern(
      `radial-gradient(rgba(255,93,143,0.16) 2px, transparent 2.5px) 0 0 / 36px 36px, radial-gradient(rgba(255,209,102,0.20) 2px, transparent 2.5px) 18px 18px / 36px 36px, ${solidGradient("#fff7f9")}`
    ),
    recommendedFor: [
      "birthday_kids", "birthday_milestone", "gender_reveal", "graduation",
      "open_house_christmas", "baby_shower",
    ],
    sectionVariants: { rsvp: "confetti_pop" },
  },

  // ---- Corporate / minimal ----------------------------------------------
  boardroom_ink: {
    id: "boardroom_ink",
    label: "Korporat",
    hint: "Ink & steel",
    palette: "minimal_ink",
    colors: {
      bg: "#f5f6f8", text: "#161a20", accent: "#26303f", gold: "#9aa3ad",
      muted: "#6b7480", border: "#d9dee5", card: "#ffffff",
      divider: "—", opening: "You are invited",
    },
    fonts: { display: F.cinzel, body: F.jakarta },
    animation: "none",
    background: solid("#f5f6f8"),
    recommendedFor: ["corporate_dinner", "corporate_launch", "workshop_seminar"],
    sectionVariants: { rsvp: "boardroom_badge" },
  },
  minimal_mono: {
    id: "minimal_mono",
    label: "Minimalis",
    hint: "Quiet ivory & ink",
    palette: "minimal_ink",
    colors: {
      bg: "#fafafa", text: "#1a1a1a", accent: "#1a1a1a", gold: "#888888",
      muted: "#666666", border: "#e0e0e0", card: "#ffffff",
      divider: "—", opening: "You are invited",
    },
    fonts: { display: F.fraunces, body: F.jakarta },
    animation: "none",
    background: solid("#fafafa"),
    recommendedFor: ["memorial", "wedding_general", "religious_gathering", "corporate_dinner"],
    sectionVariants: { rsvp: "boardroom_badge" },
  },
}

export const PRESET_LIST: ThemePreset[] = Object.values(THEME_PRESETS)

/** Editor swatch (CSS gradient) mirroring a preset's hero hues. */
export function themeSwatch(p: ThemePreset): string {
  return `linear-gradient(135deg, ${p.colors.accent} 0%, ${p.colors.gold} 70%, ${p.colors.bg} 130%)`
}

export function isRecommendedPreset(
  p: ThemePreset,
  type: TemplateType | null
): boolean {
  return !!(type && p.recommendedFor.includes(type))
}

/** All presets, recommended-for-`type` first (stable within each group). */
export function presetsForType(type: TemplateType | null): ThemePreset[] {
  return [...PRESET_LIST].sort(
    (a, b) => Number(isRecommendedPreset(b, type)) - Number(isRecommendedPreset(a, type))
  )
}

/** Apply a Gaya preset onto the current theme, preserving unrelated fields. */
export function applyPreset(current: Theme, preset: ThemePreset): Theme {
  return {
    ...current,
    palette: preset.palette,
    colors: preset.colors,
    preset: preset.id,
    fonts: { ...preset.fonts },
    animation: preset.animation,
    background: preset.background,
  }
}

/**
 * Apply a Gaya's suggested section variants — but only to sections the customer
 * hasn't manually re-picked (`variantAuto === false` locks a section). Sections
 * touched here are marked `variantAuto: true` so a later Gaya can re-suggest.
 */
export function applyGayaSections(
  sections: SectionInstance[],
  preset: ThemePreset
): SectionInstance[] {
  const map = preset.sectionVariants
  if (!map) return sections
  return sections.map((s) => {
    const suggested = map[s.type as SectionType]
    const locked = s.variantAuto === false
    if (suggested && !locked && s.variant !== suggested) {
      return { ...s, variant: suggested, variantAuto: true }
    }
    return s
  })
}
