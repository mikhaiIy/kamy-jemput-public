import type { CardData } from "./types"
import { getLandingImageReference } from "./sections/normalize-section-for-render.ts"

export const CARD_ASSETS_BUCKET = "card-assets"
export const CARD_ASSET_ROUTE_PREFIX = "/api/card-assets"
export const MAX_CARD_ASSET_BYTES = 5 * 1024 * 1024

export const CARD_ASSET_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

type CardAssetMimeType = (typeof CARD_ASSET_MIME_TYPES)[number]

export type CardAssetContext = {
  cardId: string
  userId?: string | null
  /** Override the configured Supabase origin in tests. */
  knownStorageOrigin?: string
}

export type CardAssetPath = {
  objectPath: string
  relativePath: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SECTION_RE = /^[a-z][a-z0-9_]{0,63}$/
const FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const BASE_URL = "http://card-asset-reference.invalid"
const CARD_ID_FOR_UNBOUND_REFERENCE_CHECK =
  "00000000-0000-4000-8000-000000000000"
const STATIC_ASSET_FILE_RE =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:avif|gif|jpe?g|png|svg|webp)$/i
const STATIC_ASSET_SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const KNOWN_PUBLIC_STATIC_FILES = new Set([
  "/file.svg",
  "/globe.svg",
  "/next.svg",
  "/vercel.svg",
  "/window.svg",
])

function isSectionCardData(data: unknown): data is Extract<CardData, { sections: unknown[] }> {
  return (
    typeof data === "object" &&
    data !== null &&
    "sections" in data &&
    Array.isArray((data as { sections?: unknown }).sections)
  )
}

export function isCardAssetId(value: string): boolean {
  return UUID_RE.test(value)
}

export function isAllowedCardAssetMimeType(
  value: string | null | undefined,
): value is CardAssetMimeType {
  return CARD_ASSET_MIME_TYPES.includes(value as CardAssetMimeType)
}

function decodeSegments(rawSegments: string[]): string[] | null {
  const segments: string[] = []
  for (const raw of rawSegments) {
    if (!raw || raw.length > 256) return null
    let decoded: string
    try {
      decoded = decodeURIComponent(raw)
    } catch {
      return null
    }
    if (
      !decoded ||
      decoded === "." ||
      decoded === ".." ||
      decoded.includes("/") ||
      decoded.includes("\\") ||
      decoded.includes("%") ||
      /[\u0000-\u001f\u007f]/.test(decoded)
    ) {
      return null
    }
    segments.push(decoded)
  }
  return segments
}

function isSafeFileName(value: string): boolean {
  if (!FILE_RE.test(value)) return false
  const extension = value.split(".").pop()?.toLowerCase() ?? ""
  return ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)
}

function normalizeRelativeSegments(
  cardId: string,
  rawSegments: string[],
  userId?: string | null,
): CardAssetPath | null {
  if (!isCardAssetId(cardId)) return null
  const segments = decodeSegments(rawSegments)
  if (!segments) return null

  if (
    segments.length === 2 &&
    SECTION_RE.test(segments[0]) &&
    isSafeFileName(segments[1])
  ) {
    return {
      objectPath: `${cardId}/${segments[0]}/${segments[1]}`,
      relativePath: `${segments[0]}/${segments[1]}`,
    }
  }

  if (
    segments.length === 3 &&
    segments[0] === "covers" &&
    isCardAssetId(segments[1]) &&
    (userId === undefined || userId === segments[1]) &&
    isSafeFileName(segments[2])
  ) {
    return {
      objectPath: segments.join("/"),
      relativePath: segments.join("/"),
    }
  }

  return null
}

function configuredStorageOrigin(context: CardAssetContext): string | null {
  const value = context.knownStorageOrigin ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.username || url.password || url.pathname !== "/" && url.pathname !== "") {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

/** Parse the route's path after `/api/card-assets/<cardId>/`. */
export function normalizeCardAssetRoutePath(
  cardId: string,
  rawSegments: string[],
  userId?: string | null,
): CardAssetPath | null {
  return normalizeRelativeSegments(cardId, rawSegments, userId)
}

function parseInternalReference(
  value: string,
  context: CardAssetContext,
): CardAssetPath | null {
  if (!value.startsWith(`${CARD_ASSET_ROUTE_PREFIX}/`)) return null

  let url: URL
  try {
    url = new URL(value, BASE_URL)
  } catch {
    return null
  }
  if (
    url.origin !== BASE_URL ||
    url.search ||
    url.hash ||
    !url.pathname.startsWith(`${CARD_ASSET_ROUTE_PREFIX}/`)
  ) {
    return null
  }

  const remainder = url.pathname.slice(`${CARD_ASSET_ROUTE_PREFIX}/`.length)
  const rawSegments = remainder.split("/")
  if (rawSegments.length < 3) return null

  let routeCardId: string
  try {
    routeCardId = decodeURIComponent(rawSegments[0])
  } catch {
    return null
  }
  if (routeCardId !== context.cardId) return null
  return normalizeRelativeSegments(context.cardId, rawSegments.slice(1), context.userId)
}

function parseUnboundInternalReference(value: string): CardAssetPath | null {
  if (!value.startsWith(`${CARD_ASSET_ROUTE_PREFIX}/`)) return null

  let url: URL
  try {
    url = new URL(value, BASE_URL)
  } catch {
    return null
  }
  if (
    url.origin !== BASE_URL ||
    url.search ||
    url.hash ||
    !url.pathname.startsWith(`${CARD_ASSET_ROUTE_PREFIX}/`)
  ) {
    return null
  }

  const rawSegments = url.pathname
    .slice(`${CARD_ASSET_ROUTE_PREFIX}/`.length)
    .split("/")
  if (rawSegments.length < 3) return null

  let routeCardId: string
  try {
    routeCardId = decodeURIComponent(rawSegments[0])
  } catch {
    return null
  }
  return normalizeRelativeSegments(routeCardId, rawSegments.slice(1))
}

function parseKnownPublicUrl(
  value: string,
  context: CardAssetContext,
): string[] | null {
  const origin = configuredStorageOrigin(context)
  if (!origin) return null

  // URL normalizers remove literal dot segments before exposing pathname.
  // Reject traversal markers in the raw input first so that normalization
  // cannot turn an unsafe request into a different valid object path.
  const rawAfterOrigin = value.startsWith(`${origin}/`) ? value.slice(origin.length) : ""
  if (
    !rawAfterOrigin ||
    /(?:^|\/)(?:\.{1,2})(?:\/|$)/.test(rawAfterOrigin) ||
    /%2e|%2f|%5c/i.test(rawAfterOrigin)
  ) {
    return null
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return null
  }

  const prefix = `/storage/v1/object/public/${CARD_ASSETS_BUCKET}/`
  if (!url.pathname.startsWith(prefix)) return null
  const path = url.pathname.slice(prefix.length)
  if (!path) return null
  return path.split("/")
}

/**
 * Resolve a stored reference to one validated Storage object path.
 *
 * The only accepted URL is the configured Supabase public-object origin for
 * the card-assets bucket. It is parsed locally and never fetched. New values
 * are already app-route references; old public URLs are accepted only for
 * this narrow compatibility path.
 */
export function resolveCardAssetPath(
  value: string,
  context: CardAssetContext,
): CardAssetPath | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const internal = parseInternalReference(trimmed, context)
  if (internal) return internal

  const publicPath = parseKnownPublicUrl(trimmed, context)
  if (!publicPath) return null

  const decoded = decodeSegments(publicPath)
  if (!decoded) return null

  if (decoded.length === 3 && decoded[0] === context.cardId) {
    return normalizeRelativeSegments(context.cardId, decoded.slice(1), context.userId)
  }
  return normalizeRelativeSegments(context.cardId, decoded, context.userId)
}

/**
 * Allow only the app's deliberately public static image namespace. This is
 * separate from customer `card-assets`: it preserves seeded template
 * thumbnails and the repository's public placeholder SVGs without allowing a
 * caller to turn an arbitrary URL or relative path into a customer image.
 */
export function isAllowedPublicStaticAssetReference(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("/")) return false
  if (
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#") ||
    /(?:^|\/)(?:\.{1,2})(?:\/|$)/.test(value) ||
    /%2e|%2f|%5c/i.test(value)
  ) {
    return false
  }
  if (KNOWN_PUBLIC_STATIC_FILES.has(value)) return true
  if (!value.startsWith("/templates/")) return false

  const segments = value.slice("/templates/".length).split("/")
  if (segments.length < 2 || segments.length > 8) return false
  const fileName = segments.at(-1) ?? ""
  if (!STATIC_ASSET_FILE_RE.test(fileName)) return false
  return segments
    .slice(0, -1)
    .every((segment) => STATIC_ASSET_SEGMENT_RE.test(segment))
}

/**
 * Syntactic validation for image fields at the editor schema boundary.
 * Authorization is intentionally not performed here: the protected route
 * re-checks the exact card, owner/admin identity, publication state and frozen
 * snapshot before streaming bytes.
 */
export function isAllowedCardImageReference(
  value: unknown,
  options: { knownStorageOrigin?: string } = {},
): value is string {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed) return true
  if (isAllowedPublicStaticAssetReference(trimmed)) return true
  if (parseUnboundInternalReference(trimmed)) return true

  const publicPath = parseKnownPublicUrl(trimmed, {
    cardId: CARD_ID_FOR_UNBOUND_REFERENCE_CHECK,
    knownStorageOrigin: options.knownStorageOrigin,
  })
  if (!publicPath) return false
  const decoded = decodeSegments(publicPath)
  if (!decoded) return false
  if (decoded.length === 3 && isCardAssetId(decoded[0])) {
    return normalizeRelativeSegments(decoded[0], decoded.slice(1)) !== null
  }
  return normalizeRelativeSegments(
    CARD_ID_FOR_UNBOUND_REFERENCE_CHECK,
    decoded,
  ) !== null
}

export function buildCardAssetReference(
  cardId: string,
  sectionType: string,
  fileName: string,
): string {
  const parsed = normalizeRelativeSegments(cardId, [sectionType, fileName])
  if (!parsed) throw new Error("Invalid card asset reference")
  return `${CARD_ASSET_ROUTE_PREFIX}/${encodeURIComponent(cardId)}/${parsed.relativePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`
}

export function normalizeCardAssetReference(
  value: string,
  context: CardAssetContext,
): string | null {
  const resolved = resolveCardAssetPath(value, context)
  if (!resolved) return null
  return `${CARD_ASSET_ROUTE_PREFIX}/${encodeURIComponent(context.cardId)}/${resolved.relativePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`
}

function forEachCssUrl(value: string, visit: (url: string) => void): void {
  const cssUrlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi
  for (const match of value.matchAll(cssUrlPattern)) {
    visit((match[1] ?? match[2] ?? match[3] ?? "").trim())
  }
}

function mapAsset(value: unknown, context: CardAssetContext): string {
  if (typeof value !== "string" || value.trim() === "") return ""
  return (
    normalizeCardAssetReference(value, context) ??
    (isAllowedPublicStaticAssetReference(value.trim()) ? value.trim() : "")
  )
}

function mapBackground(value: unknown, context: CardAssetContext): string {
  if (typeof value !== "string" || !value.includes("url(")) {
    return typeof value === "string" ? value : ""
  }

  let invalid = false
  const cssUrlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi
  const mapped = value.replace(cssUrlPattern, (_match, doubleQuoted, singleQuoted, bare) => {
    const original = String(doubleQuoted ?? singleQuoted ?? bare ?? "").trim()
    const normalized =
      normalizeCardAssetReference(original, context) ??
      (isAllowedPublicStaticAssetReference(original) ? original : null)
    if (!normalized) {
      invalid = true
      return ""
    }
    return `url("${normalized}")`
  })
  return invalid ? "" : mapped
}

function visitSectionAssets(
  section: { type: string; variant?: string; data: Record<string, unknown> },
  visit: (value: string) => void,
): void {
  if (!section || !section.data || typeof section.data !== "object") return
  if (section.type === "landing") {
    visit(String(getLandingImageReference(section.data, section.variant) ?? ""))
  }
  if (section.type === "child_info") {
    visit(String(section.data.photoUrl ?? ""))
  }
  if (section.type === "corporate_speakers") {
    const speakers = Array.isArray(section.data.speakers) ? section.data.speakers : []
    for (const speaker of speakers) {
      if (speaker && typeof speaker === "object") {
        visit(String((speaker as Record<string, unknown>).photoUrl ?? ""))
      }
    }
  }
  if (section.type === "gallery") {
    const blocks = Array.isArray(section.data.blocks) ? section.data.blocks : []
    for (const block of blocks) {
      if (!block || typeof block !== "object") continue
      const photos = (block as Record<string, unknown>).photos
      if (Array.isArray(photos)) {
        for (const photo of photos) visit(String(photo ?? ""))
      }
    }
  }
  if (section.type === "love_story") {
    const moments = Array.isArray(section.data.moments) ? section.data.moments : []
    for (const moment of moments) {
      if (moment && typeof moment === "object") {
        visit(String((moment as Record<string, unknown>).photoUrl ?? ""))
      }
    }
  }
}

function visitCardAssets(data: CardData | null | undefined, visit: (value: string) => void): void {
  if (!data || typeof data !== "object") return
  if (isSectionCardData(data)) {
    const background = data.theme?.background?.value
    if (typeof background === "string") forEachCssUrl(background, visit)
    for (const section of data.sections) {
      if (!section || typeof section !== "object") continue
      visitSectionAssets(
        section as unknown as {
          type: string
          variant?: string
          data: Record<string, unknown>
        },
        visit,
      )
    }
    return
  }
  visit(data.coverPhotoUrl ?? "")
  const galleryUrls = Array.isArray(data.galleryUrls) ? data.galleryUrls : []
  for (const url of galleryUrls) visit(url)
}

export function collectCardAssetPaths(
  data: CardData | null | undefined,
  context: CardAssetContext,
): Set<string> {
  const paths = new Set<string>()
  visitCardAssets(data, (value) => {
    const resolved = resolveCardAssetPath(value, context)
    if (resolved) paths.add(resolved.objectPath)
  })
  return paths
}

/**
 * Convert only known customer-image fields to the protected app endpoint.
 * Unknown URLs become empty values, preventing arbitrary remote image fetches
 * in every renderer while leaving map/contact links untouched.
 */
export function resolveCardDataAssetUrls<T extends CardData>(
  data: T,
  context: CardAssetContext,
): T {
  const next = JSON.parse(JSON.stringify(data)) as T
  if (isSectionCardData(next)) {
    if (next.theme?.background) {
      next.theme.background.value = mapBackground(next.theme.background.value, context)
    }
    for (const section of next.sections) {
      if (!section || typeof section !== "object" || !section.data) continue
      const sectionData = section.data as unknown as Record<string, unknown>
      if (section.type === "landing") {
        sectionData.coverPhotoUrl = mapAsset(
          getLandingImageReference(sectionData, section.variant),
          context,
        )
      }
      if (section.type === "child_info") {
        sectionData.photoUrl = mapAsset(sectionData.photoUrl, context)
      }
      if (section.type === "corporate_speakers") {
        const speakers = Array.isArray(sectionData.speakers) ? sectionData.speakers : []
        sectionData.speakers = speakers.map((speaker) => {
          if (!speaker || typeof speaker !== "object") return speaker
          const copy = { ...(speaker as Record<string, unknown>) }
          copy.photoUrl = mapAsset(copy.photoUrl, context)
          return copy
        })
      }
      if (section.type === "gallery") {
        const blocks = Array.isArray(sectionData.blocks) ? sectionData.blocks : []
        sectionData.blocks = blocks.map((block) => {
          if (!block || typeof block !== "object") return block
          const copy = { ...(block as Record<string, unknown>) }
          copy.photos = Array.isArray(copy.photos)
            ? copy.photos.map((photo) => mapAsset(photo, context))
            : []
          return copy
        })
      }
      if (section.type === "love_story") {
        const moments = Array.isArray(sectionData.moments) ? sectionData.moments : []
        sectionData.moments = moments.map((moment) => {
          if (!moment || typeof moment !== "object") return moment
          const copy = { ...(moment as Record<string, unknown>) }
          copy.photoUrl = mapAsset(copy.photoUrl, context)
          return copy
        })
      }
    }
    return next
  }

  next.coverPhotoUrl = mapAsset(next.coverPhotoUrl, context)
  const galleryUrls = Array.isArray(next.galleryUrls) ? next.galleryUrls : []
  next.galleryUrls = galleryUrls.map((url) => mapAsset(url, context))
  return next
}
