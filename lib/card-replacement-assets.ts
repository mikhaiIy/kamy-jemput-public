import {
  buildCardAssetReference,
  collectCardAssetPaths,
  isAllowedPublicStaticAssetReference,
  resolveCardAssetPath,
  type CardAssetContext,
} from "./card-assets"
import { getLandingImageReference } from "./sections/normalize-section-for-render"
import { isSectionCard, type CardData } from "./types"

export type ReplacementAssetPlan = {
  sourceObjectPath: string
  targetObjectPath: string
  sourceReference: string
  targetReference: string
}

export type ReplacementAssetContext = {
  sourceCardId: string
  sourceUserId: string | null
  targetCardId: string
  targetUserId: string | null
  knownStorageOrigin?: string
}

function sourceContext(input: ReplacementAssetContext): CardAssetContext {
  return {
    cardId: input.sourceCardId,
    userId: input.sourceUserId,
    knownStorageOrigin: input.knownStorageOrigin,
  }
}

function targetPathForSource(
  sourceObjectPath: string,
  input: ReplacementAssetContext,
): { objectPath: string; reference: string } | null {
  const segments = sourceObjectPath.split("/")
  if (segments.length === 3 && segments[0] === input.sourceCardId) {
    return {
      objectPath: `${input.targetCardId}/${segments[1]}/${segments[2]}`,
      reference: buildCardAssetReference(input.targetCardId, segments[1], segments[2]),
    }
  }
  if (segments.length === 3 && segments[0] === "covers") {
    return {
      objectPath: `${input.targetCardId}/legacy_covers/${segments[2]}`,
      reference: buildCardAssetReference(input.targetCardId, "legacy_covers", segments[2]),
    }
  }
  return null
}

function mapImageReference(value: unknown, input: ReplacementAssetContext): string {
  if (typeof value !== "string" || value.trim() === "") return ""
  const trimmed = value.trim()
  if (isAllowedPublicStaticAssetReference(trimmed)) return trimmed
  const resolved = resolveCardAssetPath(trimmed, sourceContext(input))
  if (!resolved) return ""
  return targetPathForSource(resolved.objectPath, input)?.reference ?? ""
}

function mapBackground(value: unknown, input: ReplacementAssetContext): string {
  if (typeof value !== "string" || !value.includes("url(")) {
    return typeof value === "string" ? value : ""
  }
  let invalid = false
  const pattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi
  const mapped = value.replace(pattern, (_match, doubleQuoted, singleQuoted, bare) => {
    const original = String(doubleQuoted ?? singleQuoted ?? bare ?? "").trim()
    const mappedReference = mapImageReference(original, input)
    if (!mappedReference) {
      invalid = true
      return ""
    }
    return `url("${mappedReference}")`
  })
  return invalid ? "" : mapped
}

/**
 * Copy the same known image fields used by the rendering and protected asset
 * boundaries. Unknown data is retained, but every predecessor-scoped image
 * reference in a known field is rewritten to the replacement card scope.
 */
export function remapReplacementCardData<T extends CardData>(
  data: T,
  input: ReplacementAssetContext,
): T {
  const next = JSON.parse(JSON.stringify(data)) as T
  if (isSectionCard(next)) {
    if (next.theme?.background) {
      next.theme.background.value = mapBackground(next.theme.background.value, input)
    }
    for (const section of next.sections) {
      if (!section || typeof section !== "object" || !section.data) continue
      const sectionData = section.data as unknown as Record<string, unknown>
      if (section.type === "landing") {
        sectionData.coverPhotoUrl = mapImageReference(
          getLandingImageReference(sectionData, section.variant),
          input,
        )
        if ("heroImageUrl" in sectionData) {
          sectionData.heroImageUrl = mapImageReference(sectionData.heroImageUrl, input)
        }
      }
      if (section.type === "child_info") {
        sectionData.photoUrl = mapImageReference(sectionData.photoUrl, input)
      }
      if (section.type === "corporate_speakers") {
        const speakers = Array.isArray(sectionData.speakers) ? sectionData.speakers : []
        sectionData.speakers = speakers.map((speaker) => {
          if (!speaker || typeof speaker !== "object") return speaker
          const copy = { ...(speaker as Record<string, unknown>) }
          copy.photoUrl = mapImageReference(copy.photoUrl, input)
          return copy
        })
      }
      if (section.type === "gallery") {
        const blocks = Array.isArray(sectionData.blocks) ? sectionData.blocks : []
        sectionData.blocks = blocks.map((block) => {
          if (!block || typeof block !== "object") return block
          const copy = { ...(block as Record<string, unknown>) }
          copy.photos = Array.isArray(copy.photos)
            ? copy.photos.map((photo) => mapImageReference(photo, input))
            : []
          return copy
        })
      }
      if (section.type === "love_story") {
        const moments = Array.isArray(sectionData.moments) ? sectionData.moments : []
        sectionData.moments = moments.map((moment) => {
          if (!moment || typeof moment !== "object") return moment
          const copy = { ...(moment as Record<string, unknown>) }
          copy.photoUrl = mapImageReference(copy.photoUrl, input)
          return copy
        })
      }
    }
    return next
  }

  next.coverPhotoUrl = mapImageReference(next.coverPhotoUrl, input)
  const galleryUrls = Array.isArray(next.galleryUrls) ? next.galleryUrls : []
  next.galleryUrls = galleryUrls.map((url) => mapImageReference(url, input))
  return next
}

/**
 * Build the deterministic source-to-target copy plan. The source set is
 * derived from the frozen publication snapshot, never from a live draft, and
 * therefore cannot widen access to unrelated predecessor objects.
 */
export function buildReplacementAssetPlan(
  sourceSnapshot: CardData,
  input: ReplacementAssetContext,
): ReplacementAssetPlan[] {
  const source = sourceContext(input)
  return [...collectCardAssetPaths(sourceSnapshot, source)]
    .map((sourceObjectPath) => {
      const target = targetPathForSource(sourceObjectPath, input)
      if (!target) return null
      const sourceSegments = sourceObjectPath.split("/")
      const sourceRelativeSegments =
        sourceSegments[0] === input.sourceCardId
          ? sourceSegments.slice(1)
          : sourceSegments
      return {
        sourceObjectPath,
        targetObjectPath: target.objectPath,
        sourceReference: `/api/card-assets/${input.sourceCardId}/${sourceRelativeSegments
          .map(encodeURIComponent)
          .join("/")}`,
        targetReference: target.reference,
      }
    })
    .filter((plan): plan is ReplacementAssetPlan => plan !== null)
}

/**
 * Owner edits may add replacement-scoped uploads after the initial copy. A
 * cutover may use those uploads, but it must never publish a predecessor or
 * arbitrary external asset reference. Re-running the normal known-field
 * remapper with the target as both scopes is a compact fail-closed check.
 */
export function isReplacementDraftAssetSafe(
  draft: CardData,
  input: { cardId: string; userId: string | null; knownStorageOrigin?: string },
): boolean {
  const normalized = remapReplacementCardData(draft, {
    sourceCardId: input.cardId,
    sourceUserId: input.userId,
    targetCardId: input.cardId,
    targetUserId: input.userId,
    knownStorageOrigin: input.knownStorageOrigin,
  })
  return JSON.stringify(normalized) === JSON.stringify(draft)
}
