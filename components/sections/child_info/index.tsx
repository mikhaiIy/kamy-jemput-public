"use client"

import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { cardImageReferenceSchema } from "@/lib/card-image-reference"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { SectionShell, ThemedCard, formatDateMs } from "../_shared"

const Centered: SectionRenderer<"child_info"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  return (
    <SectionShell theme={theme}>
      <ThemedCard theme={theme} style={{ textAlign: "center" }}>
        {data.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.photoUrl}
            alt={data.name}
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              objectFit: "cover",
              margin: "0 auto 16px",
              border: `2px solid ${c.gold}`,
            }}
          />
        )}
        <p
          style={{
            fontFamily: fontFor(theme, "script") || fontFor(theme, "display"),
            fontSize: 32,
            color: c.accent,
            margin: "0 0 6px",
          }}
        >
          {data.name}
        </p>
        {data.dob && (
          <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
            {formatDateMs(data.dob) || data.dob}
          </p>
        )}
        {data.parents && (
          <p style={{ fontSize: 13, color: c.text, opacity: 0.7, margin: "10px 0 0" }}>
            Anak kepada {data.parents}
          </p>
        )}
      </ThemedCard>
    </SectionShell>
  )
}

export const childInfoModule = defineSection<"child_info">({
  type: "child_info",
  label: { en: "Child Info", ms: "Maklumat Anak" },
  tier: "free",
  schema: z.object({
    name: z.string().min(1),
    dob: z.string().optional(),
    parents: z.string().optional(),
    photoUrl: cardImageReferenceSchema.optional(),
  }),
  variants: { centered: Centered },
  variantLabels: { centered: "Tengah" },
  defaultVariant: "centered",
  defaultData: {
    name: "Muhammad Adam",
    dob: "",
    parents: "Ahmad & Siti",
    photoUrl: "",
  },
  appliesTo: ["aqiqah", "cukur_jambul", "full_moon"],
})
