"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"

export type TemplateShowcaseCardProps = {
  id: string
  name: string
  mood: string
  categoryLabel: string
  priceMyr: number | null
  livePreview: boolean
  eager?: boolean
}

const PREVIEW_WIDTH = 390
const PREVIEW_HEIGHT = 2200
const SCROLL_SPEED = 75
const HOLD_DELAY = 450
const LONG_PRESS_CLICK_GUARD = 1000

export function TemplateShowcaseCard({
  id,
  name,
  mood,
  categoryLabel,
  priceMyr,
  livePreview,
  eager = false,
}: TemplateShowcaseCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const loadSyncFrameRef = useRef<number | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressActivatedRef = useRef(false)
  const offsetRef = useRef(0)
  const maximumOffsetRef = useRef(0)
  const [shouldMountPreview, setShouldMountPreview] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [scale, setScale] = useState(1)
  const [previewViewportHeight, setPreviewViewportHeight] = useState<number | null>(null)

  const syncIframeScroll = useCallback((behavior: ScrollBehavior = "auto") => {
    const boundedOffset = Math.max(
      0,
      Math.min(offsetRef.current, maximumOffsetRef.current),
    )
    offsetRef.current = boundedOffset
    iframeRef.current?.contentWindow?.scrollTo({
      top: boundedOffset,
      behavior,
    })
  }, [])

  useEffect(() => {
    return () => {
      if (loadSyncFrameRef.current !== null) {
        cancelAnimationFrame(loadSyncFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!livePreview) return

    const target = cardRef.current
    if (!target) return

    if (typeof IntersectionObserver === "undefined") {
      const mountTimer = setTimeout(() => setShouldMountPreview(true), 0)
      return () => clearTimeout(mountTimer)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setShouldMountPreview(true)
        observer.disconnect()
      },
      { rootMargin: eager ? "800px 0px" : "500px 0px" },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [eager, livePreview])

  useEffect(() => {
    if (!livePreview) return

    const screen = screenRef.current
    if (!screen) return

    const measure = () => {
      const bounds = screen.getBoundingClientRect()
      if (bounds.width <= 0 || bounds.height <= 0) return

      const nextScale = bounds.width / PREVIEW_WIDTH
      const visibleLogicalHeight = bounds.height / nextScale
      maximumOffsetRef.current = Math.max(0, PREVIEW_HEIGHT - visibleLogicalHeight)
      setScale(nextScale)
      setPreviewViewportHeight(visibleLogicalHeight)
      syncIframeScroll()
    }

    measure()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure)
      return () => window.removeEventListener("resize", measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(screen)
    return () => observer.disconnect()
  }, [livePreview, syncIframeScroll])

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)")
    let reducedMotion = reducedMotionQuery.matches

    const clearAnimation = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }

    const clearHoldTimer = () => {
      if (holdTimerRef.current !== null) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
    }

    const clearClickGuardTimer = () => {
      if (clickGuardTimerRef.current !== null) {
        clearTimeout(clickGuardTimerRef.current)
        clickGuardTimerRef.current = null
      }
    }

    const resetToTop = (animate: boolean) => {
      clearAnimation()
      clearHoldTimer()
      offsetRef.current = 0
      syncIframeScroll(animate && !reducedMotion ? "smooth" : "auto")
    }

    const startScroll = () => {
      if (
        reducedMotion ||
        !livePreview ||
        !previewLoaded ||
        previewFailed ||
        animationFrameRef.current !== null
      ) return false

      const previewWindow = iframeRef.current?.contentWindow
      if (!previewWindow || maximumOffsetRef.current <= offsetRef.current) return false
      let previousTime: number | null = null

      const step = (time: number) => {
        if (previousTime === null) previousTime = time
        const elapsedSeconds = (time - previousTime) / 1000
        previousTime = time
        const nextOffset = Math.min(
          maximumOffsetRef.current,
          offsetRef.current + elapsedSeconds * SCROLL_SPEED,
        )
        offsetRef.current = nextOffset
        syncIframeScroll()

        if (nextOffset < maximumOffsetRef.current) {
          animationFrameRef.current = requestAnimationFrame(step)
        } else {
          animationFrameRef.current = null
        }
      }

      animationFrameRef.current = requestAnimationFrame(step)
      return true
    }

    const handleMouseEnter = () => {
      if (hoverQuery.matches) startScroll()
    }
    const handleMouseLeave = () => resetToTop(true)
    const handleTouchStart = () => {
      clearHoldTimer()
      clearClickGuardTimer()
      longPressActivatedRef.current = false
      if (reducedMotion) return
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null
        longPressActivatedRef.current = startScroll()
      }, HOLD_DELAY)
    }
    const handleTouchFinish = () => {
      resetToTop(true)
      if (!longPressActivatedRef.current) return
      clearClickGuardTimer()
      clickGuardTimerRef.current = setTimeout(() => {
        longPressActivatedRef.current = false
        clickGuardTimerRef.current = null
      }, LONG_PRESS_CLICK_GUARD)
    }
    const handleClick = (event: MouseEvent) => {
      if (!longPressActivatedRef.current) return
      event.preventDefault()
      longPressActivatedRef.current = false
      clearClickGuardTimer()
    }
    const handleContextMenu = (event: MouseEvent) => {
      if (longPressActivatedRef.current) event.preventDefault()
    }
    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches
      if (reducedMotion) resetToTop(false)
    }
    const handleHoverCapabilityChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        resetToTop(false)
      } else if (card.matches(":hover")) {
        startScroll()
      }
    }

    card.addEventListener("mouseenter", handleMouseEnter)
    card.addEventListener("mouseleave", handleMouseLeave)
    card.addEventListener("touchstart", handleTouchStart, { passive: true })
    card.addEventListener("touchend", handleTouchFinish, { passive: true })
    card.addEventListener("touchcancel", handleTouchFinish, { passive: true })
    card.addEventListener("touchmove", handleTouchFinish, { passive: true })
    card.addEventListener("click", handleClick)
    card.addEventListener("contextmenu", handleContextMenu)
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange)
    hoverQuery.addEventListener("change", handleHoverCapabilityChange)

    // The iframe may finish loading after the pointer has already entered.
    if (hoverQuery.matches && card.matches(":hover")) startScroll()

    return () => {
      clearAnimation()
      clearHoldTimer()
      clearClickGuardTimer()
      longPressActivatedRef.current = false
      card.removeEventListener("mouseenter", handleMouseEnter)
      card.removeEventListener("mouseleave", handleMouseLeave)
      card.removeEventListener("touchstart", handleTouchStart)
      card.removeEventListener("touchend", handleTouchFinish)
      card.removeEventListener("touchcancel", handleTouchFinish)
      card.removeEventListener("touchmove", handleTouchFinish)
      card.removeEventListener("click", handleClick)
      card.removeEventListener("contextmenu", handleContextMenu)
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange)
      hoverQuery.removeEventListener("change", handleHoverCapabilityChange)
    }
  }, [livePreview, previewFailed, previewLoaded, syncIframeScroll])

  return (
    <Link
      ref={cardRef}
      href={`/templates/${id}`}
      className="template-showcase-card"
      style={card}
    >
      <div style={deviceWrap}>
        <div style={phoneFrame}>
          <div ref={screenRef} style={screen}>
            <div className="template-showcase-fallback" style={fallbackFace}>
              <span style={fallbackMood}>{mood}</span>
              <span style={flourish}>✦</span>
              <span style={couple}>Sarah &amp; Adam</span>
              <span style={date}>26 · 12 · 2026</span>
            </div>

            {shouldMountPreview &&
            livePreview &&
            !previewFailed &&
            previewViewportHeight !== null ? (
              <div
                style={{
                  ...previewLayer,
                  opacity: previewLoaded ? 1 : 0,
                }}
              >
                <div className="template-showcase-preview-track" style={previewTrack}>
                  <div
                    style={{
                      ...scaledPreview,
                      transform: `scale(${scale})`,
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      src={`/templates/preview/${id}`}
                      title={`${name} live preview`}
                      loading="lazy"
                      tabIndex={-1}
                      aria-hidden="true"
                      scrolling="no"
                      onLoad={() => {
                        syncIframeScroll()
                        if (loadSyncFrameRef.current !== null) {
                          cancelAnimationFrame(loadSyncFrameRef.current)
                        }
                        loadSyncFrameRef.current = requestAnimationFrame(() => {
                          loadSyncFrameRef.current = null
                          syncIframeScroll()
                          setPreviewLoaded(true)
                        })
                      }}
                      onError={() => {
                        if (loadSyncFrameRef.current !== null) {
                          cancelAnimationFrame(loadSyncFrameRef.current)
                          loadSyncFrameRef.current = null
                        }
                        setPreviewLoaded(false)
                        setPreviewFailed(true)
                      }}
                      style={{
                        ...iframe,
                        height: previewViewportHeight,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <span aria-hidden="true" style={dynamicIsland}>
            <span style={islandSensor} />
          </span>
          <span aria-hidden="true" style={homeIndicator} />
          <span aria-hidden="true" style={bottomEdge} />

          <span style={categoryChip}>{categoryLabel}</span>
          <span className="template-showcase-affordance" style={affordance}>
            Pratonton ↗
          </span>
        </div>
      </div>

      <div style={metaBlock}>
        <span style={metaName}>{name}</span>
        {priceMyr !== null ? (
          <span style={metaPrice}>RM {(priceMyr / 100).toFixed(0)}</span>
        ) : (
          <span style={metaPriceComing}>Akan Datang</span>
        )}
        <span style={metaMood}>{mood}</span>
      </div>
    </Link>
  )
}

const card: CSSProperties = {
  display: "block",
  width: "100%",
  minWidth: 150,
  maxWidth: 320,
  marginInline: "auto",
  color: "var(--foreground)",
}

const deviceWrap: CSSProperties = {
  padding: "clamp(8px, 3.5%, 12px)",
}

const phoneFrame: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "9 / 19",
  padding: "clamp(6px, 2.8%, 9px)",
  boxSizing: "border-box",
  overflow: "hidden",
  border: "1px solid #08080b",
  borderRadius: "15% / 7.1%",
  background: "linear-gradient(145deg, #4a4952 0%, #17171d 18%, #07070a 72%, #292830 100%)",
  boxShadow: [
    "0 1px 0 rgba(255,255,255,0.28) inset",
    "1px 0 0 rgba(255,255,255,0.1) inset",
    "-2px 0 3px rgba(0,0,0,0.72) inset",
    "0 16px 30px -17px rgba(22,14,35,0.8)",
  ].join(", "),
}

const screen: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  borderRadius: "13.2% / 6.25%",
  background: "var(--background)",
  boxShadow: "0 0 0 1px rgba(0,0,0,0.9)",
  isolation: "isolate",
  WebkitMaskImage: "-webkit-radial-gradient(white, black)",
}

const dynamicIsland: CSSProperties = {
  position: "absolute",
  zIndex: 8,
  top: "2.45%",
  left: "50%",
  width: "31%",
  aspectRatio: "3.25 / 1",
  borderRadius: 999,
  background: "#020204",
  boxShadow: "0 1px 1px rgba(255,255,255,0.08), 0 2px 5px rgba(0,0,0,0.45) inset",
  transform: "translateX(-50%)",
}

const islandSensor: CSSProperties = {
  position: "absolute",
  top: "31%",
  right: "11%",
  width: "10%",
  aspectRatio: "1",
  borderRadius: "50%",
  background: "radial-gradient(circle at 38% 35%, #304766 0%, #111c30 26%, #05060b 62%)",
  boxShadow: "0 0 2px rgba(68,105,151,0.7)",
}

const homeIndicator: CSSProperties = {
  position: "absolute",
  zIndex: 8,
  bottom: "2.25%",
  left: "50%",
  width: "34%",
  height: 4,
  maxHeight: "0.7%",
  borderRadius: 999,
  background: "rgba(8,8,10,0.86)",
  boxShadow: "0 1px 1px rgba(255,255,255,0.14)",
  transform: "translateX(-50%)",
}

const bottomEdge: CSSProperties = {
  position: "absolute",
  zIndex: 7,
  right: "18%",
  bottom: 0,
  left: "18%",
  height: 2,
  borderRadius: "999px 999px 0 0",
  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
}

const fallbackFace: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "20% 8%",
  textAlign: "center",
  background: "linear-gradient(150deg, #fff 0%, var(--background) 48%, var(--secondary) 100%)",
  color: "var(--primary)",
}

const fallbackMood: CSSProperties = {
  fontFamily: "var(--font-jakarta), sans-serif",
  color: "var(--muted-foreground)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
}

const flourish: CSSProperties = {
  margin: "14px 0 4px",
  color: "var(--accent)",
  fontSize: 14,
}

const couple: CSSProperties = {
  fontFamily: "var(--font-cormorant), serif",
  fontSize: "clamp(25px, 10vw, 36px)",
  fontWeight: 600,
  lineHeight: 1,
}

const date: CSSProperties = {
  fontFamily: "var(--font-cormorant), serif",
  color: "var(--muted-foreground)",
  fontSize: 14,
  letterSpacing: "0.12em",
}

const previewLayer: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  overflow: "hidden",
  background: "var(--background)",
  pointerEvents: "none",
  transition: "opacity 240ms ease",
}

const previewTrack: CSSProperties = {
  position: "absolute",
  inset: "0 auto auto 0",
  width: "100%",
  willChange: "transform",
  transform: "translateY(0)",
}

const scaledPreview: CSSProperties = {
  width: PREVIEW_WIDTH,
  height: PREVIEW_HEIGHT,
  transformOrigin: "top left",
}

const iframe: CSSProperties = {
  display: "block",
  width: PREVIEW_WIDTH,
  height: PREVIEW_HEIGHT,
  border: 0,
  background: "var(--background)",
  pointerEvents: "none",
}

const categoryChip: CSSProperties = {
  position: "absolute",
  zIndex: 6,
  top: "8.5%",
  left: "7%",
  padding: "5px 8px",
  borderRadius: 999,
  background: "var(--primary)",
  color: "var(--background)",
  fontFamily: "var(--font-jakarta), sans-serif",
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: "0.12em",
  lineHeight: 1,
  textTransform: "uppercase",
  boxShadow: "0 4px 12px rgba(26,18,8,0.18)",
}

const metaBlock: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 5,
  padding: "10px 6px 14px",
  textAlign: "center",
}

const metaName: CSSProperties = {
  fontFamily: "var(--font-playfair), serif",
  fontSize: 17,
  fontWeight: 600,
  lineHeight: 1.2,
  color: "var(--primary)",
}

const metaPrice: CSSProperties = {
  fontFamily: "var(--font-jakarta), sans-serif",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "var(--accent)",
}

const metaPriceComing: CSSProperties = {
  fontFamily: "var(--font-jakarta), sans-serif",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "var(--muted-foreground)",
}

const metaMood: CSSProperties = {
  fontFamily: "var(--font-jakarta), sans-serif",
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--muted-foreground)",
}

const affordance: CSSProperties = {
  position: "absolute",
  zIndex: 6,
  right: "7%",
  bottom: "5.5%",
  padding: "7px 10px",
  border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--background) 90%, transparent)",
  color: "var(--primary)",
  fontFamily: "var(--font-jakarta), sans-serif",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  boxShadow: "0 5px 16px rgba(26,18,8,0.12)",
  backdropFilter: "blur(6px)",
}
