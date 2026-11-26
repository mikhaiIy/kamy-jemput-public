"use client"

import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { SectionShell } from "../_shared"

const Centered: SectionRenderer<"quote"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  return (
    <SectionShell theme={theme}>
      <div style={{ textAlign: "center", maxWidth: 540, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: fontFor(theme, "display"),
            fontSize: 17,
            fontStyle: "italic",
            color: c.accent,
            lineHeight: 1.7,
            margin: "0 0 8px",
          }}
        >
          &ldquo;{data.text}&rdquo;
        </p>
        {data.attribution && (
          <p
            style={{
              fontSize: 11,
              color: c.muted,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            — {data.attribution}
          </p>
        )}
      </div>
    </SectionShell>
  )
}

export const quoteModule = defineSection<"quote">({
  type: "quote",
  label: { en: "Quote", ms: "Petikan" },
  schema: z.object({
    text: z.string().min(1),
    attribution: z.string().optional(),
  }),
  variants: { centered: Centered },
  variantLabels: { centered: "Tengah" },
  defaultVariant: "centered",
  defaultData: {
    text:
      "Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan dari jenismu sendiri.",
    attribution: "Surah Ar-Rum: 21",
  },
  appliesTo: "all",
})
