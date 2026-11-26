import type { CSSProperties, ReactNode } from "react"

/**
 * Standardised live-preview surface.
 *
 * `phone` — a device frame with a transparent screen (the card paints its own
 * background) and a thumb-only scrollbar (`.phone-scroll`, see globals.css).
 * This is the default so every preview is judged at true mobile width instead
 * of being stretched to whatever the editor column happens to be.
 *
 * `wide` — the legacy fallback: the card simply fills the column width. Kept
 * behind a toggle so we can A/B the phone framing against the old behaviour.
 *
 * `bare` — a full-bleed, bezel-less scroll container for the mobile editor,
 * where the real device already provides the frame.
 */
export function PhonePreview({
  mode,
  children,
}: {
  mode: "phone" | "wide" | "bare"
  children: ReactNode
}) {
  if (mode === "bare") {
    return (
      <div className="phone-scroll" style={bareScreen}>
        {children}
      </div>
    )
  }

  if (mode === "wide") {
    return (
      <div className="phone-scroll" style={wideScreen}>
        {children}
      </div>
    )
  }

  return (
    <div style={bezel}>
      <span aria-hidden style={speaker} />
      <div className="phone-scroll" style={screen}>
        {children}
      </div>
    </div>
  )
}

const bezel: CSSProperties = {
  position: "relative",
  width: 340,
  maxWidth: "100%",
  aspectRatio: "340 / 712",
  borderRadius: 46,
  padding: "16px 10px 12px",
  background: "linear-gradient(160deg, #26262e 0%, #101015 60%, #050507 100%)",
  boxShadow:
    "0 30px 60px -18px rgba(0,0,0,0.5), 0 2px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(255,255,255,0.04)",
  boxSizing: "border-box",
}

const speaker: CSSProperties = {
  position: "absolute",
  top: 7,
  left: "50%",
  transform: "translateX(-50%)",
  width: 46,
  height: 5,
  borderRadius: 999,
  background: "rgba(255,255,255,0.18)",
  zIndex: 3,
}

const screen: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: 34,
  overflowY: "auto",
  overflowX: "hidden",
  background: "transparent",
  position: "relative",
  // Contain the card's own background paint to the rounded screen.
  isolation: "isolate",
  WebkitMaskImage: "-webkit-radial-gradient(white, black)",
}

const wideScreen: CSSProperties = {
  width: "100%",
  maxWidth: 460,
  height: 712,
  borderRadius: 16,
  overflowY: "auto",
  overflowX: "hidden",
  border: "1px solid var(--border)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
}

const bareScreen: CSSProperties = {
  width: "100%",
  height: "100%",
  overflowY: "auto",
}
