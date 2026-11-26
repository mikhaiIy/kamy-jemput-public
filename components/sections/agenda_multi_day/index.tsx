"use client"

import { z } from "zod"
import { useState } from "react"
import { defineSection } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer, SectionFormComponent } from "@/lib/sections/types"
import { SectionShell, ThemedCard, formatDateMs } from "../_shared"

const DayCards: SectionRenderer<"agenda_multi_day"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const days = Array.isArray(data.days) ? data.days : []
  if (!days.length) return null
  return (
    <SectionShell theme={theme} title="Jadual Majlis">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {days.map((day, di) => {
          const items = Array.isArray(day.items) ? day.items : []
          return (
            <ThemedCard key={di} theme={theme}>
              <div style={{ marginBottom: 10, textAlign: "center" }}>
                <p
                  style={{
                    fontFamily: fontFor(theme, "display"),
                    fontSize: 16,
                    color: c.accent,
                    margin: 0,
                  }}
                >
                  {day.label}
                </p>
                {day.date && (
                  <p style={{ fontSize: 11, color: c.muted, margin: "2px 0 0" }}>
                    {formatDateMs(day.date) || day.date}
                  </p>
                )}
              </div>
              {items.map((it, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom:
                      i < items.length - 1 ? `1px solid ${c.border}` : "none",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: c.gold, fontStyle: "italic" }}>{it.time}</span>
                  <span style={{ color: c.text }}>{it.event}</span>
                </div>
              ))}
            </ThemedCard>
          )
        })}
      </div>
    </SectionShell>
  )
}

const AgendaForm: SectionFormComponent<"agenda_multi_day"> = ({ data, onChange }) => {
  const [days, setDays] = useState(data.days)
  function commit(next: typeof days) {
    setDays(next)
    onChange({ days: next })
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {days.map((day, di) => (
        <div
          key={di}
          style={{
            padding: 12,
            border: "1px solid #e2d8cc",
            borderRadius: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <input
            value={day.label}
            placeholder="Label hari (cth: Hari 1 - Akad Nikah)"
            onChange={(e) =>
              commit(
                days.map((d, i) => (i === di ? { ...d, label: e.target.value } : d))
              )
            }
            style={inStyle}
          />
          <input
            type="date"
            value={day.date ?? ""}
            onChange={(e) =>
              commit(
                days.map((d, i) => (i === di ? { ...d, date: e.target.value } : d))
              )
            }
            style={inStyle}
          />
          {day.items.map((it, i) => (
            <div
              key={i}
              style={{ display: "grid", gridTemplateColumns: "110px 1fr auto", gap: 8 }}
            >
              <input
                value={it.time}
                placeholder="Waktu"
                onChange={(e) =>
                  commit(
                    days.map((d, idx) =>
                      idx === di
                        ? {
                            ...d,
                            items: d.items.map((x, j) =>
                              j === i ? { ...x, time: e.target.value } : x
                            ),
                          }
                        : d
                    )
                  )
                }
                style={inStyle}
              />
              <input
                value={it.event}
                placeholder="Acara"
                onChange={(e) =>
                  commit(
                    days.map((d, idx) =>
                      idx === di
                        ? {
                            ...d,
                            items: d.items.map((x, j) =>
                              j === i ? { ...x, event: e.target.value } : x
                            ),
                          }
                        : d
                    )
                  )
                }
                style={inStyle}
              />
              <button
                type="button"
                onClick={() =>
                  commit(
                    days.map((d, idx) =>
                      idx === di
                        ? { ...d, items: d.items.filter((_, j) => j !== i) }
                        : d
                    )
                  )
                }
                style={removeBtn}
                aria-label="Buang"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              commit(
                days.map((d, i) =>
                  i === di ? { ...d, items: [...d.items, { time: "", event: "" }] } : d
                )
              )
            }
            style={addInlineBtn}
          >
            + Tambah Acara
          </button>
          <button
            type="button"
            onClick={() => commit(days.filter((_, i) => i !== di))}
            style={{ ...removeBtn, alignSelf: "flex-end" }}
          >
            Buang Hari Ini
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...days, { label: `Hari ${days.length + 1}`, date: "", items: [] }])}
        style={addBtnStyle}
      >
        + Tambah Hari
      </button>
    </div>
  )
}

const inStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1.5px solid #e2d8cc",
  borderRadius: 8,
  fontSize: 13,
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "var(--font-jakarta), sans-serif",
}
const removeBtn: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #e2d8cc",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
  color: "#9a8878",
}
const addInlineBtn: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "6px 10px",
  border: "1.5px dashed #c9984a",
  borderRadius: 6,
  background: "transparent",
  color: "#c9984a",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
}
const addBtnStyle: React.CSSProperties = {
  padding: "10px 14px",
  border: "1.5px dashed #2c1a4a",
  borderRadius: 8,
  background: "transparent",
  color: "#2c1a4a",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
}

export const agendaMultiDayModule = defineSection<"agenda_multi_day">({
  type: "agenda_multi_day",
  label: { en: "Multi-day Agenda", ms: "Jadual Berbilang Hari" },
  tier: "free",
  schema: z.object({
    days: z.array(
      z.object({
        label: z.string().min(1),
        date: z.string().optional(),
        items: z.array(
          z.object({ time: z.string().min(1), event: z.string().min(1) })
        ),
      })
    ),
  }),
  variants: { day_cards: DayCards },
  variantLabels: { day_cards: "Kad Per-Hari" },
  defaultVariant: "day_cards",
  defaultData: {
    days: [
      {
        label: "Hari 1 — Akad Nikah",
        date: "",
        items: [
          { time: "10:00 AM", event: "Akad Nikah" },
          { time: "12:30 PM", event: "Jamuan Tengah Hari" },
        ],
      },
      {
        label: "Hari 2 — Sanding",
        date: "",
        items: [
          { time: "11:00 AM", event: "Bersanding" },
          { time: "1:00 PM", event: "Jamuan Makan" },
        ],
      },
    ],
  },
  appliesTo: ["wedding_indian", "wedding_chinese", "wedding_malay", "wedding_general"],
  customForm: AgendaForm,
})
