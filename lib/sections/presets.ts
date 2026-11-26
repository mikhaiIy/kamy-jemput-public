import type { SectionCardData, SectionType, Theme } from "@/lib/types"
import { DEFAULT_THEME } from "./theme"
import { defaultSectionInstance } from "./registry"

/** The Phase 1 default ordering for a wedding card (Malay-leaning). */
const WEDDING_DEFAULT_ORDER: SectionType[] = [
  "landing",
  "welcome",
  "quote",
  "event_info",
  "program",
  "countdown",
  "calendar",
  "map",
  "contact",
  "rsvp",
  "thank_you",
]

const OPEN_HOUSE_DEFAULT_ORDER: SectionType[] = [
  "landing",
  "welcome",
  "quote",
  "event_info",
  "map",
  "contact",
  "thank_you",
]

export function buildSectionCardData(
  templateId: string,
  theme: Theme,
  order: SectionType[]
): SectionCardData {
  return {
    templateId,
    theme,
    sections: order.map((type, i) => defaultSectionInstance(type, i)),
    schemaVersion: 2,
  }
}

export function defaultWeddingMalayCardData(): SectionCardData {
  const theme: Theme = {
    palette: "amber_rose",
    fonts: {
      display: "--font-playfair",
      body: "--font-jakarta",
      script: "--font-great-vibes",
    },
    animation: "fade",
    background: { kind: "solid", value: "#fdf6ec" },
  }
  return buildSectionCardData("malay-wedding-v2", theme, WEDDING_DEFAULT_ORDER)
}

export function defaultWeddingGeneralCardData(): SectionCardData {
  const theme: Theme = {
    palette: "sage_ivory",
    fonts: {
      display: "--font-cormorant",
      body: "--font-jakarta",
      script: "--font-great-vibes",
    },
    animation: "ken_burns",
    background: { kind: "solid", value: "#f7f5ef" },
  }
  return buildSectionCardData("general-wedding", theme, WEDDING_DEFAULT_ORDER)
}

export function defaultOpenHouseRayaCardData(): SectionCardData {
  const theme: Theme = {
    palette: "pastel_green_gold",
    fonts: {
      display: "--font-playfair",
      body: "--font-jakarta",
    },
    animation: "none",
    background: { kind: "solid", value: "#f3f7ee" },
  }
  return buildSectionCardData(
    "open-house-raya",
    theme,
    OPEN_HOUSE_DEFAULT_ORDER
  )
}

export { DEFAULT_THEME }
