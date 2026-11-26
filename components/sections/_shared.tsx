"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import type { Theme } from "@/lib/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"

/**
 * Scroll-reveal wrapper (the jestudio ".reveal" pattern): children fade in and
 * rise 20px the first time they scroll into view.
 *
 * SSR/no-JS safe: the server renders content fully visible; on mount, elements
 * still below the viewport are hidden and handed to an IntersectionObserver.
 * Mutating style after mount never causes a hydration mismatch, and without JS
 * the content simply stays visible. Respects prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode
  /** Stagger delay in ms once the element becomes visible. */
  delay?: number
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !("IntersectionObserver" in window)) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    // Already on screen (above the fold) — leave it visible, no animation.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) return

    el.style.opacity = "0"
    el.style.transform = "translateY(20px)"
    el.style.transition = `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.style.opacity = "1"
            el.style.transform = "translateY(0)"
            obs.unobserve(el)
          }
        }
      },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])

  return (
    <div ref={ref} style={style}>
      {children}
    </div>
  )
}

export function SectionShell({
  theme,
  title,
  children,
  padded = true,
  style,
}: {
  theme: Theme
  title?: string
  children: ReactNode
  padded?: boolean
  style?: CSSProperties
}) {
  const c = colorsFor(theme)
  return (
    <section
      style={{
        padding: padded ? "28px 20px" : 0,
        fontFamily: fontFor(theme, "body"),
        color: c.text,
        ...style,
      }}
    >
      {title && (
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2
            style={{
              fontFamily: fontFor(theme, "display"),
              fontSize: 22,
              fontWeight: 600,
              fontStyle: "italic",
              color: c.accent,
              margin: 0,
            }}
          >
            {title}
          </h2>
          <ThemedDivider theme={theme} />
        </div>
      )}
      {children}
    </section>
  )
}

export function ThemedDivider({ theme }: { theme: Theme }) {
  const c = colorsFor(theme)
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "12px auto",
        maxWidth: 200,
      }}
    >
      <div style={{ flex: 1, height: 1, background: `${c.gold}44` }} />
      <span style={{ color: c.gold, fontSize: 14, opacity: 0.7 }}>
        {c.divider}
      </span>
      <div style={{ flex: 1, height: 1, background: `${c.gold}44` }} />
    </div>
  )
}

export function ThemedCard({
  theme,
  children,
  style,
}: {
  theme: Theme
  children: ReactNode
  style?: CSSProperties
}) {
  const c = colorsFor(theme)
  return (
    <div
      style={{
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function formatDateMs(dateStr?: string): string {
  if (!dateStr) return ""
  try {
    return new Date(dateStr).toLocaleDateString("ms-MY", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}

export function formatDateShort(dateStr?: string): string {
  if (!dateStr) return ""
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}
