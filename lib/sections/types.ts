import type { ComponentType, FC, ReactNode } from "react"
import type { ZodTypeAny } from "zod"
import type {
  SectionType,
  SectionDataFor,
  TemplateType,
  Theme,
} from "@/lib/types"

export type SectionRenderProps<T extends SectionType> = {
  data: SectionDataFor<T>
  variant: string
  theme: Theme
}

export type SectionRenderer<T extends SectionType> = ComponentType<
  SectionRenderProps<T>
>

export type SectionFormProps<T extends SectionType> = {
  data: SectionDataFor<T>
  onChange: (next: SectionDataFor<T>) => void
  errors?: Record<string, string>
  cardId?: string
  userId?: string
  children?: ReactNode
}

export type SectionFormComponent<T extends SectionType> = FC<
  SectionFormProps<T>
>

export type SectionTier = "free" | "premium"

export type SectionModule<T extends SectionType = SectionType> = {
  type: T
  label: { en: string; ms: string }
  schema: ZodTypeAny
  variants: Record<string, SectionRenderer<T>>
  defaultVariant: string
  variantLabels?: Record<string, string>
  /** Variants listed here render but are hidden from the editor picker.
   *  Used for legacy variant ids that we keep around so older saved cards
   *  still render, but don't want surfaced as new choices. */
  hiddenVariants?: readonly string[]
  /**
   * Per-variant editor metadata: a CSS gradient swatch, a one-line hint, and
   * the template types the variant is the natural fit for. Drives the rich
   * variant gallery in the editor (swatch tiles + "recommended" ordering).
   */
  variantMeta?: Record<
    string,
    { swatch: string; hint?: string; recommendedFor?: TemplateType[] }
  >
  /**
   * Per-variant tier. Any variant absent from this map is treated as "free".
   * Phase 4+ uses this to badge premium variants in the editor and (later)
   * enforce premium gating at checkout.
   */
  variantTiers?: Record<string, SectionTier>
  /** Section-level tier. Defaults to "free". A premium section is itself a
   *  premium upgrade regardless of variant. */
  tier?: SectionTier
  /** Section types are unique per card by default (the editor's add-picker
   *  hides types already present). A repeatable Section can be added multiple
   *  times — e.g. `gallery`, so collages can interleave between chapters.
   *  Everything downstream already keys by index/order, not type. */
  repeatable?: boolean
  defaultData: SectionDataFor<T>
  appliesTo: TemplateType[] | "all"
  /** Optional rich form. If absent, the generic schema-driven form is used. */
  customForm?: SectionFormComponent<T>
}

export function defineSection<T extends SectionType>(
  m: SectionModule<T>
): SectionModule<T> {
  return m
}
