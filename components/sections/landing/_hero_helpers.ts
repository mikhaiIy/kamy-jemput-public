// Shared hero helpers — extracted from landing/index.tsx so additional hero
// variant files (story_heroes.tsx) can use them without a circular import.

export function splitHeadline(headline: string): { left: string; right: string | null } {
  // Try common conjunctions, longest match first so " and " wins over " a ".
  const seps = [" & ", " + ", " and ", " AND ", " dan ", " DAN "]
  for (const sep of seps) {
    const idx = headline.indexOf(sep)
    if (idx > 0) {
      return { left: headline.slice(0, idx).trim(), right: headline.slice(idx + sep.length).trim() }
    }
  }
  return { left: headline.trim(), right: null }
}

export function parseDateParts(
  iso?: string
): { day: string; month: string; year: string; longLabel: string } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = String(d.getFullYear())
  let longLabel = ""
  try {
    longLabel = d
      .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      .toUpperCase()
  } catch {
    longLabel = `${day}.${month}.${year}`
  }
  return { day, month, year, longLabel }
}

/** Month name in caps for the poster date card ("MAY"). */
export function monthName(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  try {
    return d.toLocaleDateString("en-GB", { month: "long" }).toUpperCase()
  } catch {
    return ""
  }
}

/** Weekday name in caps ("THURSDAY"). */
export function weekdayName(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  try {
    return d.toLocaleDateString("en-GB", { weekday: "long" }).toUpperCase()
  } catch {
    return ""
  }
}
