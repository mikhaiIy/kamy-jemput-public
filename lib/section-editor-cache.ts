import type { SectionCardData } from "./types"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function isValidSectionCardData(value: unknown): value is SectionCardData {
  if (!isRecord(value)) return false
  if (typeof value.templateId !== "string" || value.templateId.trim() === "") {
    return false
  }
  if (hasOwn(value, "schemaVersion") && value.schemaVersion !== 2) {
    return false
  }

  const theme = value.theme
  if (!isRecord(theme) || !isRecord(theme.fonts)) return false
  if (
    typeof theme.fonts.display !== "string" ||
    typeof theme.fonts.body !== "string" ||
    (hasOwn(theme.fonts, "script") && typeof theme.fonts.script !== "string")
  ) {
    return false
  }

  if (!Array.isArray(value.sections)) return false
  return value.sections.every((section) => {
    if (!isRecord(section)) return false
    return (
      typeof section.type === "string" &&
      typeof section.variant === "string" &&
      typeof section.enabled === "boolean" &&
      Number.isSafeInteger(section.order) &&
      isRecord(section.data) &&
      (!hasOwn(section, "variantAuto") || typeof section.variantAuto === "boolean")
    )
  })
}

function isValidDraftVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1
}

/**
 * Decode one Section editor localStorage value.
 *
 * Any object carrying either envelope key is treated as a versioned envelope,
 * including incomplete/malformed envelopes. This prevents an old envelope
 * from being mistaken for legacy raw SectionCardData. Raw caches are retained
 * only for unpaid editing; paid drafts require a matching version envelope.
 */
export function restoreSectionEditorCache(
  cached: string,
  paidDraft: boolean,
  currentDraftVersion: number,
): SectionCardData | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(cached)
  } catch {
    return null
  }

  if (!isRecord(parsed)) return null

  const isVersionedEnvelope = hasOwn(parsed, "data") || hasOwn(parsed, "draftVersion")
  if (isVersionedEnvelope) {
    if (
      !isValidDraftVersion(parsed.draftVersion) ||
      parsed.draftVersion !== currentDraftVersion
    ) {
      return null
    }
    return isValidSectionCardData(parsed.data) ? parsed.data : null
  }

  if (paidDraft) return null
  return isValidSectionCardData(parsed) ? parsed : null
}
