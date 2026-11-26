import type {
  CardData,
  SectionCardData,
  SectionInstance,
} from "@/lib/types"

function isSectionCard(data: CardData): data is SectionCardData {
  return typeof data === "object" && data !== null && "sections" in data && Array.isArray(data.sections)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function recordFrom(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

// --------------------------------------------------------------------------
// Strict shared event-date extraction + classification.
//
// The dashboard groups cards into date groups in Asia/Kuala_Lumpur. These
// helpers are the single source of that logic: they collect actual legacy and
// Section-v2 event dates (event-info with Landing fallback and multi-day
// agenda values), reject malformed/impossible calendar values instead of
// letting JavaScript roll them over (e.g. 2026-02-30), and keep date-only
// values calendar-stable so grouping never shifts by a timezone accident.
// --------------------------------------------------------------------------

export const KL_TIMEZONE = "Asia/Kuala_Lumpur"
const KL_OFFSET_MS = 8 * 60 * 60 * 1000 // UTC+08:00, no DST

/** A validated event date: its instant plus the calendar day it falls on in
 *  Kuala Lumpur (`YYYY-MM-DD`), which is the comparison key for grouping. */
export type ResolvedEventDate = {
  utcMs: number
  klDayKey: string
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate()
}

function klDayKeyFor(utcMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utcMs))
}

/** Kuala Lumpur's current calendar day as a `YYYY-MM-DD` key. */
export function klTodayKey(now: Date = new Date()): string {
  return klDayKeyFor(now.getTime())
}

/**
 * Strictly parse one stored date value.
 *
 * Accepts `YYYY-MM-DD` (treated as Kuala Lumpur midnight — calendar-stable)
 * and ISO datetimes with an optional offset or `Z`; a naive wall time is read
 * as Kuala Lumpur time, matching how the editor writes dates. Returns null
 * for malformed strings and impossible calendar/datetime values instead of
 * rolling over like `new Date()` would.
 */
export function parseEventDate(value: unknown): ResolvedEventDate | null {
  if (typeof value !== "string") return null
  const s = value.trim()
  if (!s) return null

  const m =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?\s*(Z|[+-]\d{2}(?::?\d{2})?)?)?$/.exec(
      s
    )
  if (!m) return null

  const [, yS, moS, dS, hS, minS, secS, zone] = m
  const year = Number(yS)
  const month = Number(moS) // 1–12
  const day = Number(dS)
  if (month < 1 || month > 12) return null
  if (day < 1 || day > daysInMonth(year, month)) return null

  let hour = 0
  let minute = 0
  let second = 0
  if (hS !== undefined) {
    hour = Number(hS)
    minute = Number(minS)
    second = Number(secS ?? "0")
    if (hour > 23 || minute > 59 || second > 59) return null
  }

  // Build the wall-clock components at UTC, then shift to the instant.
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second)
  if (zone === "Z") {
    // already UTC
  } else if (zone) {
    // Both `±HH:MM` and compact `±HHMM` offsets; minutes default to 00.
    const sign = zone[0] === "+" ? 1 : -1
    const digits = zone.slice(1).replace(":", "")
    const offsetHours = Number(digits.slice(0, 2))
    const offsetMinutes = Number(digits.slice(2, 4) || "0")
    if (offsetHours > 23 || offsetMinutes > 59) return null
    utcMs -= sign * ((offsetHours * 60 + offsetMinutes) * 60_000)
  } else {
    // Naive wall time (or bare date): interpret as Kuala Lumpur local time.
    utcMs -= KL_OFFSET_MS
  }

  return { utcMs, klDayKey: klDayKeyFor(utcMs) }
}

/** Collect stored date strings relevant to grouping from either card shape. */
function collectDateStrings(data: CardData): Array<{ date: string; time?: string }> {
  const agenda: Array<{ date: string }> = []
  const eventInfo: Array<{ date: string; time?: string }> = []
  const landing: Array<{ date: string }> = []

  if (!isSectionCard(data)) {
    return typeof data.eventDate === "string" && data.eventDate.trim()
      ? [{ date: data.eventDate }]
      : []
  }

  for (const section of data.sections) {
    if (!isRecord(section) || typeof section.type !== "string") continue
    const sectionData = recordFrom(section.data)
    if (!sectionData) continue

    if (section.type === "event_info") {
      if (typeof sectionData.date === "string" && sectionData.date.trim()) {
        eventInfo.push({
          date: sectionData.date,
          time: typeof sectionData.time === "string" ? sectionData.time : undefined,
        })
      }
    } else if (section.type === "landing") {
      if (typeof sectionData.eventDate === "string" && sectionData.eventDate.trim()) {
        landing.push({ date: sectionData.eventDate })
      }
    } else if (section.type === "agenda_multi_day" && Array.isArray(sectionData.days)) {
      for (const day of sectionData.days) {
        if (isRecord(day) && typeof day.date === "string" && day.date.trim()) {
          agenda.push({ date: day.date })
        }
      }
    }
  }

  // Event info is authoritative when it contains a valid date. Landing is a
  // legacy fallback only; agenda days always supplement the main event date.
  const validEventInfo = eventInfo.filter((entry) => parseEventDate(entry.date) !== null)
  return [...(validEventInfo.length > 0 ? validEventInfo : landing), ...agenda]
}

/**
 * All valid event dates on a card, deduplicated by Kuala Lumpur day key.
 * Malformed/impossible stored values are rejected (skipped), never rolled over.
 */
export function collectEventDates(data: CardData): ResolvedEventDate[] {
  const byDay = new Map<string, ResolvedEventDate>()
  for (const entry of collectDateStrings(data)) {
    // Combine a separate event_info time so the instant is right; the day key
    // is what grouping uses.
    let candidate = entry.date
    const time = typeof entry.time === "string" ? entry.time.trim() : ""
    if (time && !candidate.includes("T") && /^\d{2}:\d{2}(?::\d{2})?$/.test(time)) {
      const seconds = /^\d{2}:\d{2}$/.test(time) ? ":00" : ""
      candidate = `${candidate}T${time}${seconds}`
    }
    const parsed = parseEventDate(candidate)
    if (parsed && !byDay.has(parsed.klDayKey)) byDay.set(parsed.klDayKey, parsed)
  }
  return [...byDay.values()]
}

/** Where valid event dates place a card relative to today in Kuala Lumpur:
 *  `upcoming` when any date is today or later, otherwise `past`. Null when the
 *  card has no valid event date at all (it belongs in Current). */
export type EventDateGrouping = "upcoming" | "past"

export function classifyEventDates(
  dates: ResolvedEventDate[],
  todayKey: string = klTodayKey()
): EventDateGrouping | null {
  if (dates.length === 0) return null
  return dates.some((d) => d.klDayKey >= todayKey) ? "upcoming" : "past"
}

function eventStartsAt(date: unknown, time: unknown): string {
  const eventDate = typeof date === "string" ? date.trim() : ""
  if (!eventDate) return ""

  // Event info stores the date and time separately. Preserve a full ISO value
  // if a legacy draft already has one; otherwise make the intended Malaysian
  // event time explicit so the calendar and countdown agree.
  if (eventDate.includes("T")) return eventDate
  const eventTime = (typeof time === "string" ? time.trim() : "") || "00:00"
  const seconds = /^\d{2}:\d{2}$/.test(eventTime) ? ":00" : ""
  return `${eventDate}T${eventTime}${seconds}+08:00`
}

/**
 * Populate date-driven sections from event_info only when their own date has
 * not been set. Keeping this at card assembly makes the public card and the
 * editor preview behave identically without mutating the saved draft.
 */
export function resolveEventDateSections(data: SectionCardData): SectionInstance[] {
  const eventInfo = data.sections.find(
    (section) => isRecord(section) && section.type === "event_info"
  )
  if (!eventInfo) return data.sections

  const event = recordFrom(eventInfo.data)
  const startsAt = eventStartsAt(event?.date, event?.time)
  if (!startsAt) return data.sections

  return data.sections.map((section) => {
    if (!isRecord(section)) return section
    if (section.type === "countdown") {
      const countdown = recordFrom(section.data) ?? {}
      if (typeof countdown.targetDate !== "string" || !countdown.targetDate.trim()) {
        return { ...section, data: { ...countdown, targetDate: startsAt } } as SectionInstance
      }
    }

    if (section.type === "calendar") {
      const calendar = recordFrom(section.data) ?? {}
      if (typeof calendar.startsAt !== "string" || !calendar.startsAt.trim()) {
        return { ...section, data: { ...calendar, startsAt } } as SectionInstance
      }
    }

    return section
  })
}
