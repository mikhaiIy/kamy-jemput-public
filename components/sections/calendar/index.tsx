"use client"

import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { colorsFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { SectionShell } from "../_shared"

function buildGoogleCalendarUrl(name: string, isoStart?: string): string {
  if (!isoStart) return "#"
  try {
    const start = new Date(isoStart)
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000)
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: name,
      dates: `${fmt(start)}/${fmt(end)}`,
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  } catch {
    return "#"
  }
}

function buildIcsDataUrl(name: string, isoStart?: string): string {
  if (!isoStart) return "#"
  try {
    const start = new Date(isoStart)
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000)
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `SUMMARY:${name}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n")
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
  } catch {
    return "#"
  }
}

const Buttons: SectionRenderer<"calendar"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const name = data.eventName || "Majlis"
  const start = data.startsAt
  return (
    <SectionShell
      theme={theme}
      title={data.titleOverride || "Simpan Tarikh"}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <a
          href={buildGoogleCalendarUrl(name, start)}
          target="_blank"
          rel="noreferrer"
          style={btnStyle(c)}
        >
          📅 Google Calendar
        </a>
        <a
          href={buildIcsDataUrl(name, start)}
          download="invitation.ics"
          style={btnStyle(c)}
        >
          🍎 Apple / Outlook
        </a>
      </div>
    </SectionShell>
  )
}

const Plaque: SectionRenderer<"calendar"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const date = data.startsAt ? new Date(data.startsAt) : null
  return (
    <SectionShell theme={theme}>
      <div style={{ textAlign: "center" }}>
        {date && (
          <div
            style={{
              display: "inline-block",
              border: `1px solid ${c.border}`,
              borderRadius: 12,
              padding: "16px 28px",
              background: c.card,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: c.muted,
              }}
            >
              {date.toLocaleDateString("en-GB", { weekday: "long" })}
            </p>
            <p
              style={{
                margin: "4px 0",
                fontSize: 36,
                color: c.accent,
                fontWeight: 600,
              }}
            >
              {date.getDate()}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: c.text,
                letterSpacing: "0.08em",
              }}
            >
              {date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </p>
          </div>
        )}
      </div>
    </SectionShell>
  )
}

// MonthGrid — a real month calendar with a heart over the big day, plus the
// add-to-calendar buttons. Modelled on jestudio's "Save the date" chapter.
const MonthGrid: SectionRenderer<"calendar"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const name = data.eventName || "Majlis"
  const start = data.startsAt
  const date = start ? new Date(start) : null
  const valid = date && !Number.isNaN(date.getTime()) ? date : null

  return (
    <SectionShell theme={theme} title={data.titleOverride || "Save the Date"}>
      {valid ? (
        <div
          style={{
            border: `1px solid ${c.border}`,
            borderRadius: 10,
            overflow: "hidden",
            background: c.card,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "14px 16px 6px" }}>
            <span style={{ fontSize: 44, fontWeight: 700, color: c.accent, lineHeight: 1 }}>
              {String(valid.getMonth() + 1).padStart(2, "0")}
            </span>
            <span style={{ fontSize: 26, color: c.border }}>/</span>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 11, letterSpacing: "0.2em", color: c.muted, fontWeight: 700 }}>
                {valid.toLocaleDateString("en-GB", { month: "long" }).toUpperCase()}
              </span>
              <span style={{ fontSize: 16, color: c.accent, fontStyle: "italic" }}>
                -{valid.getFullYear()}-
              </span>
            </span>
          </div>
          <MonthDays date={valid} c={c} />
        </div>
      ) : (
        <p style={{ textAlign: "center", fontSize: 12, color: c.muted, margin: "0 0 14px" }}>
          Tetapkan tarikh majlis untuk papar kalendar.
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <a
          href={buildGoogleCalendarUrl(name, start)}
          target="_blank"
          rel="noreferrer"
          style={btnStyle(c)}
        >
          📅 Google Calendar
        </a>
        <a href={buildIcsDataUrl(name, start)} download="invitation.ics" style={btnStyle(c)}>
          🍎 Apple / Outlook
        </a>
      </div>
    </SectionShell>
  )
}

function MonthDays({ date, c }: { date: Date; c: ReturnType<typeof colorsFor> }) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const target = date.getDate()
  // Monday-first column index of the 1st of the month.
  const firstCol = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const cells: Array<number | null> = [
    ...Array.from({ length: firstCol }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div style={{ padding: "0 12px 16px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
          borderBottom: `1px solid ${c.border}`,
          paddingBottom: 6,
          marginBottom: 8,
        }}
      >
        {labels.map((d, i) => (
          <span
            key={d}
            style={{ fontSize: 10, padding: "4px 0", color: i >= 5 ? c.accent : c.muted }}
          >
            {d}
          </span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
        {cells.map((day, i) => {
          const weekend = i % 7 >= 5
          const isTarget = day === target
          return (
            <span
              key={i}
              style={{
                position: "relative",
                width: 28,
                height: 28,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: isTarget ? "#fff" : weekend ? c.accent : c.text,
                fontWeight: isTarget ? 600 : 300,
              }}
            >
              {isTarget && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    fontSize: 28,
                    color: c.accent,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -52%)",
                  }}
                >
                  ♥
                </span>
              )}
              <span style={{ position: "relative", zIndex: 1 }}>{day ?? ""}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function btnStyle(c: ReturnType<typeof colorsFor>): React.CSSProperties {
  return {
    flex: 1,
    height: 38,
    background: "transparent",
    color: c.accent,
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  }
}

export const calendarModule = defineSection<"calendar">({
  type: "calendar",
  label: { en: "Calendar", ms: "Kalendar" },
  schema: z.object({
    titleOverride: z.string().optional(),
    eventName: z.string().optional(),
    startsAt: z.string().optional(),
  }),
  variants: { buttons: Buttons, plaque: Plaque, month_grid: MonthGrid },
  variantLabels: { buttons: "Butang", plaque: "Plak Tarikh", month_grid: "Grid Bulan" },
  variantMeta: {
    month_grid: {
      swatch: "linear-gradient(135deg, #fffafb 0%, #e8637f 100%)",
      hint: "Kalendar bulan penuh dengan ♥ pada tarikh majlis",
    },
  },
  defaultVariant: "buttons",
  defaultData: {
    titleOverride: "",
    eventName: "Walimatul Urus",
    startsAt: "",
  },
  appliesTo: "all",
})
