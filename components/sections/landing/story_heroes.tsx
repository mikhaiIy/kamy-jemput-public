"use client"

import { useEffect, useRef, useState } from "react"
import type { SectionRenderer } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import { splitHeadline, parseDateParts, monthName, weekdayName } from "./_hero_helpers"

// ---------------------------------------------------------------------------
// Two additional storytelling heroes (jestudio-inspired). Both follow the
// same recipe as sakura_depth: a tap-to-open entrance, then a 3-plane depth
// composition (background / giant type / photo in front) where the planes
// drift at different rates under pointer + scroll.
//
//   PosterLuxe      — jestudio "simple-luxury": minimalist editorial poster.
//                     Giant tracked serif names; the photo panel overlaps the
//                     type; a calendar-style date card overlaps the photo.
//   DoodleScrapbook — jestudio "cherry-blossom" playfulness pushed further:
//                     crayon fonts (Amatic SC + Caveat), hand-drawn SVG
//                     doodles, washi-taped polaroid, sticker badges.
//
// SSR-safe: all scattered positions come from constant arrays (no
// Math.random in render — Sections are server-rendered).
// ---------------------------------------------------------------------------

type MotionPlane = {
  ref: React.RefObject<HTMLDivElement | null>
  mx: number
  my: number
  sy: number
}

/**
 * Pointer + scroll parallax over up to three planes. Each plane's element
 * gets `translate3d(cx*mx, scroll*sy + cy*my, 0)`. Pointer input only on
 * `(pointer: fine)`; everything stops under prefers-reduced-motion. Pass
 * refs created with useRef — the plane list is captured on first render.
 */
function useHeroMotion(planes: MotionPlane[]): boolean {
  const [reduced, setReduced] = useState(false)
  const conf = useRef(planes)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches)
    const onMq = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener?.("change", onMq)

    const fineMq = window.matchMedia("(pointer: fine)")
    let raf = 0
    let scrollY = window.scrollY
    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0

    const tick = () => {
      if (mq.matches) {
        raf = 0
        return
      }
      cx += (tx - cx) * 0.07
      cy += (ty - cy) * 0.07
      for (const p of conf.current) {
        const el = p.ref.current
        if (!el) continue
        el.style.transform = `translate3d(${cx * p.mx}px, ${scrollY * p.sy + cy * p.my}px, 0)`
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)

    const onScroll = () => {
      scrollY = window.scrollY
    }
    const onPointer = (e: PointerEvent) => {
      if (!fineMq.matches || mq.matches) return
      tx = (e.clientX / window.innerWidth) * 2 - 1
      ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    const onLeave = () => {
      tx = 0
      ty = 0
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("pointermove", onPointer, { passive: true })
    window.addEventListener("pointerleave", onLeave)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("pointermove", onPointer)
      window.removeEventListener("pointerleave", onLeave)
      mq.removeEventListener?.("change", onMq)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  return reduced
}

// ---------------------------------------------------------------------------
// PosterLuxe
// ---------------------------------------------------------------------------

const POSTER_CSS = `
  @keyframes pl-rise {
    0%   { opacity: 0; transform: translateY(26px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes pl-photo-in {
    0%   { opacity: 0; transform: scale(0.97) translateY(18px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes pl-card-pop {
    0%   { opacity: 0; transform: translateY(10px) rotate(-2deg) scale(0.92); }
    70%  { opacity: 1; transform: translateY(-2px) rotate(0.5deg) scale(1.03); }
    100% { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
  }
  @keyframes pl-pulse {
    0%   { transform: scale(0.9); opacity: 0.7; }
    70%  { transform: scale(1.6); opacity: 0; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes pl-blink { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
  .pl-open-1 { animation: pl-rise 0.8s ease 0.1s both; }
  .pl-open-2 { animation: pl-rise 1.0s cubic-bezier(0.22, 0.61, 0.36, 1) 0.3s both; }
  .pl-open-3 { animation: pl-photo-in 1.1s cubic-bezier(0.22, 0.61, 0.36, 1) 0.65s both; }
  .pl-open-4 { animation: pl-card-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 1.5s both; }
  .pl-open-5 { animation: pl-rise 0.8s ease 1.7s both; }
  [data-pl-reduced="true"] .pl-open-1, [data-pl-reduced="true"] .pl-open-2,
  [data-pl-reduced="true"] .pl-open-3, [data-pl-reduced="true"] .pl-open-4,
  [data-pl-reduced="true"] .pl-open-5 { animation: none; opacity: 1; transform: none; }
  [data-pl-reduced="true"] .pl-pulse-ring { animation: none; opacity: 0; }
`

export const PosterLuxe: SectionRenderer<"landing"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  // Editorial signature pairing, deliberately independent of the Gaya's
  // script font: wide-tracked sans micro-type + italic serif display.
  const serif = "var(--font-cormorant), Georgia, serif"
  const sans = fontFor(theme, "body") || "var(--font-jakarta), sans-serif"

  const { left: nameLeft, right: nameRight } = splitHeadline(data.headline || "")
  const dateParts = parseDateParts(data.eventDate)
  const hasPhoto = !!data.coverPhotoUrl

  const [opened, setOpened] = useState(false)
  const typeRef = useRef<HTMLDivElement | null>(null)
  const photoRef = useRef<HTMLDivElement | null>(null)
  const reduced = useHeroMotion([
    { ref: typeRef, mx: 7, my: 5, sy: 0.06 },    // giant type (back)
    { ref: photoRef, mx: -9, my: -6, sy: -0.04 }, // photo panel (front)
  ])

  return (
    <section
      data-pl-reduced={reduced ? "true" : "false"}
      style={{
        position: "relative",
        minHeight: "100dvh",
        overflow: "hidden",
        isolation: "isolate",
        background: c.bg,
        color: c.text,
        fontFamily: sans,
      }}
    >
      <style>{POSTER_CSS}</style>

      {/* vertical side caption */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          writingMode: "vertical-rl",
          fontSize: 8,
          letterSpacing: "0.5em",
          color: c.muted,
          opacity: 0.55,
          zIndex: 4,
          textTransform: "uppercase",
        }}
      >
        Invitation {dateParts ? `· ${dateParts.year}` : ""}
      </span>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "52px 22px 44px",
        }}
      >
        {/* eyebrow */}
        <div className={opened ? "pl-open-1" : undefined} style={{ opacity: opened ? undefined : 0, textAlign: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.55em", textTransform: "uppercase", color: c.muted, paddingLeft: "0.55em" }}>
            {data.tagline || "We are getting married"}
          </span>
        </div>

        {/* plane 0 — giant poster type; the photo overlaps its lower part */}
        <div
          ref={typeRef}
          className={opened ? "pl-open-2" : undefined}
          style={{
            opacity: opened ? undefined : 0,
            textAlign: "center",
            lineHeight: 0.96,
            willChange: "transform",
            position: "relative",
            zIndex: 0,
          }}
        >
          <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 500, fontSize: "clamp(46px, 17cqw, 84px)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {nameLeft || "Alex"}
            {nameRight && (
              <>
                <span aria-hidden style={{ fontStyle: "italic", color: c.accent, padding: "0 0.08em", textTransform: "none" }}>
                  &amp;
                </span>
                {nameRight}
              </>
            )}
          </h1>
        </div>

        {/* plane 1 — photo panel pulled up over the type */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "clamp(-34px, -7cqw, -16px)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            ref={photoRef}
            className={opened ? "pl-open-3" : undefined}
            style={{ opacity: opened ? undefined : 0, position: "relative", willChange: "transform" }}
          >
            <div
              style={{
                width: "min(72cqw, 310px)",
                aspectRatio: "3 / 4",
                background: hasPhoto
                  ? `url(${data.coverPhotoUrl}) center/cover no-repeat`
                  : `linear-gradient(170deg, ${c.text}10 0%, ${c.text}22 100%)`,
                filter: hasPhoto ? "saturate(0.82) contrast(1.04)" : "none",
                border: `1px solid ${c.text}22`,
                boxShadow: "0 26px 60px rgba(0,0,0,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!hasPhoto && (
                <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 15, color: c.muted }}>
                  your photo here
                </span>
              )}
            </div>

            {/* calendar-style date card overlapping the photo (simple-luxury) */}
            <div
              className={opened ? "pl-open-4" : undefined}
              style={{
                opacity: opened ? undefined : 0,
                position: "absolute",
                left: -14,
                bottom: -18,
                background: "#ffffff",
                color: "#161616",
                padding: "12px 16px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.16)",
                textAlign: "center",
                minWidth: 130,
              }}
            >
              {dateParts ? (
                <>
                  <div style={{ fontSize: 8, letterSpacing: "0.4em", color: "#9a9a9a", paddingLeft: "0.4em" }}>
                    {weekdayName(data.eventDate)}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, margin: "6px 0 2px" }}>
                    <span style={{ fontSize: 10, letterSpacing: "0.2em" }}>{monthName(data.eventDate)}</span>
                    <span style={{ fontFamily: serif, fontSize: 34, lineHeight: 1, color: c.accent }}>
                      {String(Number(dateParts.day))}
                    </span>
                    <span style={{ fontSize: 10, letterSpacing: "0.2em" }}>{dateParts.year}</span>
                  </div>
                  {data.subhead && (
                    <div style={{ fontSize: 8, letterSpacing: "0.18em", color: "#9a9a9a", marginTop: 4 }}>
                      {data.subhead}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14 }}>save the date</div>
              )}
            </div>
          </div>
        </div>

        {/* footer line */}
        <div className={opened ? "pl-open-5" : undefined} style={{ opacity: opened ? undefined : 0, textAlign: "center", marginTop: 42 }}>
          <span aria-hidden style={{ color: c.accent, fontSize: 13, animation: reduced ? "none" : "pl-blink 2.4s ease-in-out infinite" }}>
            ✳
          </span>
          <div style={{ fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: c.muted, marginTop: 8, paddingLeft: "0.4em" }}>
            scroll for the story
          </div>
        </div>
      </div>

      {/* ── entrance — minimalist gallery-card ── */}
      <div
        onClick={() => setOpened(true)}
        role="button"
        aria-label="Buka jemputan"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          background: c.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          cursor: "pointer",
          textAlign: "center",
          padding: "0 30px",
          opacity: opened ? 0 : 1,
          pointerEvents: opened ? "none" : "auto",
          transition: "opacity 0.55s ease",
        }}
      >
        <span style={{ fontSize: 9, letterSpacing: "0.55em", textTransform: "uppercase", color: c.muted, paddingLeft: "0.55em" }}>
          Wedding Invitation
        </span>
        <div style={{ width: 1, height: 38, background: `${c.text}33` }} />
        <h1 style={{ margin: 0, fontFamily: serif, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(34px, 11cqw, 52px)", lineHeight: 1.15 }}>
          {data.headline || "Alex & Mei"}
        </h1>
        {dateParts && (
          <span style={{ fontSize: 11, letterSpacing: "0.45em", color: c.muted, paddingLeft: "0.45em" }}>
            {dateParts.day} · {dateParts.month} · {dateParts.year}
          </span>
        )}
        <div style={{ width: 1, height: 38, background: `${c.text}33` }} />
        <div style={{ position: "relative", width: 34, height: 34 }}>
          <span
            className="pl-pulse-ring"
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `1px solid ${c.accent}`,
              animation: reduced ? "none" : "pl-pulse 2.2s ease-out infinite",
            }}
          />
          <span
            style={{
              position: "absolute",
              inset: 8,
              borderRadius: "50%",
              background: c.accent,
            }}
          />
        </div>
        <span style={{ fontSize: 9, letterSpacing: "0.35em", textTransform: "uppercase", color: c.muted, paddingLeft: "0.35em" }}>
          tap anywhere to enter
        </span>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// DoodleScrapbook
// ---------------------------------------------------------------------------

// Scattered doodles: position, glyph kind, size, rotation, wobble delay.
const DOODLES: readonly {
  left: string
  top: string
  kind: "heart" | "star" | "sparkle" | "xoxo" | "swirl"
  size: number
  rot: number
  delay: number
}[] = [
  { left: "6%",  top: "8%",  kind: "heart",   size: 22, rot: -14, delay: 0 },
  { left: "86%", top: "6%",  kind: "star",    size: 20, rot: 12,  delay: 0.8 },
  { left: "8%",  top: "44%", kind: "sparkle", size: 16, rot: 0,   delay: 1.6 },
  { left: "90%", top: "38%", kind: "heart",   size: 14, rot: 18,  delay: 0.4 },
  { left: "4%",  top: "78%", kind: "xoxo",    size: 15, rot: -8,  delay: 1.2 },
  { left: "84%", top: "82%", kind: "swirl",   size: 26, rot: 6,   delay: 2.0 },
  { left: "70%", top: "16%", kind: "sparkle", size: 12, rot: 20,  delay: 2.4 },
  { left: "16%", top: "20%", kind: "swirl",   size: 18, rot: -22, delay: 2.8 },
]

function Doodle({ kind, size, color }: { kind: string; size: number; color: string }) {
  if (kind === "heart")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 19c-4.5-3.4-8-6.4-7.6-10C4.7 6 7 4.8 9 6c1.2.7 2.4 2 3 3 .6-1 1.8-2.3 3-3 2-1.2 4.3 0 4.6 3 .4 3.6-3.1 6.6-7.6 10z"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="2.5 2"
        />
      </svg>
    )
  if (kind === "star")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3l2.4 6.2L21 10l-5 4.2 1.6 6.6L12 17l-5.6 3.8L8 14.2 3 10l6.6-.8L12 3z"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    )
  if (kind === "sparkle")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  if (kind === "swirl")
    return (
      <svg width={size} height={size} viewBox="0 0 32 24" fill="none" aria-hidden>
        <path
          d="M2 20c6 2 10-2 9-7-.8-4-6-4-6 0 0 5 8 8 14 4 4.5-3 4-9-1-12"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path d="M18 2l1.5 4L24 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  // xoxo
  return (
    <span aria-hidden style={{ fontFamily: "var(--font-caveat), cursive", fontSize: size, color, fontWeight: 700 }}>
      xoxo
    </span>
  )
}

const DOODLE_CSS = `
  @keyframes dd-wobble {
    0%, 100% { transform: rotate(var(--dd-rot)) translateY(0); }
    50%      { transform: rotate(calc(var(--dd-rot) + 6deg)) translateY(-6px); }
  }
  @keyframes dd-pol-in {
    0%   { opacity: 0; transform: rotate(8deg) translateY(30px) scale(0.92); }
    100% { opacity: 1; transform: rotate(2.5deg) translateY(0) scale(1); }
  }
  @keyframes dd-rise {
    0%   { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes dd-sticker-pop {
    0%   { opacity: 0; transform: rotate(-30deg) scale(0.3); }
    70%  { opacity: 1; transform: rotate(-8deg) scale(1.15); }
    100% { opacity: 1; transform: rotate(-12deg) scale(1); }
  }
  @keyframes dd-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  .dd-open-1 { animation: dd-rise 0.7s ease 0.1s both; }
  .dd-open-2 { animation: dd-rise 0.9s ease 0.35s both; }
  .dd-open-3 { animation: dd-pol-in 1.0s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both; }
  .dd-open-4 { animation: dd-sticker-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.5s both; }
  .dd-open-5 { animation: dd-rise 0.8s ease 1.3s both; }
  [data-dd-reduced="true"] .dd-open-1, [data-dd-reduced="true"] .dd-open-2,
  [data-dd-reduced="true"] .dd-open-3, [data-dd-reduced="true"] .dd-open-4,
  [data-dd-reduced="true"] .dd-open-5 { animation: none; opacity: 1; transform: none; }
  [data-dd-reduced="true"] .dd-doodle { animation: none !important; }
`

export const DoodleScrapbook: SectionRenderer<"landing"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const crayon = "var(--font-amatic), cursive"
  const marker = "var(--font-caveat), cursive"

  const { left: nameLeft, right: nameRight } = splitHeadline(data.headline || "")
  const dateParts = parseDateParts(data.eventDate)
  const hasPhoto = !!data.coverPhotoUrl

  const [opened, setOpened] = useState(false)
  const doodleRef = useRef<HTMLDivElement | null>(null)
  const typeRef = useRef<HTMLDivElement | null>(null)
  const polRef = useRef<HTMLDivElement | null>(null)
  const reduced = useHeroMotion([
    { ref: doodleRef, mx: 4, my: 3, sy: 0.04 },    // doodles (deepest)
    { ref: typeRef, mx: 7, my: 5, sy: 0.06 },      // crayon type
    { ref: polRef, mx: -10, my: -7, sy: -0.05 },   // polaroid (front)
  ])

  // Paper: warm bg + faint dot grid.
  const paper = `radial-gradient(${c.text}14 1px, transparent 1px)`

  return (
    <section
      data-dd-reduced={reduced ? "true" : "false"}
      style={{
        position: "relative",
        minHeight: "100dvh",
        overflow: "hidden",
        isolation: "isolate",
        background: c.bg,
        backgroundImage: paper,
        backgroundSize: "22px 22px",
        color: c.text,
        fontFamily: marker,
      }}
    >
      <style>{DOODLE_CSS}</style>

      {/* plane 0 — wobbling doodles */}
      <div
        ref={doodleRef}
        aria-hidden
        style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", willChange: "transform" }}
      >
        {DOODLES.map((d, i) => (
          <span
            key={i}
            className="dd-doodle"
            style={{
              position: "absolute",
              left: d.left,
              top: d.top,
              ["--dd-rot" as never]: `${d.rot}deg`,
              transform: `rotate(${d.rot}deg)`,
              animation: `dd-wobble 5.5s ease-in-out ${d.delay}s infinite`,
              opacity: 0.6,
              display: "inline-block",
            }}
          >
            <Doodle kind={d.kind} size={d.size} color={i % 2 === 0 ? c.accent : c.gold} />
          </span>
        ))}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px 40px",
          textAlign: "center",
        }}
      >
        {/* tagline on a washi strip */}
        <div className={opened ? "dd-open-1" : undefined} style={{ opacity: opened ? undefined : 0, marginBottom: 18 }}>
          <span
            style={{
              display: "inline-block",
              fontFamily: marker,
              fontSize: 19,
              fontWeight: 600,
              color: c.text,
              background: `${c.gold}2e`,
              border: `0.5px solid ${c.gold}44`,
              padding: "4px 18px",
              transform: "rotate(-2deg)",
            }}
          >
            {data.tagline || "we're getting married!!"}
          </span>
        </div>

        {/* plane 1 — big crayon names, photo overlaps their bottom */}
        <div
          ref={typeRef}
          className={opened ? "dd-open-2" : undefined}
          style={{ opacity: opened ? undefined : 0, position: "relative", zIndex: 0, lineHeight: 0.9, willChange: "transform" }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: crayon,
              fontWeight: 700,
              fontSize: "clamp(54px, 20cqw, 96px)",
              letterSpacing: "0.05em",
              color: c.text,
            }}
          >
            {(nameLeft || "Alex").toUpperCase()}
            {nameRight && (
              <>
                <span aria-hidden style={{ color: c.accent, padding: "0 0.12em" }}>
                  ♥
                </span>
                {nameRight.toUpperCase()}
              </>
            )}
          </h1>
          {/* crayon squiggle underline */}
          <svg width="180" height="14" viewBox="0 0 180 14" fill="none" aria-hidden style={{ marginTop: 2 }}>
            <path
              d="M4 9c18-7 34 5 52-2s36 4 54-3 40 6 66-1"
              stroke={c.accent}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* plane 2 — washi-taped polaroid with sticker badge */}
        <div style={{ position: "relative", zIndex: 1, marginTop: -10 }}>
          <div ref={polRef} style={{ willChange: "transform" }}>
            <div
              className={opened ? "dd-open-3" : undefined}
              style={{
                opacity: opened ? undefined : 0,
                position: "relative",
                width: "min(64cqw, 270px)",
                background: "#fff",
                padding: "10px 10px 40px",
                boxShadow: "0 16px 40px rgba(0,0,0,0.14)",
                transform: "rotate(2.5deg)",
              }}
            >
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: -10,
                  left: "50%",
                  transform: "translateX(-50%) rotate(-3deg)",
                  width: 74,
                  height: 20,
                  background: `${c.accent}33`,
                  border: `0.5px solid ${c.accent}22`,
                }}
              />
              <div
                style={{
                  aspectRatio: "4 / 5",
                  overflow: "hidden",
                  background: `linear-gradient(150deg, ${c.accent}1e, ${c.gold}2e)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {hasPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.coverPhotoUrl} alt="" loading="eager" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <span style={{ fontFamily: marker, fontSize: 20, color: c.muted }}>our photo :)</span>
                )}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 8,
                  fontFamily: marker,
                  fontSize: 19,
                  color: c.text,
                }}
              >
                {data.subhead || "forever starts here ♥"}
              </div>

              {/* sticker badge */}
              <span
                className={opened ? "dd-open-4" : undefined}
                style={{
                  opacity: opened ? undefined : 0,
                  position: "absolute",
                  top: -18,
                  right: -20,
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  background: c.accent,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: marker,
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: 1.05,
                  transform: "rotate(-12deg)",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
                  border: "2px dashed rgba(255,255,255,0.7)",
                  padding: 6,
                }}
              >
                save the date!
              </span>
            </div>
          </div>
        </div>

        {/* hand-drawn date box */}
        <div className={opened ? "dd-open-5" : undefined} style={{ opacity: opened ? undefined : 0, marginTop: 26 }}>
          {dateParts ? (
            <span
              style={{
                display: "inline-block",
                fontFamily: crayon,
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: "0.12em",
                color: c.text,
                border: `2px dashed ${c.gold}`,
                borderRadius: 14,
                padding: "8px 22px",
                transform: "rotate(-1deg)",
              }}
            >
              {dateParts.day} . {dateParts.month} . {dateParts.year}
            </span>
          ) : (
            <span style={{ fontFamily: marker, fontSize: 18, color: c.muted }}>date coming soon…</span>
          )}
          <div style={{ fontFamily: marker, fontSize: 15, color: c.muted, marginTop: 12 }}>
            scroll down, there&apos;s more ↓
          </div>
        </div>
      </div>

      {/* ── entrance — paper note ── */}
      <div
        onClick={() => setOpened(true)}
        role="button"
        aria-label="Buka jemputan"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          background: c.bg,
          backgroundImage: paper,
          backgroundSize: "22px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          opacity: opened ? 0 : 1,
          pointerEvents: opened ? "none" : "auto",
          transition: "opacity 0.55s ease",
        }}
      >
        <div
          style={{
            position: "relative",
            background: "#fff",
            border: `1px solid ${c.text}1a`,
            boxShadow: "0 14px 36px rgba(0,0,0,0.12)",
            padding: "34px 30px 30px",
            transform: "rotate(-2deg)",
            textAlign: "center",
            maxWidth: "76cqw",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -10,
              left: -14,
              width: 56,
              height: 18,
              background: `${c.gold}3d`,
              transform: "rotate(-24deg)",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -10,
              right: -14,
              width: 56,
              height: 18,
              background: `${c.accent}30`,
              transform: "rotate(24deg)",
            }}
          />
          <div style={{ fontFamily: crayon, fontWeight: 700, fontSize: 40, lineHeight: 1, color: c.accent }}>
            HELLO!
          </div>
          <div style={{ fontFamily: marker, fontSize: 20, color: c.text, margin: "12px 0 4px" }}>
            you&apos;re invited to the wedding of
          </div>
          <div style={{ fontFamily: crayon, fontWeight: 700, fontSize: 30, letterSpacing: "0.08em", color: c.text }}>
            {(data.headline || "Alex & Mei").toUpperCase()}
          </div>
          <div
            style={{
              fontFamily: marker,
              fontSize: 16,
              color: c.muted,
              marginTop: 16,
              animation: reduced ? "none" : "dd-pulse 2s ease-in-out infinite",
            }}
          >
            ✉ tap to open!
          </div>
        </div>
      </div>
    </section>
  )
}
