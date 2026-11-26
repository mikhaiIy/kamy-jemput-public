import assert from "node:assert/strict"
import test from "node:test"

import {
  classifyEventDates,
  collectEventDates,
  klTodayKey,
  parseEventDate,
  resolveEventDateSections,
} from "./resolve-event-date.ts"

const sectionCard = (sections) => ({ templateId: "test", theme: {}, sections, schemaVersion: 2 })
const section = (type, data) => ({ type, variant: "default", enabled: true, order: 0, data })

test("legacy cards extract their event date", () => {
  const dates = collectEventDates({ eventDate: "2027-04-03" })
  assert.deepEqual(dates.map((date) => date.klDayKey), ["2027-04-03"])
})

test("valid Event info takes precedence over a stale Landing date", () => {
  const dates = collectEventDates(sectionCard([
    section("landing", { eventDate: "2030-01-01" }),
    section("event_info", { date: "2020-01-01", time: "12:00" }),
  ]))
  assert.deepEqual(dates.map((date) => date.klDayKey), ["2020-01-01"])
  assert.equal(classifyEventDates(dates, "2026-01-01"), "past")
})

test("Landing date is a fallback when Event info is missing or malformed", () => {
  const missing = collectEventDates(sectionCard([section("landing", { eventDate: "2027-04-03" })]))
  const malformed = collectEventDates(sectionCard([
    section("event_info", { date: 42, time: null }),
    section("landing", { eventDate: "2027-04-03" }),
  ]))
  assert.deepEqual(missing.map((date) => date.klDayKey), ["2027-04-03"])
  assert.deepEqual(malformed.map((date) => date.klDayKey), ["2027-04-03"])
  const malformedTime = collectEventDates(sectionCard([
    section("event_info", { date: "2020-01-01", time: "not-time" }),
    section("landing", { eventDate: "2030-01-01" }),
  ]))
  assert.deepEqual(malformedTime.map((date) => date.klDayKey), ["2020-01-01"])
})

test("agenda dates supplement Event info and deduplicate Kuala Lumpur days", () => {
  const dates = collectEventDates(sectionCard([
    section("event_info", { date: "2020-01-01", time: "12:00" }),
    section("agenda_multi_day", { days: [
      { date: "2030-02-03", items: [] },
      { date: "2030-02-02T16:00:00Z", items: [] }, // 3 Feb in KL
    ] }),
  ]))
  assert.deepEqual(dates.map((date) => date.klDayKey).sort(), ["2020-01-01", "2030-02-03"])
  assert.equal(classifyEventDates(dates, "2026-01-01"), "upcoming")
})

test("parser keeps date-only and UTC/offset boundaries in Kuala Lumpur", () => {
  assert.equal(parseEventDate("2026-01-01")?.klDayKey, "2026-01-01")
  assert.equal(parseEventDate("2025-12-31T16:00:00Z")?.klDayKey, "2026-01-01")
  assert.equal(parseEventDate("2026-01-01T00:00:00+08:00")?.klDayKey, "2026-01-01")
  assert.equal(klTodayKey(new Date("2025-12-31T16:00:00Z")), "2026-01-01")
})

test("malformed or impossible values do not create a date grouping", () => {
  for (const value of [null, 7, "", "2026-02-30", "2026-01-01T25:00", "not a date"]) {
    assert.equal(parseEventDate(value), null)
  }
  const dates = collectEventDates(sectionCard([
    section("event_info", null),
    section("landing", { eventDate: "2026-02-30" }),
    section("agenda_multi_day", { days: [{ date: 1 }, { date: "wat" }] }),
  ]))
  assert.deepEqual(dates, [])
  assert.equal(classifyEventDates(dates, "2026-01-01"), null)
})

test("countdown and calendar inherit Event info without mutating explicit targets", () => {
  const countdown = section("countdown", { targetDate: "" })
  const explicitCountdown = section("countdown", { targetDate: "2032-01-01T00:00:00+08:00" })
  const calendar = section("calendar", { startsAt: "" })
  const explicitCalendar = section("calendar", { startsAt: "2031-01-01T00:00:00+08:00" })
  const original = sectionCard([
    section("event_info", { date: "2027-04-03", time: "09:30" }),
    countdown,
    explicitCountdown,
    calendar,
    explicitCalendar,
  ])
  const resolved = resolveEventDateSections(original)
  assert.notStrictEqual(resolved, original.sections)
  assert.equal(resolved[1].data.targetDate, "2027-04-03T09:30:00+08:00")
  assert.equal(resolved[2].data.targetDate, "2032-01-01T00:00:00+08:00")
  assert.equal(resolved[3].data.startsAt, "2027-04-03T09:30:00+08:00")
  assert.equal(resolved[4].data.startsAt, "2031-01-01T00:00:00+08:00")
  assert.equal(countdown.data.targetDate, "")
  assert.equal(calendar.data.startsAt, "")
})
