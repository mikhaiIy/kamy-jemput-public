"use client"

import { z } from "zod"
import { useState } from "react"
import { defineSection } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer, SectionFormComponent } from "@/lib/sections/types"
import { SectionShell, ThemedCard } from "../_shared"

const Timeline: SectionRenderer<"program"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const items = Array.isArray(data.items) ? data.items : []
  if (!items.length) return null
  return (
    <SectionShell theme={theme} title="Atur Cara Majlis">
      <ThemedCard theme={theme}>
        {items.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom:
                i < items.length - 1 ? `1px solid ${c.border}` : "none",
            }}
          >
            <span
              style={{
                fontFamily: fontFor(theme, "display"),
                fontSize: 14,
                color: c.gold,
                fontStyle: "italic",
                minWidth: 100,
              }}
            >
              {p.time}
            </span>
            <span style={{ fontSize: 13, color: c.text, textAlign: "right" }}>
              {p.event}
            </span>
          </div>
        ))}
      </ThemedCard>
    </SectionShell>
  )
}

const HorizontalScroll: SectionRenderer<"program"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const items = Array.isArray(data.items) ? data.items : []
  if (!items.length) return null
  return (
    <SectionShell theme={theme} title="Atur Cara Majlis">
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 6,
        }}
      >
        {items.map((p, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              background: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 12,
              padding: "12px 14px",
              minWidth: 130,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: fontFor(theme, "display"),
                fontSize: 13,
                color: c.gold,
                fontStyle: "italic",
                marginBottom: 4,
              }}
            >
              {p.time}
            </div>
            <div style={{ fontSize: 13, color: c.text }}>{p.event}</div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}

const ProgramForm: SectionFormComponent<"program"> = ({ data, onChange }) => {
  const [items, setItems] = useState(data.items)

  function commit(next: typeof items) {
    setItems(next)
    onChange({ items: next })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr auto",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            value={item.time}
            placeholder="Waktu"
            onChange={(e) =>
              commit(
                items.map((it, idx) =>
                  idx === i ? { ...it, time: e.target.value } : it
                )
              )
            }
            style={inputStyle}
          />
          <input
            value={item.event}
            placeholder="Acara"
            onChange={(e) =>
              commit(
                items.map((it, idx) =>
                  idx === i ? { ...it, event: e.target.value } : it
                )
              )
            }
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => commit(items.filter((_, idx) => idx !== i))}
            style={removeBtnStyle}
            aria-label="Buang"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...items, { time: "", event: "" }])}
        style={addBtnStyle}
      >
        + Tambah Acara
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1.5px solid #e2d8cc",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "var(--font-jakarta), sans-serif",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
}

const removeBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "1px solid #e2d8cc",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  fontSize: 18,
  color: "#9a8878",
}

const addBtnStyle: React.CSSProperties = {
  marginTop: 4,
  padding: "8px 14px",
  border: "1.5px dashed #c9984a",
  borderRadius: 8,
  background: "transparent",
  color: "#c9984a",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--font-jakarta), sans-serif",
}

export const programModule = defineSection<"program">({
  type: "program",
  label: { en: "Program", ms: "Atur Cara" },
  schema: z.object({
    items: z
      .array(
        z.object({
          time: z.string().min(1),
          event: z.string().min(1),
        })
      )
      .min(0),
  }),
  variants: { timeline: Timeline, horizontal_scroll: HorizontalScroll },
  variantLabels: { timeline: "Garis Masa", horizontal_scroll: "Skrol Mendatar" },
  defaultVariant: "timeline",
  defaultData: {
    items: [
      { time: "6:00 PM", event: "Ketibaan tetamu" },
      { time: "7:00 PM", event: "Majlis persandingan" },
      { time: "8:00 PM", event: "Jamuan makan malam" },
    ],
  },
  appliesTo: "all",
  customForm: ProgramForm,
})
