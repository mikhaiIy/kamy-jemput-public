import type { SectionDataMap, SectionInstance } from "@/lib/types"

const COMPATIBLE_LANDING_VARIANTS = new Set([
  "photo_hero",
  "minimalist",
  "kinetic_hero",
])

type LegacyLocalisedText =
  | string
  | {
      primary?: unknown
    }

type LegacyLandingData = Partial<SectionDataMap["landing"]> & {
  eventTitle?: LegacyLocalisedText
  hostNames?: LegacyLocalisedText
  heroImageUrl?: unknown
  eyebrow?: LegacyLocalisedText
  openButtonLabel?: LegacyLocalisedText
}

/**
 * Return the stored Landing image reference at the render boundary.
 *
 * `heroImageUrl` is the pre-Section-v2 name. A present `coverPhotoUrl` wins,
 * including an explicit empty string; this preserves the current-field
 * precedence used by the editor while keeping old records renderable.
 */
export function getLandingImageReference(
  data: { coverPhotoUrl?: unknown; heroImageUrl?: unknown },
  variant?: string,
): string | undefined {
  if (typeof data.coverPhotoUrl === "string") return data.coverPhotoUrl
  if (variant !== undefined && !COMPATIBLE_LANDING_VARIANTS.has(variant)) {
    return undefined
  }
  return typeof data.heroImageUrl === "string" ? data.heroImageUrl : undefined
}

function legacyText(value: LegacyLocalisedText | undefined): string | undefined {
  if (typeof value === "string") return value
  return typeof value?.primary === "string" ? value.primary : undefined
}

/**
 * Adapt stored Landing data only for the three variants that changed contract.
 * This is a render-only copy. It does not mutate the draft or the database.
 */
export function normalizeSectionForRender(
  section: SectionInstance
): SectionInstance {
  if (
    section.type !== "landing" ||
    !COMPATIBLE_LANDING_VARIANTS.has(section.variant)
  ) {
    return section
  }

  const data = section.data as LegacyLandingData
  const additions: Partial<SectionDataMap["landing"]> = {}

  if (typeof data.headline !== "string") {
    additions.headline = legacyText(data.eventTitle)
  }
  if (typeof data.subhead !== "string") {
    additions.subhead = legacyText(data.hostNames)
  }
  if (typeof data.coverPhotoUrl !== "string") {
    const imageReference = getLandingImageReference(data, section.variant)
    if (imageReference !== undefined) {
      additions.coverPhotoUrl = imageReference
    }
  }
  if (typeof data.tagline !== "string") {
    additions.tagline = legacyText(data.eyebrow)
  }

  const mappedEntries = Object.entries(additions).filter(
    ([, value]) => value !== undefined
  )
  if (mappedEntries.length === 0) return section

  return {
    ...section,
    data: {
      ...data,
      ...Object.fromEntries(mappedEntries),
    },
  } as SectionInstance
}
