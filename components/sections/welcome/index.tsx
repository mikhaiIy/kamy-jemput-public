"use client"

import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { SectionShell, ThemedCard, ThemedDivider } from "../_shared"

const CardCentered: SectionRenderer<"welcome"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  return (
    <SectionShell theme={theme}>
      <ThemedCard theme={theme} style={{ textAlign: "center" }}>
        <p
          style={{
            fontFamily: fontFor(theme, "display"),
            fontSize: 14,
            fontStyle: "italic",
            color: c.accent,
            margin: "0 0 8px",
            letterSpacing: "0.04em",
            lineHeight: 1.6,
          }}
        >
          {data.greeting}
        </p>
        <ThemedDivider theme={theme} />
        <p style={{ fontSize: 13, color: c.text, opacity: 0.78, lineHeight: 1.7 }}>
          {data.body}
        </p>
      </ThemedCard>
    </SectionShell>
  )
}

export const welcomeModule = defineSection<"welcome">({
  type: "welcome",
  label: { en: "Welcome", ms: "Aluan" },
  schema: z.object({
    greeting: z.string().min(1),
    body: z.string().min(1),
  }),
  variants: { card_centered: CardCentered },
  variantLabels: { card_centered: "Kad Tengah" },
  defaultVariant: "card_centered",
  defaultData: {
    greeting: "Bismillahirrahmanirrahim",
    body:
      "Dengan penuh kesyukuran, kami menjemput Dato'/Datin/Tuan/Puan ke majlis perkahwinan kami.",
  },
  appliesTo: "all",
})
