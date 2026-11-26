/**
 * Template ids that `/templates/preview/[id]` can render from a hand-written
 * legacy component rather than from Section-v2 `theme` + `sections` in the DB.
 *
 * The gallery needs this list to decide whether a card gets a live preview, and
 * the preview route needs it to map an id to a component. Keeping the ids here
 * — and typing the route's map as `Record<LegacyPreviewId, ...>` — means the two
 * cannot drift: adding an id without wiring a component is a type error.
 */
export const LEGACY_PREVIEW_IDS = [
  "malay-wedding-v2",
  "chinese-wedding-v2",
  "general-wedding",
  "malay-wedding",
  "chinese-wedding",
  "minimalist",
  "birthday",
  "corporate",
] as const

export type LegacyPreviewId = (typeof LEGACY_PREVIEW_IDS)[number]

const LEGACY_PREVIEW_ID_SET: ReadonlySet<string> = new Set(LEGACY_PREVIEW_IDS)

export function isLegacyPreviewId(id: string): id is LegacyPreviewId {
  return LEGACY_PREVIEW_ID_SET.has(id)
}
