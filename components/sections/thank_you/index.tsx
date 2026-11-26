"use client"

import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { SectionShell, ThemedDivider } from "../_shared"

const Card: SectionRenderer<"thank_you"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  return (
    <SectionShell theme={theme}>
      <div
        style={{
          textAlign: "center",
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          padding: "28px 22px",
        }}
      >
        <p
          style={{
            fontFamily: fontFor(theme, "script") || fontFor(theme, "display"),
            fontSize: 32,
            color: c.accent,
            margin: "0 0 6px",
          }}
        >
          Terima Kasih
        </p>
        <ThemedDivider theme={theme} />
        <p style={{ fontSize: 13, color: c.text, opacity: 0.78, lineHeight: 1.7 }}>
          {data.message}
        </p>
      </div>
    </SectionShell>
  )
}

export const thankYouModule = defineSection<"thank_you">({
  type: "thank_you",
  label: { en: "Thank You", ms: "Terima Kasih" },
  schema: z.object({ message: z.string().min(1) }),
  variants: { card: Card },
  variantLabels: { card: "Kad" },
  defaultVariant: "card",
  defaultData: {
    message:
      "Kehadiran dan doa restu daripada anda amat kami hargai. Sekian terima kasih.",
  },
  appliesTo: "all",
})
