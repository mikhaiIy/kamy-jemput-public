"use client"

import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { colorsFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { SectionShell } from "../_shared"

const SERVICES = [
  { key: "waze", label: "Waze", bg: "#00BAFF", icon: "🚗" },
  { key: "gmaps", label: "Google Maps", bg: "#4285F4", icon: "📍" },
  { key: "grab", label: "Grab", bg: "#00b14f", icon: "🛺" },
] as const

const ButtonRow: SectionRenderer<"map"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const urls = {
    waze: data.wazeUrl,
    gmaps: data.gmapsUrl,
    grab: data.grabUrl,
  }
  return (
    <SectionShell theme={theme} title="Lokasi">
      {data.address && (
        <div
          style={{
            background: c.card,
            border: `1px solid ${c.border}`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 14,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 13, color: c.text, opacity: 0.78, margin: 0, lineHeight: 1.5 }}>
            {data.address}
          </p>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {SERVICES.map((s) => {
          const url = urls[s.key as keyof typeof urls]
          if (!url) return null
          return (
            <a
              key={s.key}
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1,
                height: 40,
                background: s.bg,
                color: "#fff",
                textDecoration: "none",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </a>
          )
        })}
      </div>
    </SectionShell>
  )
}

const Compact: SectionRenderer<"map"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  return (
    <SectionShell theme={theme}>
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        {data.address && (
          <p style={{ fontSize: 13, color: c.muted, margin: "0 0 10px" }}>
            {data.address}
          </p>
        )}
        <div style={{ display: "inline-flex", gap: 10 }}>
          {SERVICES.map((s) => {
            const url = ({ waze: data.wazeUrl, gmaps: data.gmapsUrl, grab: data.grabUrl } as Record<string, string | undefined>)[s.key]
            if (!url) return null
            return (
              <a
                key={s.key}
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "6px 14px",
                  background: "transparent",
                  border: `1px solid ${c.border}`,
                  borderRadius: 20,
                  color: c.accent,
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {s.icon} {s.label}
              </a>
            )
          })}
        </div>
      </div>
    </SectionShell>
  )
}

const optionalUrl = z.string().url().optional().or(z.literal(""))

export const mapModule = defineSection<"map">({
  type: "map",
  label: { en: "Map", ms: "Peta" },
  schema: z.object({
    address: z.string().optional(),
    wazeUrl: optionalUrl,
    gmapsUrl: optionalUrl,
    grabUrl: optionalUrl,
  }),
  variants: { button_row: ButtonRow, compact: Compact },
  variantLabels: { button_row: "Baris Butang", compact: "Padat" },
  defaultVariant: "button_row",
  defaultData: {
    address: "Jalan Ampang, 50450 Kuala Lumpur",
    wazeUrl: "",
    gmapsUrl: "",
    grabUrl: "",
  },
  appliesTo: "all",
})
