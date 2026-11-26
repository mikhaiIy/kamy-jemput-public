"use client"

import { Component, useEffect, useMemo, type ReactNode } from "react"
import type {
  SectionCardData,
  SectionInstance,
  SectionType,
  Theme,
} from "@/lib/types"
import { sectionRegistry } from "@/lib/sections/registry"
import { normalizeSectionForRender } from "@/lib/sections/normalize-section-for-render"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import { resolveEventDateSections } from "@/lib/sections/resolve-event-date"
import { WishesProvider, type Wish } from "@/components/sections/_wishes_context"
import { resolveCardDataAssetUrls } from "@/lib/card-assets"

type Props = {
  cardId?: string
  userId?: string | null
  data: SectionCardData
  wishes?: Wish[]
  /** Current immutable publication identity used for guest realtime. */
  publicationId?: string
  /** Editor-only: identity of the selected Section (`${type}-${order}`). */
  scrollTargetId?: string
  /** Editor-only: changes on every selection so re-selecting re-scrolls. */
  scrollToken?: number
}

export function SectionInvitationCard({
  cardId,
  userId,
  data,
  wishes = [],
  publicationId,
  scrollTargetId,
  scrollToken,
}: Props) {
  // The RSVP section reads cardId from a window-level constant so it can POST
  // to /api/rsvp/[cardId]. This keeps Section render props pure (data + theme).
  useEffect(() => {
    if (cardId && typeof window !== "undefined") {
      window.__KAMY_CARD_ID__ = cardId
    }
  }, [cardId])

  const renderData = useMemo(
    () =>
      cardId
        ? resolveCardDataAssetUrls(data, { cardId, userId })
        : data,
    [cardId, data, userId],
  )
  const c = colorsFor(renderData.theme)
  // Resolve the Gaya's own surface; legacy/malformed themes fall back to the
  // palette bg so an invitation never renders without a background.
  const bg = renderData.theme?.background
  const bgValue =
    bg &&
    (bg.kind === "solid" || bg.kind === "pattern" || bg.kind === "image") &&
    typeof bg.value === "string" &&
    bg.value.trim() !== ""
      ? bg.value
      : c.bg
  const animation = renderData.theme?.animation ?? "none"
  const presetId = renderData.theme?.preset ?? ""
  usePreviewScroll(scrollTargetId, scrollToken)
  const enabled = resolveEventDateSections(renderData)
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order)

  return (
    <WishesProvider cardId={cardId} publicationId={publicationId} initial={wishes}>
      <div
        data-section-stack=""
        data-gaya-preset={presetId || undefined}
        data-gaya-animation={animation}
        style={{
          background: bgValue,
          color: c.text,
          fontFamily: fontFor(renderData.theme, "body"),
          minHeight: "100vh",
          paddingBottom: 40,
          // Make the card its own query container so sections can size against
          // the card's real width (cqw) instead of the browser viewport (vw).
          // This keeps the hero correct whether the card fills a phone, the
          // editor preview frame, or a centered desktop column.
          containerType: "inline-size",
        }}
      >
        {/* Decorative ambient layer for the Gaya's animation mode (particles /
        ken-burns drift). Purely presentational: behind all content and unable
        to intercept pointer events. */}
        <div className="gaya-backdrop" aria-hidden="true" />
        {enabled.map((s, i) => (
          <div key={`${s.type}-${i}`} data-section-stack-item={`${s.type}-${s.order}`}>
            <SectionErrorBoundary sectionType={s.type}>
              <RenderedSection section={s} theme={renderData.theme} />
            </SectionErrorBoundary>
          </div>
        ))}
        <footer style={{ textAlign: "center", padding: "20px 0", color: c.muted, fontSize: 10, letterSpacing: "0.12em" }}>
          kamy jemput
        </footer>
      </div>
    </WishesProvider>
  )
}

// Editor-only: bring the rendered item matching the selected Section row into
// view inside the Live preview's own scroller (`.phone-scroll`), without
// scrolling the page. No-ops when there is no request or no match — which is
// the default for every caller that does not pass a target (published cards,
// gallery/detail preview iframes).
function usePreviewScroll(
  scrollTargetId: string | undefined,
  scrollToken: number | undefined
) {
  useEffect(() => {
    if (!scrollTargetId || scrollToken === undefined || typeof window === "undefined") {
      return
    }
    const raf = window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-section-stack-item="${CSS.escape(scrollTargetId)}"]`
      )
      const scroller = el?.closest<HTMLElement>(".phone-scroll")
      if (!el || !scroller) return
      const elRect = el.getBoundingClientRect()
      const scrollerRect = scroller.getBoundingClientRect()
      scroller.scrollTo({
        top: elRect.top - scrollerRect.top + scroller.scrollTop,
        behavior: "smooth",
      })
    })
    return () => window.cancelAnimationFrame(raf)
  }, [scrollTargetId, scrollToken])
}

function RenderedSection({
  section,
  theme,
}: {
  section: SectionInstance
  theme: Theme
}) {
  const mod = sectionRegistry[section.type as SectionType]
  if (!mod) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Unknown section type: ${section.type}`)
    }
    return null
  }
  const Variant =
    mod.variants[section.variant] ?? mod.variants[mod.defaultVariant]
  // Discriminated union erases at runtime; the registry guarantees the data shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = Variant as any
  const normalized = normalizeSectionForRender(section)
  return <Comp data={normalized.data} variant={section.variant} theme={theme} />
}

// A renderer with stale/legacy data must not take down the whole card.
// Swallow the error, log in dev, and render nothing in prod so the rest
// of the invitation continues to display.
class SectionErrorBoundary extends Component<
  { sectionType: string; children: ReactNode },
  { errored: boolean }
> {
  state = { errored: false }
  static getDerivedStateFromError() {
    return { errored: true }
  }
  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `Section "${this.props.sectionType}" failed to render:`,
        error
      )
    }
  }
  render() {
    if (this.state.errored) return null
    return this.props.children
  }
}
