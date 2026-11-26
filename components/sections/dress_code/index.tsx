"use client"

import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { SectionShell, ThemedCard } from "../_shared"

const Swatch: SectionRenderer<"dress_code"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  return (
    <SectionShell theme={theme} title="Kod Pakaian">
      <ThemedCard theme={theme} style={{ textAlign: "center" }}>
        {data.swatchHex && (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: data.swatchHex,
              border: `2px solid ${c.border}`,
              margin: "0 auto 14px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          />
        )}
        <p
          style={{
            fontFamily: fontFor(theme, "display"),
            fontSize: 18,
            color: c.accent,
            margin: "0 0 6px",
          }}
        >
          {data.theme}
        </p>
        {data.note && (
          <p style={{ fontSize: 12, color: c.muted, margin: 0, lineHeight: 1.5 }}>
            {data.note}
          </p>
        )}
      </ThemedCard>
    </SectionShell>
  )
}

export const dressCodeModule = defineSection<"dress_code">({
  type: "dress_code",
  label: { en: "Dress Code", ms: "Kod Pakaian" },
  tier: "free",
  schema: z.object({
    theme: z.string().min(1),
    note: z.string().optional(),
    swatchHex: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Format warna tidak sah (cth: #c9984a)")
      .optional()
      .or(z.literal("")),
  }),
  variants: { swatch: Swatch },
  variantLabels: { swatch: "Swatch Warna" },
  defaultVariant: "swatch",
  defaultData: {
    theme: "Pastel Pink & Putih",
    note: "Pakaian formal / tradisional",
    swatchHex: "#f4d6dc",
  },
  appliesTo: "all",
})
