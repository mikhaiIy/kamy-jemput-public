"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react"

/**
 * Five-step Malay guided tour over the Section editor, with a step list per
 * viewport: the desktop three-pane layout at >=1024px and the canvas-first
 * mobile shell below it.
 *
 * The component owns only ephemeral state (open step, highlight rectangle,
 * settle-in-flight flag, failure message). It holds no editor data and never
 * touches the draft pipeline: its only persistence is the account-level
 * completion marker written through the `onComplete` callback the editor
 * wires to `completeSectionEditorTourAction()`. Both finishing and dismissing
 * call that callback; a failed write keeps the tour open with a visible Malay
 * error so the customer can retry.
 *
 * Step targets are stable `data-editor-tour` hooks rendered by
 * `components/SectionEditor.tsx`. The overlay blocks pointer events on the
 * page while open, so advancing the tour can never trigger the highlighted
 * control's normal action.
 *
 * A target that is absent (for example a mobile shell hook while the full
 * Section stack pane is showing) resolves to no highlight rect; the panel is
 * then centred with no ring instead of crashing or highlighting the wrong
 * element.
 */

/** Minimum viewport width at which the desktop shell — and its tour — applies. */
export const DESKTOP_TOUR_QUERY = "(min-width: 1024px)"

/**
 * Sticky dashboard Navbar geometry (components/Navbar.tsx): 58px tall with
 * z-index 100. It is hidden while the editor is mounted on mobile
 * (`body:has(.section-editor) > header` in app/globals.css), so only the
 * desktop tour reserves room for it.
 */
export const NAVBAR_HEIGHT = 58
/** Panel stacking context: above the Navbar (z-index 100). */
const TOUR_Z_INDEX = 120
/** Panel breathing room from any viewport edge. */
const PANEL_GUTTER = 12
/** Navigation rail height on the mobile shell (app/globals.css `.se-rail`). */
const RAIL_HEIGHT = 76
/** Smallest permitted panel top: Navbar-plus-gutter on desktop, gutter on mobile. */
const PANEL_TOP_MIN_DESKTOP = NAVBAR_HEIGHT + PANEL_GUTTER
const PANEL_TOP_MIN_MOBILE = PANEL_GUTTER
/** The mobile panel must stay this far above the viewport bottom (rail + gutter). */
const PANEL_BOTTOM_RESERVE_MOBILE = RAIL_HEIGHT + PANEL_GUTTER

/**
 * Shared desktop-viewport signal for the tour and its launch/replay gates.
 * SSR snapshot is `true` (the editor is a desktop surface); the client
 * snapshot corrects it after hydration.
 */
export function useIsDesktopViewport(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const mq = window.matchMedia(DESKTOP_TOUR_QUERY)
    mq.addEventListener("change", onStoreChange)
    return () => mq.removeEventListener("change", onStoreChange)
  }, [])
  const getSnapshot = useCallback(() => window.matchMedia(DESKTOP_TOUR_QUERY).matches, [])
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}

/** The mobile shell's two panes. The desktop shell has its own three-pane branch. */
type MobilePane = "edit" | "stack"

type TourStep = {
  /** Stable data hook rendered by SectionEditor. */
  selector: string
  title: string
  body: string
  /**
   * Mobile-only: the shell pane this step needs open. The tour asks the editor
   * to switch through `onRequestPane` and restores the pane the customer
   * started on when the step is left.
   */
  pane?: MobilePane
  /** Mobile-only: a second element the animated reorder hint arrow points at. */
  arrowSelector?: string
  /** Mobile-only: scroll the target into view before measuring its rect. */
  scrollIntoView?: boolean
}

const STEPS: TourStep[] = [
  {
    selector: '[data-editor-tour="sidebar"]',
    title: "Senarai Bahagian",
    body:
      "Di sebelah kiri ialah senarai bahagian kad anda. Pilih satu bahagian untuk menyuntingnya, susun semula turutan, aktifkan atau lumpuhkan, dan tambah bahagian baharu di bawah.",
  },
  {
    selector: '[data-editor-tour="sub-form"]',
    title: "Borang Suntingan",
    body:
      "Bahagian tengah memaparkan borang bagi bahagian yang dipilih. Isi maklumat majlis anda di sini, dan pilih gaya bahagian jika ada.",
  },
  {
    selector: '[data-editor-tour="preview"]',
    title: "Pratonton Langsung",
    body:
      "Di sebelah kanan, anda melihat kad jemputan berubah serta-merta setiap kali anda menaip — inilah rupa yang akan dilihat oleh tetamu anda.",
  },
  {
    selector: '[data-editor-tour="save-indicator"]',
    title: "Status Simpanan",
    body:
      "Status di bawah nama template memberitahu anda apabila sistem menyimpan kerja anda secara automatik. Anda tidak memerlukan butang simpan — sistem merekod setiap suntingan anda.",
  },
  {
    selector: '[data-editor-tour="pay-button"]',
    title: "Teruskan ke Pembayaran",
    body:
      "Apabila semua bahagian lengkap, klik butang ini untuk membuat pembayaran dan menerbitkan kad jemputan anda.",
  },
]

const MOBILE_STEPS: TourStep[] = [
  {
    selector: '[data-editor-tour="mobile-canvas"]',
    pane: "edit",
    title: "Kad Jemputan Anda",
    body:
      "Ini kad jemputan anda, dipaparkan secara langsung. Ia berubah serta-merta setiap kali anda menaip.",
  },
  {
    selector: '[data-editor-tour="mobile-sheet"]',
    pane: "edit",
    title: "Borang Bahagian",
    body:
      "Borang bagi Bahagian yang sedang anda pilih. Isi maklumatnya di sini. Kerja anda disimpan secara automatik, jadi anda tidak perlu menekan butang simpan.",
  },
  {
    selector: '[data-editor-tour="mobile-detents"]',
    pane: "edit",
    title: "Ketinggian Borang",
    body:
      "Pilih antara tiga ketinggian borang: petak kecil untuk melihat lebih banyak kad, penuh untuk melihat lebih banyak borang.",
  },
  {
    selector: '[data-editor-tour="mobile-rail"]',
    pane: "edit",
    title: "Pandu Bahagian",
    body:
      "Butang Kembali dan Seterusnya membawa anda melalui setiap Bahagian yang diaktifkan mengikut turutan, manakala ☰ membuka senarai penuh Bahagian.",
  },
  {
    selector: '[data-editor-tour="mobile-stack-row"]',
    arrowSelector: '[data-editor-tour="mobile-stack-row"] .se-handle',
    pane: "stack",
    scrollIntoView: true,
    title: "Susun Bahagian",
    body:
      "Ini senarai penuh Bahagian dalam jemputan anda. Tarik pemegang ⋮⋮ untuk menukar turutan, ketik 👁 untuk melumpuhkan Bahagian tanpa membuangnya, dan × untuk membuangnya.",
  },
  {
    selector: '[data-editor-tour="pay-button"]',
    title: "Teruskan ke Pembayaran",
    body:
      "Apabila semua bahagian lengkap, klik butang ini untuk membuat pembayaran dan menerbitkan kad jemputan anda.",
  },
]

const PANEL_WIDTH = 360

/** Warm-neutral ink colors reused across the panel. */
const INK = {
  primary: "var(--primary)",
  gold: "var(--accent)",
  body: "var(--muted-foreground)",
  muted: "var(--muted-foreground)",
  line: "var(--border)",
}

/** The visual-viewport keyboard inset the mobile shell publishes as `--kb-inset`. */
function readKeyboardInset(): number {
  if (typeof document === "undefined") return 0
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--kb-inset")
  const value = parseFloat(raw)
  return Number.isFinite(value) && value > 0 ? value : 0
}

type Props = {
  /** Open/restart switch owned by SectionEditor; true also restarts at step one. */
  open: boolean
  /**
   * Persists the account-level completion marker. Resolves true only when the
   * marker is stored; on false the tour stays open with a retryable error.
   * Receives no editor data and must not mutate it.
   */
  onComplete: () => Promise<boolean>
  /** Called once completion succeeded; the editor closes the tour. */
  onSettled: () => void
  /**
   * Mobile-only observation of the shell's current pane, read once when the
   * tour opens so the Susun Bahagian step can be exited back to where the
   * customer started. The editor remains the owner of the state.
   */
  mobilePane?: MobilePane
  /**
   * Mobile-only request for a shell pane, implemented by SectionEditor as
   * `setMobilePane`. The tour never reaches into the DOM to change panes and
   * never asks for anything else.
   */
  onRequestPane?: (pane: MobilePane) => void
}

export function SectionEditorTour({
  open,
  onComplete,
  onSettled,
  mobilePane,
  onRequestPane,
}: Props) {
  const isDesktop = useIsDesktopViewport()
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [arrowRect, setArrowRect] = useState<DOMRect | null>(null)
  const [panelHeight, setPanelHeight] = useState(0)
  const [settleFailed, setSettleFailed] = useState(false)
  const [settling, setSettling] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  // The shell pane in effect when the tour opened. The Susun Bahagian step
  // restores it on every exit so no path strands the customer on the stack.
  const [paneBefore, setPaneBefore] = useState<MobilePane | null>(null)

  const steps = isDesktop ? STEPS : MOBILE_STEPS

  // Opening the tour (first visit or Help replay) always restarts at step
  // one. Adjusting state during render when `open` flips avoids an effect.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setPaneBefore(isDesktop ? null : mobilePane ?? null)
      setStepIdx(0)
      setSettleFailed(false)
      setSettling(false)
      // Drop the previous session's highlight before the first paint; the
      // rAF measure re-anchors it. Otherwise a replay's first frame paints a
      // stale ring, and a target can go stale if the shell re-renders.
      setRect(null)
      setArrowRect(null)
    }
  }

  const restorePane = useCallback(() => {
    if (isDesktop) return
    if (paneBefore && onRequestPane && mobilePane !== paneBefore) {
      onRequestPane(paneBefore)
    }
  }, [isDesktop, paneBefore, onRequestPane, mobilePane])

  const measure = useCallback(() => {
    if (!open || typeof window === "undefined") return
    const step = steps[Math.min(stepIdx, steps.length - 1)]
    const el = document.querySelector(step.selector)
    // A freshly revealed stack row can be below the fold; bring it into view
    // before reading its rect. Skip the scroll when it already fits so the
    // capture-phase scroll listener cannot loop.
    if (el && step.scrollIntoView) {
      const current = el.getBoundingClientRect()
      if (current.top < 8 || current.bottom > window.innerHeight - 8) {
        el.scrollIntoView({ block: "nearest" })
      }
    }
    setRect(el ? el.getBoundingClientRect() : null)
    const arrowEl = step.arrowSelector ? document.querySelector(step.arrowSelector) : null
    setArrowRect(arrowEl ? arrowEl.getBoundingClientRect() : null)
  }, [open, stepIdx, steps])

  useLayoutEffect(() => {
    // Measure after paint via rAF so the highlight rect matches laid-out DOM.
    // `mobilePane` re-runs this after a step's pane switch commits.
    const id = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(id)
  }, [measure, mobilePane])

  // Positioning uses the rendered panel height rather than a guessed height.
  // ResizeObserver also catches the completion alert and step-copy changes.
  useLayoutEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const measurePanel = () => {
      const nextHeight = panel.getBoundingClientRect().height
      setPanelHeight((height) => (height === nextHeight ? height : nextHeight))
    }
    measurePanel()
    const observer = new ResizeObserver(measurePanel)
    observer.observe(panel)
    window.addEventListener("resize", measurePanel)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measurePanel)
    }
  }, [open, stepIdx, settleFailed])

  useEffect(() => {
    if (!open) return
    // Capture phase so scrolls inside nested scrollers (Gaya panel, preview)
    // also re-anchor the highlight.
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [open, measure])

  const finishOrDismiss = useCallback(async () => {
    if (settling) return
    // Any exit from the tour — including finishing and dismissing — returns
    // the customer to the pane they were on before a pane step was entered.
    restorePane()
    setSettling(true)
    try {
      const ok = await onComplete()
      if (ok) onSettled()
      else setSettleFailed(true)
    } catch {
      setSettleFailed(true)
    } finally {
      setSettling(false)
    }
  }, [onComplete, onSettled, settling, restorePane])

  // Pane reconciliation. Each step declares the mobile pane it describes, so
  // the tour shows the screen it is talking about no matter where the customer
  // opened it from; a step with no pane restores the remembered starting pane.
  // The guard against the current pane keeps this from looping, and the
  // editor stays the owner of the state through `onRequestPane`.
  useEffect(() => {
    if (!open || isDesktop || !onRequestPane) return
    const step = steps[Math.min(stepIdx, steps.length - 1)]
    if (step.pane) {
      if (mobilePane !== step.pane) onRequestPane(step.pane)
    } else {
      restorePane()
    }
  }, [open, isDesktop, stepIdx, steps, mobilePane, onRequestPane, restorePane])

  // Step navigation clears the highlight so a pane switch cannot leave a stale
  // ring; the reconciliation effect above owns the pane changes.
  const goToStep = useCallback((next: number) => {
    setRect(null)
    setArrowRect(null)
    setStepIdx(next)
  }, [])

  // Modal focus management: move focus into the panel on open, trap Tab
  // navigation (and Escape-to-dismiss) while open, and restore focus to the
  // opener when the tour settles.

  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null
      panelRef.current?.focus()
    } else {
      restoreFocusRef.current?.focus?.()
      restoreFocusRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    // Capture phase intercepts Tab even if focus has escaped the panel.
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        void finishOrDismiss()
        return
      }
      if (event.key !== "Tab") return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>("button:not([disabled])")
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      // Only an enabled button counts as contained. The panel itself holds
      // initial focus on open (`tabIndex={-1}`), so `panel.contains(...)`
      // alone would let Shift+Tab escape before any button was visited.
      // Anything else — the panel, page background, or a disabled button —
      // is treated as escaped and wrapped back into the button list.
      const inList = focusables.includes(active as HTMLElement)
      if (event.shiftKey) {
        if (!inList || active === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (!inList || active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey, true)
    return () => document.removeEventListener("keydown", onKey, true)
  }, [open, finishOrDismiss])

  if (!open) return null

  const step = steps[Math.min(stepIdx, steps.length - 1)]
  const isLast = stepIdx === steps.length - 1

  const kbInset = readKeyboardInset()
  const topMin = isDesktop ? PANEL_TOP_MIN_DESKTOP : PANEL_TOP_MIN_MOBILE
  const bottomReserve = isDesktop ? PANEL_GUTTER : PANEL_BOTTOM_RESERVE_MOBILE
  const panelWidth = isDesktop ? PANEL_WIDTH : Math.max(1, window.innerWidth - PANEL_GUTTER * 2)

  // Every candidate uses the rendered panel height and is clamped between
  // the shell-safe top and viewport-safe bottom. On desktop the top clears
  // the sticky Navbar; on mobile it clears the navigation rail plus the
  // gutter, and any `--kb-inset` the mobile shell published. On a short
  // viewport the panel itself is constrained to that available space; its
  // middle content scrolls while the header and navigation controls remain
  // visible.
  const panelMaxHeight = Math.max(1, window.innerHeight - topMin - bottomReserve - kbInset)
  const renderedPanelHeight = Math.min(panelHeight || panelMaxHeight, panelMaxHeight)
  const panelTopMax = window.innerHeight - bottomReserve - kbInset - renderedPanelHeight
  const clampPanelTop = (top: number) =>
    Math.min(Math.max(top, topMin), Math.max(topMin, panelTopMax))
  let panelTop: number
  let panelLeft: number
  if (rect) {
    if (isDesktop) {
      const below = Math.max(rect.bottom + PANEL_GUTTER, topMin)
      const above = rect.top - PANEL_GUTTER - renderedPanelHeight
      const fitsBelow = below + renderedPanelHeight <= window.innerHeight - PANEL_GUTTER
      const fitsAbove = above >= topMin
      panelTop = fitsBelow ? below : fitsAbove ? above : clampPanelTop(below)
    } else {
      // Opposite-side rule: a target in the lower half puts the panel in the
      // upper area (steps 2–4), an upper-half target puts it below, and a
      // backdrop target that fills the screen (the live card canvas) puts it
      // at the bottom so the card's top stays visible and the highlight's top
      // edge stays clear.
      const targetCenterY = rect.top + rect.height / 2
      const targetDominatesViewport = rect.height >= window.innerHeight * 0.8
      panelTop = targetDominatesViewport
        ? clampPanelTop(window.innerHeight)
        : targetCenterY > window.innerHeight / 2
          ? clampPanelTop(topMin)
          : clampPanelTop(rect.bottom + PANEL_GUTTER)
    }
    panelLeft = isDesktop
      ? Math.min(
          Math.max(PANEL_GUTTER, rect.left),
          Math.max(PANEL_GUTTER, window.innerWidth - panelWidth - PANEL_GUTTER)
        )
      : PANEL_GUTTER
  } else {
    panelTop = clampPanelTop(window.innerHeight / 2 - renderedPanelHeight / 2)
    panelLeft = isDesktop
      ? Math.max(PANEL_GUTTER, window.innerWidth / 2 - panelWidth / 2)
      : PANEL_GUTTER
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Panduan penyunting: ${step.title}`}
      style={{ position: "fixed", inset: 0, zIndex: TOUR_Z_INDEX }}
    >
      {/* Blocker: swallows clicks so page controls cannot act mid-tour. */}
      <div style={{ position: "fixed", inset: 0 }} aria-hidden />
      {rect && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: 14,
            border: "2px solid var(--accent)",
            boxShadow: "0 0 0 9999px color-mix(in srgb, var(--foreground) 55%, transparent)",
            pointerEvents: "none",
            transition: "all 160ms ease",
          }}
        />
      )}
      {/* Reorder hint arrow: decoration only, above the dim overlay and the
          ring, non-interactive, and never announced (the copy carries it). It
          floats above the highlighted row and points down at the drag handle,
          where it covers no row content. */}
      {arrowRect && !isDesktop && (
        <span
          aria-hidden
          className="se-tour-arrow"
          style={{
            position: "fixed",
            top: arrowRect.top - 8,
            left: arrowRect.left + arrowRect.width / 2,
            zIndex: TOUR_Z_INDEX + 5,
          }}
        >
          ↕
        </span>
      )}
      <div
        role="document"
        ref={panelRef}
        tabIndex={-1}
        style={{
          position: "fixed",
          top: panelTop,
          left: panelLeft,
          width: panelWidth,
          maxWidth: "calc(100vw - 24px)",
          maxHeight: panelMaxHeight,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "linear-gradient(180deg, #fffdfa 0%, var(--background) 100%)",
          borderRadius: 16,
          border: `1px solid ${INK.line}`,
          boxShadow: "0 24px 56px color-mix(in srgb, var(--foreground) 32%, transparent), 0 2px 6px color-mix(in srgb, var(--foreground) 12%, transparent)",
          outline: "none",
        }}
      >
        {/* Gold accent rule anchoring the header hierarchy. */}
        <div
          aria-hidden
          style={{
            height: 3,
            background: `linear-gradient(90deg, ${INK.gold}, rgba(201, 152, 74, 0))`,
          }}
        />
        <div style={{ padding: "14px 20px 0", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: INK.gold,
              }}
            >
              Panduan Penyunting
              <span
                aria-hidden
                style={{ width: 3, height: 3, borderRadius: 99, background: INK.line }}
              />
              <span style={{ color: INK.muted }}>Langkah {stepIdx + 1} / {steps.length}</span>
            </span>
            <button
              type="button"
              onClick={() => void finishOrDismiss()}
              disabled={settling}
              aria-label="Tutup panduan"
              title="Tutup panduan"
              style={{
                background: "transparent",
                border: "none",
                cursor: settling ? "default" : "pointer",
                color: INK.muted,
                fontSize: 18,
                lineHeight: 1,
                padding: "2px 4px",
                borderRadius: 6,
              }}
            >
              ×
            </button>
          </div>
        </div>
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "0 20px",
          }}
        >
          <h3
            style={{
              margin: "0 0 8px",
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 21,
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              color: INK.primary,
            }}
          >
            {step.title}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              lineHeight: 1.65,
              color: INK.body,
            }}
          >
            {step.body}
          </p>
          {settleFailed && (
            <p
              role="alert"
              style={{
                margin: "12px 0 0",
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(192, 57, 43, 0.08)",
                border: "1px solid rgba(192, 57, 43, 0.25)",
                fontSize: 12,
                fontWeight: 600,
                color: "#c0392b",
              }}
            >
              Kami belum dapat menandakan panduan ini sebagai selesai. Sila cuba lagi.
            </p>
          )}
          {/* Step emphasis: segmented progress dots for the five stops. */}
          <div
            aria-hidden
            style={{
              display: "flex",
              gap: 6,
              marginTop: 16,
            }}
          >
            {steps.map((_, i) => (
              <span
                key={i}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 99,
                  background:
                    i <= stepIdx ? INK.gold : INK.line,
                  transition: "background 160ms ease",
                }}
              />
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "14px 20px 18px",
            borderTop: `1px solid ${INK.line}`,
            flexShrink: 0,
          }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: INK.muted }}>
              {stepIdx + 1} daripada {steps.length}
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => goToStep(stepIdx - 1)}
                disabled={stepIdx === 0 || settling}
                style={tourButtonStyle(false, stepIdx === 0 || settling)}
              >
                Kembali
              </button>
              {isLast ? (
                <button
                  type="button"
                  onClick={() => void finishOrDismiss()}
                  disabled={settling}
                  style={tourButtonStyle(true, settling)}
                >
                  {settling ? "Menyimpan…" : "Selesai"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goToStep(stepIdx + 1)}
                  disabled={settling}
                  style={tourButtonStyle(true, false)}
                >
                  Seterusnya
                </button>
              )}
            </span>
          </div>
      </div>
    </div>
  )
}

function tourButtonStyle(primary: boolean, disabled: boolean): CSSProperties {
  return {
    border: primary ? "none" : `1px solid ${INK.line}`,
    borderRadius: 9,
    padding: "8px 16px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    background: primary ? INK.primary : "transparent",
    color: primary ? "#fff" : INK.body,
    boxShadow: primary && !disabled ? "0 2px 8px color-mix(in srgb, var(--primary) 28%, transparent)" : "none",
    opacity: disabled ? 0.45 : 1,
  }
}
