"use client"

import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { SectionShell, ThemedCard, formatDateMs } from "../_shared"

function Row({
  icon,
  label,
  value,
  sub,
  theme,
}: {
  icon: string
  label: string
  value: string
  sub?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any
}) {
  const c = colorsFor(theme)
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div>
        <p
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: c.muted,
            margin: "0 0 2px",
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: c.accent,
            margin: "0 0 2px",
          }}
        >
          {value}
        </p>
        {sub && (
          <p style={{ fontSize: 12, color: c.text, opacity: 0.65, margin: 0, lineHeight: 1.5 }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

const CardStack: SectionRenderer<"event_info"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  return (
    <SectionShell theme={theme}>
      <ThemedCard theme={theme}>
        <p
          style={{
            fontFamily: fontFor(theme, "display"),
            fontSize: 17,
            fontWeight: 600,
            color: c.accent,
            margin: "0 0 14px",
            textAlign: "center",
          }}
        >
          {data.eventName}
        </p>
        <Row
          icon="📅"
          label="Tarikh"
          value={formatDateMs(data.date) || data.date}
          sub={data.time}
          theme={theme}
        />
        <div style={{ height: 1, background: c.border, margin: "14px 0" }} />
        <Row
          icon="🕌"
          label="Tempat"
          value={data.venue}
          sub={data.address}
          theme={theme}
        />
      </ThemedCard>
    </SectionShell>
  )
}

const SingleCard: SectionRenderer<"event_info"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  return (
    <SectionShell theme={theme}>
      <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: fontFor(theme, "display"),
            fontSize: 20,
            color: c.accent,
            margin: "0 0 8px",
          }}
        >
          {data.eventName}
        </p>
        <p style={{ fontSize: 14, color: c.text, opacity: 0.78, margin: 0 }}>
          {formatDateMs(data.date) || data.date} · {data.time}
        </p>
        <p style={{ fontSize: 13, color: c.muted, margin: "8px 0 0" }}>
          {data.venue} — {data.address}
        </p>
      </div>
    </SectionShell>
  )
}

export const eventInfoModule = defineSection<"event_info">({
  type: "event_info",
  label: { en: "Event Info", ms: "Maklumat Majlis" },
  schema: z.object({
    eventName: z.string().min(1, "Nama majlis diperlukan"),
    date: z.string().min(1, "Tarikh diperlukan"),
    time: z.string().min(1, "Waktu diperlukan"),
    venue: z.string().min(1, "Tempat diperlukan"),
    address: z.string().min(1, "Alamat diperlukan"),
  }),
  variants: { card_stack: CardStack, single_card: SingleCard },
  variantLabels: { card_stack: "Kad Berlapis", single_card: "Kad Tunggal" },
  defaultVariant: "card_stack",
  defaultData: {
    eventName: "Walimatul Urus",
    date: "",
    time: "11:00",
    venue: "Dewan Seri Budiman",
    address: "Jalan Ampang, 50450 Kuala Lumpur",
  },
  appliesTo: "all",
})
