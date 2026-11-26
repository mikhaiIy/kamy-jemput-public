"use client"

import { useEffect, useRef, useState } from "react"
import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { cardImageReferenceSchema } from "@/lib/card-image-reference"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { formatDateShort } from "../_shared"
import { splitHeadline, parseDateParts } from "./_hero_helpers"
import { PosterLuxe, DoodleScrapbook } from "./story_heroes"
import { CelestialGate } from "./celestial_hero"
import { PremiereGate } from "./cinema_hero"

// ---------------------------------------------------------------------------
// PhotoHero — existing variant, untouched
// ---------------------------------------------------------------------------

const PhotoHero: SectionRenderer<"landing"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100dvh",
        background: data.coverPhotoUrl
          ? `linear-gradient(160deg, rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url(${data.coverPhotoUrl}) center/cover no-repeat`
          : `linear-gradient(160deg, ${c.accent} 0%, ${c.gold} 100%)`,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
        textAlign: "center",
        fontFamily: fontFor(theme, "body"),
      }}
    >
      {data.tagline && (
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            opacity: 0.8,
            marginBottom: 16,
          }}
        >
          {data.tagline}
        </p>
      )}
      <h1
        style={{
          fontFamily: fontFor(theme, "display"),
          fontSize: 54,
          fontWeight: 400,
          lineHeight: 1.05,
          margin: "0 0 16px",
          textShadow: "0 2px 20px rgba(0,0,0,0.3)",
        }}
      >
        {data.headline}
      </h1>
      {data.subhead && (
        <p
          style={{
            fontFamily: fontFor(theme, "script") || fontFor(theme, "display"),
            fontSize: 24,
            margin: "8px 0 24px",
            opacity: 0.92,
          }}
        >
          {data.subhead}
        </p>
      )}
      {data.eventDate && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.4)", maxWidth: 60 }} />
          <p style={{ fontSize: 13, letterSpacing: "0.12em" }}>
            {formatDateShort(data.eventDate)}
          </p>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.4)", maxWidth: 60 }} />
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Minimalist — existing variant, untouched
// ---------------------------------------------------------------------------

const Minimalist: SectionRenderer<"landing"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  return (
    <section
      style={{
        minHeight: "100dvh",
        background: c.bg,
        color: c.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
        textAlign: "center",
        fontFamily: fontFor(theme, "body"),
      }}
    >
      {data.tagline && (
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: c.muted,
            marginBottom: 24,
          }}
        >
          {data.tagline}
        </p>
      )}
      <h1
        style={{
          fontFamily: fontFor(theme, "display"),
          fontSize: 46,
          fontWeight: 400,
          lineHeight: 1.1,
          color: c.accent,
          margin: 0,
        }}
      >
        {data.headline}
      </h1>
      {data.subhead && (
        <p
          style={{
            fontFamily: fontFor(theme, "script") || fontFor(theme, "display"),
            fontSize: 22,
            color: c.gold,
            margin: "12px 0 24px",
          }}
        >
          {data.subhead}
        </p>
      )}
      {data.eventDate && (
        <p style={{ fontSize: 13, letterSpacing: "0.18em", color: c.muted }}>
          {formatDateShort(data.eventDate)}
        </p>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// KineticHero — Premium editorial variant
// ---------------------------------------------------------------------------

// Seeded particle positions. SSR-stable: no Math.random() at render time.
// 14 motes distributed to avoid the center text area (~30%–70% vertical band).
// Three drift patterns (a/b/c) referenced by `pattern` field so we keep the
// keyframe count tiny while still feeling organic.
const PARTICLES: readonly {
  left: string
  top: string
  size: number
  delay: number
  duration: number
  opacity: number
  pattern: "a" | "b" | "c"
}[] = [
  { left: "8%",  top: "12%", size: 4, delay: 0.0,  duration: 14, opacity: 0.55, pattern: "a" },
  { left: "92%", top: "18%", size: 3, delay: 1.8,  duration: 16, opacity: 0.45, pattern: "b" },
  { left: "15%", top: "82%", size: 5, delay: 0.6,  duration: 18, opacity: 0.65, pattern: "c" },
  { left: "78%", top: "88%", size: 4, delay: 2.4,  duration: 15, opacity: 0.50, pattern: "a" },
  { left: "4%",  top: "48%", size: 3, delay: 1.2,  duration: 17, opacity: 0.35, pattern: "b" },
  { left: "96%", top: "52%", size: 4, delay: 3.0,  duration: 14, opacity: 0.55, pattern: "c" },
  { left: "22%", top: "8%",  size: 2, delay: 0.3,  duration: 19, opacity: 0.40, pattern: "b" },
  { left: "70%", top: "10%", size: 3, delay: 1.5,  duration: 16, opacity: 0.45, pattern: "a" },
  { left: "12%", top: "28%", size: 2, delay: 2.1,  duration: 20, opacity: 0.30, pattern: "c" },
  { left: "88%", top: "32%", size: 5, delay: 0.9,  duration: 13, opacity: 0.60, pattern: "a" },
  { left: "30%", top: "92%", size: 3, delay: 2.7,  duration: 17, opacity: 0.40, pattern: "b" },
  { left: "62%", top: "94%", size: 4, delay: 0.45, duration: 18, opacity: 0.50, pattern: "c" },
  { left: "6%",  top: "68%", size: 2, delay: 3.3,  duration: 15, opacity: 0.32, pattern: "a" },
  { left: "94%", top: "72%", size: 3, delay: 1.05, duration: 16, opacity: 0.42, pattern: "b" },
]

const KINETIC_CSS = `
  @keyframes kh-rise {
    0%   { opacity: 0; transform: translate3d(0, 24px, 0); filter: blur(8px); }
    100% { opacity: 1; transform: translate3d(0, 0, 0);   filter: blur(0); }
  }
  @keyframes kh-fade-in {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes kh-draw {
    0%   { opacity: 0; transform: translate3d(0, 12px, 0) scale(0.98); }
    100% { opacity: 1; transform: translate3d(0, 0, 0)   scale(1); }
  }
  @keyframes kh-pulse-in {
    0%   { opacity: 0; transform: scale(0.6) rotate(-8deg); }
    60%  { opacity: 1; transform: scale(1.08) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0); }
  }
  @keyframes kh-plaque-rise {
    0%   { opacity: 0; transform: translate3d(0, 18px, 0); }
    100% { opacity: 1; transform: translate3d(0, 0, 0); }
  }
  @keyframes kh-hairline-grow {
    0%   { transform: scaleX(0); }
    100% { transform: scaleX(1); }
  }
  @keyframes kh-drift-a {
    0%   { transform: translate3d(0, 0, 0) rotate(0); }
    50%  { transform: translate3d(14px, -22px, 0) rotate(40deg); }
    100% { transform: translate3d(0, 0, 0) rotate(0); }
  }
  @keyframes kh-drift-b {
    0%   { transform: translate3d(0, 0, 0) rotate(0); }
    50%  { transform: translate3d(-18px, -28px, 0) rotate(-30deg); }
    100% { transform: translate3d(0, 0, 0) rotate(0); }
  }
  @keyframes kh-drift-c {
    0%   { transform: translate3d(0, 0, 0) rotate(0); }
    50%  { transform: translate3d(10px, -36px, 0) rotate(20deg); }
    100% { transform: translate3d(0, 0, 0) rotate(0); }
  }
  /* Continuous moves that play forever after the entry reveal lands */
  @keyframes kh-ken-burns {
    0%   { transform: scale(1.06) translate3d(0, 0, 0); }
    50%  { transform: scale(1.12) translate3d(-1.5%, -1%, 0); }
    100% { transform: scale(1.06) translate3d(0, 0, 0); }
  }
  @keyframes kh-amp-breathe {
    0%   { transform: scale(1) rotate(0); }
    50%  { transform: scale(1.025) rotate(-0.6deg); }
    100% { transform: scale(1) rotate(0); }
  }
  @keyframes kh-amp-tap {
    0%   { transform: scale(1) rotate(0); }
    25%  { transform: scale(1.18) rotate(6deg); }
    55%  { transform: scale(0.94) rotate(-4deg); }
    100% { transform: scale(1) rotate(0); }
  }
  @keyframes kh-plaque-shimmer {
    0%   { transform: translateX(-140%) skewX(-18deg); }
    100% { transform: translateX(260%)  skewX(-18deg); }
  }
  /* Click-burst — each mote animates from origin outward and fades */
  @keyframes kh-burst {
    0%   { transform: translate3d(0, 0, 0) scale(0.6); opacity: 1; }
    70%  { opacity: 0.9; }
    100% { transform: translate3d(var(--bx), var(--by), 0) scale(1); opacity: 0; }
  }
  /* Subtle "click me" hint pulse on the ampersand glow */
  @keyframes kh-amp-glow {
    0%   { box-shadow: 0 0 0 0 currentColor; opacity: 0.0; }
    50%  { opacity: 0.4; }
    100% { box-shadow: 0 0 0 26px transparent; opacity: 0.0; }
  }
  .kh-reveal-1 { animation: kh-fade-in 1.1s ease-out 0.15s both; }
  .kh-reveal-2 { animation: kh-rise   1.4s cubic-bezier(0.22, 0.61, 0.36, 1) 0.45s both; }
  .kh-reveal-3 { animation: kh-pulse-in 1.1s cubic-bezier(0.22, 0.61, 0.36, 1) 0.85s both,
                            kh-amp-breathe 7s ease-in-out 2.4s infinite; }
  .kh-reveal-4 { animation: kh-draw    1.2s cubic-bezier(0.22, 0.61, 0.36, 1) 1.15s both; }
  .kh-reveal-5 { animation: kh-plaque-rise 1.0s cubic-bezier(0.22, 0.61, 0.36, 1) 1.55s both; }
  .kh-hairline { transform-origin: center; animation: kh-hairline-grow 1.2s cubic-bezier(0.22, 0.61, 0.36, 1) 1.7s both; }
  .kh-photo    { animation: kh-ken-burns 28s ease-in-out 0s infinite; transform-origin: 50% 45%; }
  .kh-amp-wrap { display: inline-block; cursor: pointer; transform: translate3d(var(--amp-tx, 0), var(--amp-ty, 0), 0); transition: transform 0.18s cubic-bezier(0.22, 0.61, 0.36, 1); }
  .kh-amp-wrap:hover { transform: translate3d(var(--amp-tx, 0), var(--amp-ty, 0), 0) scale(1.04); }
  .kh-amp-wrap[data-tapped="true"] .kh-amp-inner { animation: kh-pulse-in 1.1s cubic-bezier(0.22, 0.61, 0.36, 1) 0.85s both,
                                                              kh-amp-tap 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0s 1; }
  .kh-amp-ring { position: absolute; inset: 14% 14%; border-radius: 50%; pointer-events: none;
                 animation: kh-amp-glow 3.4s ease-out 2.2s infinite; }
  .kh-plaque-skin { position: absolute; inset: 0; overflow: hidden; pointer-events: none; border-radius: inherit; }
  .kh-plaque-skin::before { content: ""; position: absolute; inset: 0;
                            background: linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%);
                            transform: translateX(-140%) skewX(-18deg);
                            animation: kh-plaque-shimmer 4.8s ease-in-out 2.6s infinite; }
  .kh-burst { position: absolute; pointer-events: none; z-index: 5; }
  .kh-burst-mote { position: absolute; left: 0; top: 0; border-radius: 50%;
                   animation: kh-burst 1100ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }

  /* Reduced-motion kill switches */
  [data-kh-reduced="true"] .kh-reveal-1,
  [data-kh-reduced="true"] .kh-reveal-2,
  [data-kh-reduced="true"] .kh-reveal-4,
  [data-kh-reduced="true"] .kh-reveal-5 { animation: none; opacity: 1; transform: none; filter: none; }
  [data-kh-reduced="true"] .kh-reveal-3 { animation: none; opacity: 1; transform: none; }
  [data-kh-reduced="true"] .kh-hairline { animation: none; transform: scaleX(1); }
  [data-kh-reduced="true"] .kh-mote     { animation: none !important; }
  [data-kh-reduced="true"] .kh-parallax,
  [data-kh-reduced="true"] .kh-photo    { animation: none !important; transform: none !important; }
  [data-kh-reduced="true"] .kh-plaque-skin::before { animation: none; opacity: 0; }
  [data-kh-reduced="true"] .kh-amp-ring { animation: none; opacity: 0; }
`

// SVG noise — 200x200 fractal turbulence baked into a data URL.
// Pure CSS noise looks digital; this is the print-magazine grain we want.
const GRAIN_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>` +
      `<filter id='n'>` +
        `<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>` +
        `<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/>` +
      `</filter>` +
      `<rect width='100%' height='100%' filter='url(#n)' opacity='0.6'/>` +
    `</svg>`
  )

// splitHeadline / parseDateParts moved to ./_hero_helpers so other hero
// variant files can share them without circular imports.

type Burst = {
  id: number
  x: number
  y: number
  motes: { angle: number; distance: number; size: number; delay: number }[]
}

let burstSeed = 0

function makeBurst(x: number, y: number, big = false): Burst {
  const count = big ? 18 : 12
  const motes = Array.from({ length: count }).map((_, i) => {
    const jitter = ((Math.sin(burstSeed + i * 1.7) + 1) / 2) * 0.6 + 0.7 // 0.7–1.3
    const angle = (i / count) * Math.PI * 2 + (Math.cos(burstSeed + i) * 0.25)
    const distance = (big ? 110 : 72) * jitter
    const size = (big ? 5 : 4) - (i % 3) * 0.5
    const delay = (i % 4) * 24
    return { angle, distance, size, delay }
  })
  burstSeed += 1
  return { id: Date.now() + burstSeed, x, y, motes }
}

const KineticHero: SectionRenderer<"landing"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const display = fontFor(theme, "display")
  const script = fontFor(theme, "script") || display
  const body = fontFor(theme, "body")

  const hasPhoto = !!data.coverPhotoUrl
  const { left: nameLeft, right: nameRight } = splitHeadline(data.headline || "")
  const dateParts = parseDateParts(data.eventDate)

  const parallaxRef = useRef<HTMLDivElement | null>(null)
  const motesRef = useRef<HTMLDivElement | null>(null)
  const ampRef = useRef<HTMLSpanElement | null>(null)
  const sectionRef = useRef<HTMLElement | null>(null)
  const [reduced, setReduced] = useState(false)
  const [bursts, setBursts] = useState<Burst[]>([])
  const [tapTick, setTapTick] = useState(0) // bumped on each ampersand tap to re-trigger the tap animation

  // Combined motion driver: scroll parallax + pointer parallax + reduced-motion
  // observation. Single useEffect so we don't fight over the rAF queue.
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches)
    const onMq = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener?.("change", onMq)

    // Pointer parallax only on devices with a precise pointer (desktops, not
    // phones — the section is mostly viewed on phones anyway).
    const fineMq = window.matchMedia("(pointer: fine)")

    let raf = 0
    let scrollY = window.scrollY
    let targetPx = 0
    let targetPy = 0
    let curPx = 0
    let curPy = 0

    const tick = () => {
      if (mq.matches) {
        raf = 0
        return
      }
      // Lerp toward the pointer target so motion feels weighty, not jittery.
      curPx += (targetPx - curPx) * 0.08
      curPy += (targetPy - curPy) * 0.08

      const scrollOffset = Math.min(scrollY * 0.2, 220)
      if (parallaxRef.current) {
        // Compose scroll-parallax (Y) + pointer-parallax (X, soft Y add).
        // The kh-photo class layers a slow Ken Burns scale/translate on the
        // inner photo element so we don't clobber that here.
        parallaxRef.current.style.transform =
          `translate3d(${curPx * 8}px, ${scrollOffset + curPy * 6}px, 0)`
      }
      if (motesRef.current) {
        motesRef.current.style.transform =
          `translate3d(${curPx * 16}px, ${curPy * 16}px, 0)`
      }
      if (ampRef.current) {
        // The ampersand wrapper reads --amp-tx / --amp-ty; this gives the
        // glyph a tiny "I'm watching you" follow without interfering with the
        // breathing keyframe that scales it.
        ampRef.current.style.setProperty("--amp-tx", `${curPx * 5}px`)
        ampRef.current.style.setProperty("--amp-ty", `${curPy * 5}px`)
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)

    const onScroll = () => {
      scrollY = window.scrollY
    }
    const onPointer = (e: PointerEvent) => {
      if (!fineMq.matches || mq.matches) return
      targetPx = (e.clientX / window.innerWidth) * 2 - 1
      targetPy = (e.clientY / window.innerHeight) * 2 - 1
    }
    const onLeave = () => {
      // Ease back toward center when the cursor leaves the viewport.
      targetPx = 0
      targetPy = 0
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

  // Drop a burst at a click point and schedule it to auto-evict from state.
  // Big flag is used when the ampersand itself is tapped — bigger radius,
  // more motes, plus a one-shot tap wiggle on the glyph.
  const spawnBurst = (clientX: number, clientY: number, big: boolean) => {
    if (reduced) return
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = clientX - rect.left
    const y = clientY - rect.top
    const burst = makeBurst(x, y, big)
    setBursts((prev) => [...prev.slice(-3), burst]) // cap at 4 simultaneous
    if (big) setTapTick((n) => n + 1)
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== burst.id))
    }, 1300)
  }

  const onSectionClick = (e: React.MouseEvent<HTMLElement>) => {
    // The ampersand has its own onClick that calls spawnBurst(big=true) and
    // stops propagation. Everything else gets a small burst from here.
    spawnBurst(e.clientX, e.clientY, false)
  }

  // Color tokens for the photo vs. no-photo case. We use white-on-dark
  // editorial type when a photo exists; deep ink-on-cream when it doesn't.
  const onPhoto = hasPhoto
  const ink = onPhoto ? "#f7f1e8" : c.accent
  const inkSoft = onPhoto ? "rgba(247, 241, 232, 0.78)" : c.muted
  const inkFaint = onPhoto ? "rgba(247, 241, 232, 0.42)" : `${c.muted}66`
  const ornament = onPhoto ? "#e8c98a" : c.gold

  return (
    <section
      ref={sectionRef}
      data-kh-reduced={reduced ? "true" : "false"}
      onClick={onSectionClick}
      style={{
        position: "relative",
        minHeight: "100dvh",
        overflow: "hidden",
        isolation: "isolate",
        color: ink,
        background: onPhoto ? "#0c0a08" : c.bg,
        fontFamily: body,
        cursor: reduced ? "default" : "default",
      }}
    >
      <style>{KINETIC_CSS}</style>

      {/* Parallax background layer — scroll + pointer drift live here.
          The inner .kh-photo handles the continuous Ken Burns scale/translate
          so the two motions compose cleanly. */}
      <div
        ref={parallaxRef}
        className="kh-parallax"
        aria-hidden
        style={{
          position: "absolute",
          inset: "-14% 0 -14% 0",
          willChange: "transform",
          zIndex: 0,
        }}
      >
        <div
          className="kh-photo"
          style={{
            position: "absolute",
            inset: 0,
            background: hasPhoto
              ? `url(${data.coverPhotoUrl}) center/cover no-repeat`
              : `linear-gradient(180deg, ${c.accent} 0%, ${c.accent} 30%, ${c.gold} 100%)`,
            filter: hasPhoto ? "saturate(0.85) contrast(1.05)" : "none",
            willChange: "transform",
          }}
        />
      </div>

      {/* Editorial vignette — darker at the edges, lets the type breathe */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: onPhoto
            ? "radial-gradient(120% 80% at 50% 45%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.7) 100%)"
            : "radial-gradient(120% 80% at 50% 45%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.08) 70%, rgba(0,0,0,0.18) 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Film-grain SVG noise — print magazine tactility */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${GRAIN_DATA_URL}")`,
          backgroundSize: "200px 200px",
          mixBlendMode: onPhoto ? "overlay" : "multiply",
          opacity: onPhoto ? 0.35 : 0.15,
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* Ambient drifting motes — wrapped in a layer that gets pointer-parallax
          translated, so they feel a "deeper" depth than the photo. */}
      <div
        ref={motesRef}
        aria-hidden
        style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", willChange: "transform" }}
      >
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="kh-mote"
            style={{
              position: "absolute",
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${ornament} 0%, ${ornament}00 70%)`,
              opacity: p.opacity,
              animation: `kh-drift-${p.pattern} ${p.duration}s ease-in-out ${p.delay}s infinite`,
              filter: "blur(0.4px)",
              boxShadow: `0 0 ${p.size * 3}px ${ornament}55`,
            }}
          />
        ))}
      </div>

      {/* Click bursts — each tap on the hero radiates a small constellation
          of motes. Tap the ampersand for a bigger one. */}
      {bursts.map((b) => (
        <div key={b.id} className="kh-burst" style={{ left: b.x, top: b.y }} aria-hidden>
          {b.motes.map((m, i) => (
            <span
              key={i}
              className="kh-burst-mote"
              style={{
                width: m.size,
                height: m.size,
                background: `radial-gradient(circle, ${ornament} 0%, ${ornament}00 70%)`,
                boxShadow: `0 0 ${m.size * 3}px ${ornament}80`,
                animationDelay: `${m.delay}ms`,
                ["--bx" as never]: `${Math.cos(m.angle) * m.distance}px`,
                ["--by" as never]: `${Math.sin(m.angle) * m.distance}px`,
              }}
            />
          ))}
        </div>
      ))}

      {/* Composition. Three-row grid: tagline / names+ampersand / date plaque.
          1fr top and bottom let the names anchor visually low-center, which
          reads as a magazine cover composition rather than dead center. */}
      <div
        style={{
          position: "relative",
          zIndex: 4,
          minHeight: "100dvh",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          rowGap: 24,
          padding: "44px 32px 36px",
          textAlign: "center",
        }}
      >
        {/* Tagline ribbon */}
        {data.tagline ? (
          <div
            className="kh-reveal-1"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              opacity: 0,
            }}
          >
            <span
              style={{
                display: "block",
                width: 26,
                height: 1,
                background: inkFaint,
              }}
            />
            <span
              style={{
                fontFamily: body,
                fontSize: 10,
                letterSpacing: "0.42em",
                textTransform: "uppercase",
                color: inkSoft,
                paddingLeft: "0.42em", // optical balance for trailing tracking
              }}
            >
              {data.tagline}
            </span>
            <span
              style={{
                display: "block",
                width: 26,
                height: 1,
                background: inkFaint,
              }}
            />
          </div>
        ) : (
          <div />
        )}

        {/* Names + ampersand block. When the headline has an &/and/dan,
            we render the two names stacked with a large script ampersand
            between them — the editorial "wow" moment. Otherwise we render
            the full headline as a single display line. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            position: "relative",
          }}
        >
          {nameRight ? (
            <>
              <span
                className="kh-reveal-2"
                style={{
                  fontFamily: display,
                  fontSize: "clamp(34px, 11cqw, 56px)",
                  fontWeight: 400,
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  color: ink,
                  textShadow: onPhoto ? "0 2px 24px rgba(0,0,0,0.4)" : "none",
                  opacity: 0,
                }}
              >
                {nameLeft}
              </span>

              {/* The hero ampersand. Script font, large, faintly rotated.
                  This is the single visual move that says "designed" — and
                  it's the explicit "tap me" target. On click it wiggles and
                  spawns a larger burst of motes from its center. */}
              <span
                ref={ampRef}
                className="kh-amp-wrap"
                data-tapped={tapTick > 0 ? "true" : "false"}
                onClick={(e) => {
                  e.stopPropagation()
                  spawnBurst(e.clientX, e.clientY, true)
                }}
                style={{
                  position: "relative",
                  margin: "-6px 0 -10px",
                  // Hide overflow so the glow ring doesn't paint outside the
                  // glyph's optical area on hover.
                  borderRadius: "50%",
                }}
              >
                <span
                  className="kh-amp-ring"
                  aria-hidden
                  style={{
                    color: ornament,
                    opacity: 0,
                  }}
                />
                <span
                  key={tapTick}
                  className="kh-reveal-3 kh-amp-inner"
                  aria-hidden
                  style={{
                    display: "block",
                    fontFamily: script,
                    fontSize: "clamp(80px, 22cqw, 140px)",
                    lineHeight: 0.9,
                    color: ornament,
                    textShadow: onPhoto ? "0 6px 30px rgba(0,0,0,0.35)" : "none",
                    fontStyle: "italic",
                    opacity: 0,
                  }}
                >
                  &amp;
                </span>
              </span>

              <span
                className="kh-reveal-4"
                style={{
                  fontFamily: display,
                  fontSize: "clamp(34px, 11cqw, 56px)",
                  fontWeight: 400,
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  color: ink,
                  textShadow: onPhoto ? "0 2px 24px rgba(0,0,0,0.4)" : "none",
                  opacity: 0,
                }}
              >
                {nameRight}
              </span>
            </>
          ) : (
            <h1
              className="kh-reveal-2"
              style={{
                fontFamily: display,
                fontSize: "clamp(40px, 12cqw, 60px)",
                fontWeight: 400,
                letterSpacing: "0.04em",
                lineHeight: 1.05,
                margin: 0,
                color: ink,
                textShadow: onPhoto ? "0 2px 24px rgba(0,0,0,0.4)" : "none",
                opacity: 0,
              }}
            >
              {nameLeft || "Sarah & Adam"}
            </h1>
          )}

          {data.subhead && (
            <p
              className="kh-reveal-4"
              style={{
                marginTop: 18,
                fontFamily: body,
                fontStyle: "italic",
                fontSize: 13,
                letterSpacing: "0.08em",
                color: inkSoft,
                maxWidth: 280,
                opacity: 0,
              }}
            >
              {data.subhead}
            </p>
          )}
        </div>

        {/* Date plaque — three tall numeral columns separated by hairlines.
            Reads like an engraved wedding-invitation crest. */}
        <div className="kh-reveal-5" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: 0 }}>
          {dateParts ? (
            <>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "stretch",
                  gap: 16,
                  padding: "12px 22px",
                  border: `1px solid ${inkFaint}`,
                  borderRadius: 2,
                  background: onPhoto ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.55)",
                  backdropFilter: "blur(4px)",
                  overflow: "hidden",
                }}
              >
                <span className="kh-plaque-skin" aria-hidden />
                <DateColumn label="DAY"   value={dateParts.day}   ink={ink} inkSoft={inkSoft} display={display} body={body} />
                <Hairline color={inkFaint} />
                <DateColumn label="MONTH" value={dateParts.month} ink={ink} inkSoft={inkSoft} display={display} body={body} />
                <Hairline color={inkFaint} />
                <DateColumn label="YEAR"  value={dateParts.year}  ink={ink} inkSoft={inkSoft} display={display} body={body} />
              </div>
              <span
                style={{
                  fontFamily: body,
                  fontSize: 9,
                  letterSpacing: "0.32em",
                  color: inkSoft,
                  textTransform: "uppercase",
                  paddingLeft: "0.32em",
                }}
              >
                {dateParts.longLabel}
              </span>
              <span
                aria-hidden
                className="kh-hairline"
                style={{
                  display: "block",
                  width: 48,
                  height: 1,
                  background: ornament,
                  marginTop: 4,
                  opacity: 0.7,
                }}
              />
            </>
          ) : (
            // No date set — still show the ornamental hairline + word-mark so
            // the bottom of the composition isn't empty in the editor preview.
            <span
              aria-hidden
              className="kh-hairline"
              style={{ display: "block", width: 48, height: 1, background: ornament, opacity: 0.7 }}
            />
          )}
        </div>
      </div>
    </section>
  )
}

function DateColumn({
  label,
  value,
  ink,
  inkSoft,
  display,
  body,
}: {
  label: string
  value: string
  ink: string
  inkSoft: string
  display?: string
  body?: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 44 }}>
      <span
        style={{
          fontFamily: display,
          fontSize: 30,
          lineHeight: 1,
          color: ink,
          letterSpacing: "0.02em",
          fontVariantNumeric: "lining-nums",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: body,
          fontSize: 8,
          letterSpacing: "0.32em",
          color: inkSoft,
          marginTop: 6,
          textTransform: "uppercase",
          paddingLeft: "0.32em",
        }}
      >
        {label}
      </span>
    </div>
  )
}

function Hairline({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width: 1,
        background: color,
        alignSelf: "stretch",
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// SakuraDepth — jestudio cherry-blossom inspired variant
//
// Three moves copied from what makes jestudio demos feel special:
//   1. Tap-to-open entrance — a floating polaroid "envelope" the guest taps,
//      turning the invitation into a small ritual instead of a page load.
//   2. Layered depth hero — a blurred, slow-moving clone of the couple photo
//      sits deep in the background while the sharp arch-framed print floats
//      in front with pointer/scroll parallax and a subtle 3D tilt, so the
//      couple visually "pops" off the background.
//   3. Falling petals — continuous, theme-coloured (CSS shapes, not emoji,
//      so any Gaya palette works).
//
// SSR-safe: every petal/sparkle position comes from constant arrays (no
// Math.random in render — see docs/DESIGN_SAKURA_STORY.md).
// ---------------------------------------------------------------------------

// left%, size px, fall duration s, negative delay s (mid-flight at mount), sway pattern
const PETALS: readonly {
  left: string
  size: number
  duration: number
  delay: number
  opacity: number
  pattern: "a" | "b" | "c"
}[] = [
  { left: "4%",  size: 9,  duration: 11, delay: -2,   opacity: 0.6,  pattern: "a" },
  { left: "14%", size: 7,  duration: 14, delay: -7,   opacity: 0.45, pattern: "b" },
  { left: "24%", size: 10, duration: 12, delay: -4,   opacity: 0.55, pattern: "c" },
  { left: "33%", size: 6,  duration: 16, delay: -10,  opacity: 0.4,  pattern: "a" },
  { left: "42%", size: 8,  duration: 13, delay: -1,   opacity: 0.5,  pattern: "b" },
  { left: "51%", size: 7,  duration: 15, delay: -8,   opacity: 0.45, pattern: "c" },
  { left: "60%", size: 9,  duration: 11, delay: -5,   opacity: 0.6,  pattern: "a" },
  { left: "69%", size: 6,  duration: 17, delay: -12,  opacity: 0.35, pattern: "b" },
  { left: "78%", size: 8,  duration: 12, delay: -3,   opacity: 0.5,  pattern: "c" },
  { left: "87%", size: 10, duration: 14, delay: -9,   opacity: 0.55, pattern: "a" },
  { left: "94%", size: 7,  duration: 13, delay: -6,   opacity: 0.45, pattern: "b" },
  { left: "9%",  size: 5,  duration: 18, delay: -14,  opacity: 0.3,  pattern: "c" },
  { left: "55%", size: 5,  duration: 19, delay: -11,  opacity: 0.3,  pattern: "a" },
  { left: "82%", size: 5,  duration: 18, delay: -15,  opacity: 0.3,  pattern: "b" },
]

const SAKURA_CSS = `
  @keyframes sk-fall-a {
    0%   { transform: translateY(-6%) translateX(0) rotate(0deg); }
    50%  { transform: translateY(52vh) translateX(18px) rotate(160deg); }
    100% { transform: translateY(106vh) translateX(-8px) rotate(320deg); }
  }
  @keyframes sk-fall-b {
    0%   { transform: translateY(-6%) translateX(0) rotate(0deg); }
    50%  { transform: translateY(52vh) translateX(-22px) rotate(-140deg); }
    100% { transform: translateY(106vh) translateX(10px) rotate(-300deg); }
  }
  @keyframes sk-fall-c {
    0%   { transform: translateY(-6%) translateX(0) rotate(0deg); }
    50%  { transform: translateY(52vh) translateX(12px) rotate(200deg); }
    100% { transform: translateY(106vh) translateX(-14px) rotate(380deg); }
  }
  @keyframes sk-pol-float {
    0%, 100% { transform: rotate(-1.5deg) translateY(0); }
    50%      { transform: rotate(-1.5deg) translateY(-8px); }
  }
  @keyframes sk-pulse {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 1; }
  }
  @keyframes sk-layer-in {
    0%   { opacity: 0; transform: translateY(-12px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes sk-arch-in {
    0%   { opacity: 0; transform: translateY(26px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes sk-sway {
    0%, 100% { transform: rotate(-1deg) translateY(0); }
    50%      { transform: rotate(1deg) translateY(-7px); }
  }
  .sk-petal { position: absolute; top: -16px; pointer-events: none; will-change: transform; }
  .sk-open-1 { animation: sk-layer-in 0.9s ease 0.15s both; }
  .sk-open-2 { animation: sk-arch-in 1.1s cubic-bezier(0.22, 0.61, 0.36, 1) 0.4s both; }
  .sk-open-2t { animation: sk-layer-in 1.0s ease 0.3s both; }
  .sk-open-3 { animation: sk-layer-in 0.9s ease 0.8s both; }
  .sk-open-4 { animation: sk-layer-in 0.9s ease 1.05s both; }
  .sk-open-5 { animation: sk-layer-in 0.9s ease 1.3s both; }
  .sk-arch-sway { animation: sk-sway 7s ease-in-out 2s infinite; }
  [data-sk-reduced="true"] .sk-petal { animation: none !important; display: none; }
  [data-sk-reduced="true"] .sk-open-1, [data-sk-reduced="true"] .sk-open-2,
  [data-sk-reduced="true"] .sk-open-2t,
  [data-sk-reduced="true"] .sk-open-3, [data-sk-reduced="true"] .sk-open-4,
  [data-sk-reduced="true"] .sk-open-5 { animation: none; opacity: 1; transform: none; }
  [data-sk-reduced="true"] .sk-arch-sway { animation: none; }
`

function PetalLayer({ color, zIndex }: { color: string; zIndex: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex,
      }}
    >
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="sk-petal"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 1.25,
            opacity: p.opacity,
            background: color,
            // teardrop petal shape
            borderRadius: "60% 40% 55% 45% / 70% 60% 40% 30%",
            animation: `sk-fall-${p.pattern} ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

const SakuraDepth: SectionRenderer<"landing"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const display = fontFor(theme, "display")
  const script = fontFor(theme, "script") || display
  const body = fontFor(theme, "body")

  const { left: nameLeft, right: nameRight } = splitHeadline(data.headline || "")
  const dateParts = parseDateParts(data.eventDate)
  const hasPhoto = !!data.coverPhotoUrl

  const [opened, setOpened] = useState(false)
  const [reduced, setReduced] = useState(false)
  const bgRef = useRef<HTMLDivElement | null>(null)
  const midRef = useRef<HTMLDivElement | null>(null)
  const archRef = useRef<HTMLDivElement | null>(null)

  // Pointer + scroll parallax. Background drifts *with* the pointer, the
  // arch print drifts *against* it and tilts in 3D — opposite motion is what
  // sells the depth. Pointer input only on fine pointers; phones get the
  // sway keyframe + scroll offset instead.
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
      const scrollOffset = Math.min(scrollY * 0.18, 180)
      if (bgRef.current) {
        bgRef.current.style.transform = `translate3d(${cx * 14}px, ${scrollOffset + cy * 10}px, 0) scale(1.18)`
      }
      if (midRef.current) {
        // The script-text plane sits between the blurred clone and the arch
        // print: same drift direction as the background but slower, so all
        // three layers separate visibly when the pointer moves.
        midRef.current.style.transform = `translate3d(${cx * 6}px, ${scrollY * 0.05 + cy * 4}px, 0)`
      }
      if (archRef.current) {
        archRef.current.style.transform =
          `perspective(900px) translate3d(${cx * -16}px, ${scrollY * -0.06 + cy * -10}px, 0) ` +
          `rotateY(${cx * 5}deg) rotateX(${cy * -4}deg)`
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

  const dateShort = dateParts ? `${dateParts.day} · ${dateParts.month} · ${dateParts.year}` : ""

  return (
    <section
      data-sk-reduced={reduced ? "true" : "false"}
      style={{
        position: "relative",
        minHeight: "100dvh",
        overflow: "hidden",
        isolation: "isolate",
        background: c.bg,
        color: c.text,
        fontFamily: body,
      }}
    >
      <style>{SAKURA_CSS}</style>

      {/* ── Depth layer 1 (deepest): blurred photo clone / soft wash ── */}
      <div
        ref={bgRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: "-12%",
          zIndex: 0,
          transform: "scale(1.18)",
          willChange: "transform",
          background: hasPhoto
            ? `url(${data.coverPhotoUrl}) center/cover no-repeat`
            : `linear-gradient(165deg, ${c.bg} 0%, ${c.accent}26 55%, ${c.gold}33 100%)`,
          filter: hasPhoto ? "blur(16px) saturate(0.9)" : "none",
          opacity: hasPhoto ? 0.55 : 1,
        }}
      />
      {/* wash so text stays readable over the blurred clone */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: `radial-gradient(110% 75% at 50% 38%, ${c.bg}00 0%, ${c.bg}cc 78%, ${c.bg} 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── Depth layer 2: falling petals behind the print ── */}
      <PetalLayer color={`${c.accent}55`} zIndex={2} />

      {/* ── Content ── */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          minHeight: "100dvh",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          rowGap: 18,
          padding: "40px 28px 36px",
          textAlign: "center",
        }}
      >
        {/* tagline */}
        <div className={opened ? "sk-open-1" : undefined} style={{ opacity: opened ? undefined : 0 }}>
          <p
            style={{
              fontFamily: script,
              fontSize: 30,
              fontWeight: 600,
              color: c.accent,
              margin: 0,
              lineHeight: 1.1,
              transform: "rotate(-2deg)",
            }}
          >
            {data.tagline || "Wedding Invitation"}
          </p>
          {data.subhead && (
            <p style={{ fontSize: 11, color: c.muted, letterSpacing: "0.18em", margin: "8px 0 0" }}>
              {data.subhead}
            </p>
          )}
        </div>

        {/* ── Depth layers 2½ + 3: giant script words BEHIND the sharp arch
            print in front — the jestudio bg → text → couple sandwich. The
            words drift slower than the print (midRef vs archRef), so the
            photo visibly floats above them. ── */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            ref={midRef}
            aria-hidden
            className={opened ? "sk-open-2t" : undefined}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              pointerEvents: "none",
              willChange: "transform",
              opacity: opened ? undefined : 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "2%",
                left: "-2%",
                fontFamily: script,
                fontSize: "clamp(44px, 16cqw, 76px)",
                fontWeight: 700,
                color: c.accent,
                transform: "rotate(-7deg)",
                lineHeight: 1,
                whiteSpace: "nowrap",
                textShadow: `1px 1px 0 ${c.accent}22`,
              }}
            >
              welcome
            </span>
            <span
              style={{
                position: "absolute",
                bottom: "4%",
                right: "-4%",
                fontFamily: script,
                fontSize: "clamp(30px, 10.5cqw, 50px)",
                fontWeight: 600,
                color: c.muted,
                transform: "rotate(-5deg)",
                lineHeight: 1.05,
                textAlign: "right",
                whiteSpace: "nowrap",
              }}
            >
              to our
              <br />
              wedding day
            </span>
          </div>
          <div className={opened ? "sk-open-2" : undefined} style={{ position: "relative", zIndex: 1, opacity: opened ? undefined : 0 }}>
            <div className="sk-arch-sway">
              <div
                ref={archRef}
                style={{
                  width: "min(68cqw, 290px)",
                  willChange: "transform",
                  background: c.card,
                  padding: "10px 10px 0",
                  border: `1px solid ${c.border}`,
                  borderRadius: "160px 160px 8px 8px",
                  boxShadow: `0 24px 60px ${c.accent}33, 0 6px 18px rgba(0,0,0,0.12)`,
                }}
              >
                <div
                  style={{
                    borderRadius: "150px 150px 4px 4px",
                    overflow: "hidden",
                    aspectRatio: "3 / 4",
                    background: `linear-gradient(150deg, ${c.accent}22, ${c.gold}33)`,
                  }}
                >
                  {hasPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.coverPhotoUrl}
                      alt=""
                      loading="eager"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 36,
                        color: c.gold,
                      }}
                    >
                      {c.divider}
                    </div>
                  )}
                </div>
                <div style={{ padding: "10px 4px 14px" }}>
                  <span style={{ fontSize: 9, letterSpacing: "0.32em", color: c.muted }}>
                    {dateShort || "SAVE THE DATE"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* names */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <div className={opened ? "sk-open-3" : undefined} style={{ opacity: opened ? undefined : 0 }}>
            {nameRight ? (
              <h1
                style={{
                  fontFamily: display,
                  fontSize: "clamp(26px, 8.5cqw, 38px)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: c.text,
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {nameLeft}
                <span
                  style={{
                    fontFamily: script,
                    fontStyle: "normal",
                    color: c.accent,
                    padding: "0 12px",
                    fontSize: "0.9em",
                  }}
                >
                  &amp;
                </span>
                {nameRight}
              </h1>
            ) : (
              <h1
                style={{
                  fontFamily: display,
                  fontSize: "clamp(28px, 9cqw, 40px)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: c.text,
                  margin: 0,
                }}
              >
                {nameLeft || "Alex & Mei"}
              </h1>
            )}
          </div>
          {dateParts && (
            <div className={opened ? "sk-open-4" : undefined} style={{ opacity: opened ? undefined : 0 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "8px 18px",
                  border: `1px solid ${c.border}`,
                  borderRadius: 999,
                  fontSize: 10,
                  letterSpacing: "0.26em",
                  color: c.accent,
                  background: `${c.card}aa`,
                }}
              >
                {dateParts.longLabel}
              </span>
            </div>
          )}
          <div className={opened ? "sk-open-5" : undefined} style={{ opacity: opened ? undefined : 0 }}>
            <span style={{ fontSize: 16, color: c.gold }} aria-hidden>
              ⌄
            </span>
          </div>
        </div>
      </div>

      {/* ── Entrance overlay — tap anywhere to open ── */}
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
          cursor: "pointer",
          opacity: opened ? 0 : 1,
          pointerEvents: opened ? "none" : "auto",
          transition: "opacity 0.6s ease",
        }}
      >
        <PetalLayer color={`${c.accent}44`} zIndex={1} />
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            writingMode: "vertical-rl",
            fontSize: 8,
            letterSpacing: "0.3em",
            color: c.muted,
            opacity: 0.6,
          }}
        >
          {(data.tagline || "WEDDING DAY").toUpperCase()}
          {dateParts ? ` · ${dateParts.year}` : ""}
        </span>

        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px" }}>
          <p
            style={{
              fontFamily: script,
              fontSize: "clamp(44px, 15cqw, 64px)",
              fontWeight: 700,
              color: c.accent,
              lineHeight: 0.95,
              margin: "0 0 26px",
              transform: "rotate(-2deg)",
            }}
          >
            {data.tagline || "Wedding Invitation"}
          </p>

          {/* floating polaroid */}
          <div style={{ display: "inline-block", animation: reduced ? "none" : "sk-pol-float 3.5s ease-in-out infinite" }}>
            <div
              style={{
                width: "min(60cqw, 250px)",
                background: c.card,
                padding: "9px 9px 0",
                border: `1px solid ${c.border}`,
                boxShadow: `0 0 0 3px ${c.gold}18, 0 12px 36px rgba(0,0,0,0.12)`,
                position: "relative",
              }}
            >
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: -7,
                  left: -9,
                  width: 32,
                  height: 13,
                  background: `${c.gold}48`,
                  border: `0.5px solid ${c.gold}33`,
                  transform: "rotate(-18deg)",
                }}
              />
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: -7,
                  right: -9,
                  width: 32,
                  height: 13,
                  background: `${c.gold}48`,
                  border: `0.5px solid ${c.gold}33`,
                  transform: "rotate(18deg)",
                }}
              />
              <div style={{ aspectRatio: "5 / 4", overflow: "hidden", background: `${c.accent}11` }}>
                {hasPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.coverPhotoUrl}
                    alt=""
                    loading="eager"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%", display: "block" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 34,
                      color: c.gold,
                    }}
                  >
                    {c.divider}
                  </div>
                )}
              </div>
              <div style={{ padding: "10px 6px 16px", textAlign: "center" }}>
                <div style={{ fontFamily: script, fontSize: 20, fontWeight: 700, color: c.accent, lineHeight: 1.2 }}>
                  You Are Invited!
                </div>
                {dateShort && (
                  <div style={{ fontSize: 8, letterSpacing: "0.3em", color: c.muted, marginTop: 3 }}>
                    {dateShort}
                  </div>
                )}
              </div>
            </div>
          </div>

          <p
            style={{
              fontFamily: display,
              fontStyle: "italic",
              fontSize: 20,
              color: c.text,
              margin: "24px 0 4px",
            }}
          >
            {data.headline || "Alex & Mei"}
          </p>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              color: c.muted,
              margin: "14px 0 0",
              animation: reduced ? "none" : "sk-pulse 2s ease-in-out infinite",
            }}
          >
            Tap untuk buka · Tap to open
          </p>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------

export const landingModule = defineSection<"landing">({
  type: "landing",
  label: { en: "Landing", ms: "Pembukaan" },
  schema: z.object({
    headline: z.string().min(1, "Headline diperlukan"),
    subhead: z.string().optional(),
    tagline: z.string().optional(),
    coverPhotoUrl: cardImageReferenceSchema.optional(),
    eventDate: z.string().optional(),
  }),
  variants: {
    photo_hero: PhotoHero,
    minimalist: Minimalist,
    kinetic_hero: KineticHero,
    sakura_depth: SakuraDepth,
    poster_luxe: PosterLuxe,
    doodle_scrapbook: DoodleScrapbook,
    celestial_gate: CelestialGate,
    premiere_gate: PremiereGate,
  },
  variantLabels: {
    photo_hero: "Foto Hero",
    minimalist: "Minimalis",
    kinetic_hero: "Kinetik",
    sakura_depth: "Sakura 3D",
    poster_luxe: "Poster Editorial",
    doodle_scrapbook: "Doodle Scrapbook",
    celestial_gate: "Gerbang Bintang",
    premiere_gate: "Tayangan Perdana",
  },
  variantMeta: {
    sakura_depth: {
      swatch: "linear-gradient(135deg, #e8637f 0%, #7ab3c8 70%, #fffafb 130%)",
      hint: "Tap-untuk-buka + foto 3D berlapis dengan teks skrip & kelopak gugur",
      recommendedFor: [
        "wedding_general",
        "wedding_chinese",
        "engagement_general",
        "anniversary",
      ],
    },
    poster_luxe: {
      swatch: "linear-gradient(135deg, #fafaf9 0%, #111111 80%, #c0272d 130%)",
      hint: "Poster editorial minimalis — nama gergasi, foto bertindih, kad tarikh",
      recommendedFor: [
        "wedding_general",
        "wedding_chinese",
        "corporate_dinner",
        "anniversary",
      ],
    },
    doodle_scrapbook: {
      swatch: "linear-gradient(135deg, #fffdf6 0%, #e8637f 70%, #c9a23c 130%)",
      hint: "Scrapbook tulisan tangan — font krayon, doodle & pelekat",
      recommendedFor: [
        "wedding_general",
        "engagement_general",
        "birthday_kids",
        "birthday_milestone",
      ],
    },
    celestial_gate: {
      swatch: "linear-gradient(135deg, #101528 0%, #e8c97e 90%, #fff 140%)",
      hint: "Langit malam — sentuh-untuk-nyala, foto bulan purnama, bintang jatuh",
      recommendedFor: [
        "wedding_general",
        "wedding_malay",
        "engagement_general",
        "anniversary",
      ],
    },
    premiere_gate: {
      swatch: "linear-gradient(135deg, #0b0a09 0%, #b8a070 90%, #fafaf9 140%)",
      hint: "Tayangan filem — tekan ▶ untuk mula, kredit STARRING, tarikh premiere",
      recommendedFor: [
        "wedding_general",
        "wedding_chinese",
        "engagement_general",
        "anniversary",
      ],
    },
  },
  variantTiers: {
    kinetic_hero: "premium",
    sakura_depth: "premium",
    poster_luxe: "premium",
    doodle_scrapbook: "premium",
    celestial_gate: "premium",
    premiere_gate: "premium",
  },
  defaultVariant: "photo_hero",
  defaultData: {
    headline: "Sarah & Adam",
    subhead: "& ",
    tagline: "Walimatul Urus",
    coverPhotoUrl: "",
    eventDate: "",
  },
  appliesTo: "all",
})
