"use client"

import { useEffect, useRef, useState } from "react"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { splitHeadline, parseDateParts } from "./_hero_helpers"

// ---------------------------------------------------------------------------
// CelestialGate — the "Celestial Story" hero (see docs/DESIGN_CELESTIAL_STORY.md)
//
// One central idea: the invitation is a night sky the guest *lights up*.
//   1. Entrance — a sealed sky: a slowly-rotating star locket and the hint
//      "Tap to light the stars". Opening the card is the ritual.
//   2. On open — a shooting star crosses, the star field kindles, and the
//      couple's photo rises as the full moon over giant script words
//      ("written in / the stars"), with a constellation-style date row.
//   3. The hero bottom fades into the theme background so the night sky
//      continues seamlessly into the rest of the card.
//
// Depth recipe mirrors sakura_depth: bg star field (drifts with the pointer)
// → giant script words (slower) → moon-framed photo in front (drifts against
// the pointer). Opposite motion sells the depth.
//
// SSR-safe: every star/streak position comes from constant arrays — never
// Math.random() in render (sections are SSR'd; see project memory + design
// doc). Entrance is position:absolute, NOT fixed (editor preview is inline).
// ---------------------------------------------------------------------------

// Far stars — tiny, dim, twinkling. Distributed around the edges so the
// center stays readable. left/top in %, size px, twinkle duration s, delay s.
const STARS_FAR: readonly {
  left: string
  top: string
  size: number
  duration: number
  delay: number
  opacity: number
}[] = [
  { left: "4%",  top: "6%",  size: 2, duration: 3.2, delay: 0.0, opacity: 0.55 },
  { left: "12%", top: "14%", size: 1, duration: 4.1, delay: 0.7, opacity: 0.4 },
  { left: "22%", top: "5%",  size: 2, duration: 3.6, delay: 1.4, opacity: 0.5 },
  { left: "31%", top: "11%", size: 1, duration: 4.6, delay: 0.3, opacity: 0.35 },
  { left: "43%", top: "4%",  size: 2, duration: 3.0, delay: 2.1, opacity: 0.5 },
  { left: "55%", top: "9%",  size: 1, duration: 4.3, delay: 1.1, opacity: 0.4 },
  { left: "66%", top: "5%",  size: 2, duration: 3.4, delay: 0.5, opacity: 0.55 },
  { left: "78%", top: "12%", size: 1, duration: 4.8, delay: 1.8, opacity: 0.35 },
  { left: "88%", top: "7%",  size: 2, duration: 3.1, delay: 0.9, opacity: 0.5 },
  { left: "95%", top: "16%", size: 1, duration: 4.0, delay: 2.4, opacity: 0.4 },
  { left: "7%",  top: "30%", size: 1, duration: 4.4, delay: 1.6, opacity: 0.35 },
  { left: "93%", top: "32%", size: 2, duration: 3.5, delay: 0.2, opacity: 0.45 },
  { left: "3%",  top: "48%", size: 2, duration: 3.8, delay: 2.7, opacity: 0.4 },
  { left: "96%", top: "52%", size: 1, duration: 4.2, delay: 1.0, opacity: 0.35 },
  { left: "6%",  top: "66%", size: 1, duration: 4.7, delay: 0.6, opacity: 0.3 },
  { left: "94%", top: "70%", size: 2, duration: 3.3, delay: 1.9, opacity: 0.4 },
  { left: "10%", top: "84%", size: 2, duration: 3.7, delay: 0.4, opacity: 0.45 },
  { left: "24%", top: "92%", size: 1, duration: 4.5, delay: 2.2, opacity: 0.3 },
  { left: "47%", top: "95%", size: 2, duration: 3.2, delay: 1.3, opacity: 0.4 },
  { left: "71%", top: "93%", size: 1, duration: 4.1, delay: 0.8, opacity: 0.3 },
  { left: "86%", top: "88%", size: 2, duration: 3.6, delay: 2.5, opacity: 0.45 },
  { left: "38%", top: "20%", size: 1, duration: 4.9, delay: 1.5, opacity: 0.3 },
  { left: "62%", top: "18%", size: 1, duration: 4.4, delay: 0.1, opacity: 0.3 },
  { left: "16%", top: "55%", size: 1, duration: 5.1, delay: 2.0, opacity: 0.25 },
  { left: "84%", top: "58%", size: 1, duration: 4.6, delay: 1.2, opacity: 0.25 },
  { left: "50%", top: "13%", size: 1, duration: 3.9, delay: 2.8, opacity: 0.35 },
]

// Near stars — bigger, gold, glowing. These live on the pointer-parallax
// layer, so they feel closer than the far field.
const STARS_NEAR: readonly {
  left: string
  top: string
  size: number
  duration: number
  delay: number
  opacity: number
}[] = [
  { left: "9%",  top: "10%", size: 3, duration: 4.2, delay: 0.0, opacity: 0.8 },
  { left: "27%", top: "7%",  size: 4, duration: 5.0, delay: 1.3, opacity: 0.7 },
  { left: "58%", top: "6%",  size: 3, duration: 4.5, delay: 0.6, opacity: 0.75 },
  { left: "82%", top: "10%", size: 4, duration: 4.0, delay: 2.0, opacity: 0.8 },
  { left: "94%", top: "26%", size: 3, duration: 5.3, delay: 0.9, opacity: 0.65 },
  { left: "5%",  top: "38%", size: 3, duration: 4.7, delay: 1.7, opacity: 0.7 },
  { left: "95%", top: "44%", size: 3, duration: 4.3, delay: 0.3, opacity: 0.65 },
  { left: "4%",  top: "58%", size: 4, duration: 5.1, delay: 2.4, opacity: 0.7 },
  { left: "92%", top: "64%", size: 3, duration: 4.6, delay: 1.1, opacity: 0.6 },
  { left: "8%",  top: "78%", size: 3, duration: 4.1, delay: 0.5, opacity: 0.7 },
  { left: "90%", top: "82%", size: 4, duration: 4.9, delay: 1.9, opacity: 0.75 },
  { left: "33%", top: "94%", size: 3, duration: 4.4, delay: 0.8, opacity: 0.6 },
  { left: "64%", top: "96%", size: 3, duration: 5.2, delay: 2.2, opacity: 0.65 },
  { left: "76%", top: "90%", size: 3, duration: 4.8, delay: 1.5, opacity: 0.6 },
]

// Shooting stars — long off-cycle keyframes so each streak is rare (visible
// ~12% of its loop). Positions/angles are constants.
const STREAKS: readonly { top: string; left: string; duration: number; delay: number }[] = [
  { top: "12%", left: "-12%", duration: 9,  delay: 1.6 },
  { top: "30%", left: "-18%", duration: 13, delay: 6.5 },
]

const CELESTIAL_CSS = `
  @keyframes cl-twinkle {
    0%, 100% { opacity: var(--tw-base); transform: scale(1); }
    50%      { opacity: 1; transform: scale(1.35); }
  }
  @keyframes cl-shoot {
    0%   { transform: translate3d(0, 0, 0) rotate(32deg); opacity: 0; }
    3%   { opacity: 1; }
    12%  { transform: translate3d(130cqw, 76cqw, 0) rotate(32deg); opacity: 0; }
    100% { transform: translate3d(130cqw, 76cqw, 0) rotate(32deg); opacity: 0; }
  }
  @keyframes cl-nebula-a {
    0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
    50%      { transform: translate3d(6%, -4%, 0) scale(1.08); }
  }
  @keyframes cl-nebula-b {
    0%, 100% { transform: translate3d(0, 0, 0) scale(1.05); }
    50%      { transform: translate3d(-5%, 5%, 0) scale(1); }
  }
  @keyframes cl-moon-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-9px); }
  }
  @keyframes cl-orbit {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes cl-ring-spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(-360deg); }
  }
  @keyframes cl-locket-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-7px); }
  }
  @keyframes cl-pulse {
    0%, 100% { opacity: 0.45; }
    50%      { opacity: 1; }
  }
  @keyframes cl-fade-up {
    0%   { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes cl-moon-rise {
    0%   { opacity: 0; transform: translateY(34px) scale(0.92); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes cl-glow-in {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  .cl-star { position: absolute; border-radius: 50%; pointer-events: none;
             animation: cl-twinkle var(--tw-dur) ease-in-out var(--tw-delay) infinite; }
  .cl-streak { position: absolute; height: 1.5px; width: 90px; pointer-events: none;
               transform-origin: left center;
               animation: cl-shoot var(--st-dur) ease-in var(--st-delay) infinite; }
  .cl-nebula-a { animation: cl-nebula-a 26s ease-in-out infinite; }
  .cl-nebula-b { animation: cl-nebula-b 31s ease-in-out infinite; }
  .cl-moon-float { animation: cl-moon-float 6.5s ease-in-out 2.2s infinite; }
  .cl-orbit { animation: cl-orbit 22s linear infinite; }
  .cl-ring-spin { animation: cl-ring-spin 48s linear infinite; }
  .cl-locket-float { animation: cl-locket-float 4s ease-in-out infinite; }
  .cl-pulse { animation: cl-pulse 2.2s ease-in-out infinite; }
  .cl-open-1 { animation: cl-glow-in 1.0s ease 0.2s both; }
  .cl-open-2 { animation: cl-fade-up 1.1s ease 0.45s both; }
  .cl-open-3 { animation: cl-moon-rise 1.4s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both; }
  .cl-open-4 { animation: cl-fade-up 1.0s ease 1.1s both; }
  .cl-open-5 { animation: cl-fade-up 1.0s ease 1.4s both; }
  .cl-open-6 { animation: cl-fade-up 1.0s ease 1.7s both; }

  /* Reduced-motion kill switches */
  [data-cl-reduced="true"] .cl-star,
  [data-cl-reduced="true"] .cl-streak,
  [data-cl-reduced="true"] .cl-nebula-a,
  [data-cl-reduced="true"] .cl-nebula-b,
  [data-cl-reduced="true"] .cl-moon-float,
  [data-cl-reduced="true"] .cl-orbit,
  [data-cl-reduced="true"] .cl-ring-spin,
  [data-cl-reduced="true"] .cl-locket-float,
  [data-cl-reduced="true"] .cl-pulse { animation: none !important; }
  [data-cl-reduced="true"] .cl-streak { opacity: 0; }
  [data-cl-reduced="true"] .cl-open-1, [data-cl-reduced="true"] .cl-open-2,
  [data-cl-reduced="true"] .cl-open-3, [data-cl-reduced="true"] .cl-open-4,
  [data-cl-reduced="true"] .cl-open-5, [data-cl-reduced="true"] .cl-open-6 {
    animation: none; opacity: 1; transform: none;
  }
  [data-cl-reduced="true"] .cl-parallax { transform: none !important; }
`

function StarField({
  stars,
  color,
  glow,
}: {
  stars: typeof STARS_FAR
  color: string
  glow?: boolean
}) {
  return (
    <>
      {stars.map((s, i) => (
        <span
          key={i}
          className="cl-star"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            background: color,
            boxShadow: glow ? `0 0 ${s.size * 3}px ${color}` : "none",
            ["--tw-base" as never]: String(s.opacity),
            ["--tw-dur" as never]: `${s.duration}s`,
            ["--tw-delay" as never]: `${s.delay}s`,
            opacity: s.opacity,
          }}
        />
      ))}
    </>
  )
}

/** Soft accent/gold washes that make the flat bg read as a deep sky. */
function NightSky({ accent, gold }: { accent: string; gold: string }) {
  return (
    <>
      <div
        aria-hidden
        className="cl-nebula-a"
        style={{
          position: "absolute",
          inset: "-20% -30% auto -30%",
          height: "70%",
          background: `radial-gradient(60% 55% at 35% 40%, ${accent}2e 0%, transparent 70%)`,
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        className="cl-nebula-b"
        style={{
          position: "absolute",
          inset: "auto -30% -25% -30%",
          height: "65%",
          background: `radial-gradient(55% 50% at 65% 60%, ${gold}21 0%, transparent 70%)`,
          filter: "blur(12px)",
          pointerEvents: "none",
        }}
      />
    </>
  )
}

/** Constellation date row — DD ✦ MM ✦ YYYY joined by hairlines, the numbers
 *  reading like stars charted on a line. */
function ConstellationDate({
  parts,
  ink,
  inkSoft,
  gold,
  display,
  body,
}: {
  parts: { day: string; month: string; year: string; longLabel: string }
  ink: string
  inkSoft: string
  gold: string
  display?: string
  body?: string
}) {
  const node = (
    <span
      aria-hidden
      style={{
        width: 4,
        height: 4,
        borderRadius: "50%",
        background: gold,
        boxShadow: `0 0 8px ${gold}`,
        flexShrink: 0,
      }}
    />
  )
  const line = (
    <span
      aria-hidden
      style={{
        width: 26,
        height: 1,
        background: `linear-gradient(90deg, ${gold}00, ${gold}88, ${gold}00)`,
        flexShrink: 0,
      }}
    />
  )
  const num = (v: string) => (
    <span
      style={{
        fontFamily: display,
        fontSize: 26,
        lineHeight: 1,
        color: ink,
        letterSpacing: "0.06em",
        textShadow: `0 0 18px ${gold}44`,
        fontVariantNumeric: "lining-nums",
      }}
    >
      {v}
    </span>
  )
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {node}
        {line}
        {num(parts.day)}
        {line}
        {node}
        {line}
        {num(parts.month)}
        {line}
        {node}
        {line}
        {num(parts.year)}
        {line}
        {node}
      </div>
      <span
        style={{
          fontFamily: body,
          fontSize: 9,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: inkSoft,
          paddingLeft: "0.32em",
        }}
      >
        {parts.longLabel}
      </span>
    </div>
  )
}

export const CelestialGate: SectionRenderer<"landing"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const display = fontFor(theme, "display")
  const script = fontFor(theme, "script") || display
  const body = fontFor(theme, "body")

  const { left: nameLeft, right: nameRight } = splitHeadline(data.headline || "")
  const dateParts = parseDateParts(data.eventDate)
  const hasPhoto = !!data.coverPhotoUrl

  const [opened, setOpened] = useState(false)
  const [reduced, setReduced] = useState(false)
  const skyRef = useRef<HTMLDivElement | null>(null)
  const wordsRef = useRef<HTMLDivElement | null>(null)
  const moonRef = useRef<HTMLDivElement | null>(null)

  // Pointer + scroll parallax — sky drifts with the pointer, the moon print
  // drifts against it (the opposite motion is what sells the depth). Pointer
  // input only on fine pointers; phones get the float keyframes + scroll.
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
      const scrollOffset = Math.min(scrollY * 0.16, 160)
      if (skyRef.current) {
        skyRef.current.style.transform = `translate3d(${cx * 10}px, ${scrollOffset + cy * 8}px, 0)`
      }
      if (wordsRef.current) {
        wordsRef.current.style.transform = `translate3d(${cx * 5}px, ${scrollY * 0.04 + cy * 3}px, 0)`
      }
      if (moonRef.current) {
        moonRef.current.style.transform = `translate3d(${cx * -14}px, ${scrollY * -0.05 + cy * -9}px, 0)`
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

  // The moon — circular photo with a glowing halo and a tiny satellite star
  // orbiting it. Reused at two sizes (locket in the entrance, full moon in
  // the hero).
  const moon = (size: string, withOrbit: boolean) => (
    <div style={{ position: "relative", width: size, aspectRatio: "1" }}>
      {withOrbit && (
        <>
          {/* dashed orbit ring, slightly larger than the moon, slow counter-spin */}
          <div
            aria-hidden
            className="cl-ring-spin"
            style={{
              position: "absolute",
              inset: "-7%",
              borderRadius: "50%",
              border: `1px dashed ${c.gold}55`,
            }}
          />
          {/* satellite star riding the orbit */}
          <div aria-hidden className="cl-orbit" style={{ position: "absolute", inset: "-7%" }}>
            <span
              style={{
                position: "absolute",
                top: -3,
                left: "50%",
                marginLeft: -3,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: c.gold,
                boxShadow: `0 0 10px ${c.gold}`,
              }}
            />
          </div>
        </>
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          overflow: "hidden",
          border: `1.5px solid ${c.gold}88`,
          boxShadow: `0 0 60px ${c.gold}40, 0 0 140px ${c.gold}1f, inset 0 0 30px ${c.gold}22`,
          background: `radial-gradient(circle at 38% 32%, ${c.gold}66 0%, ${c.accent}33 55%, ${c.bg} 100%)`,
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
              fontSize: 30,
              color: c.gold,
              textShadow: `0 0 20px ${c.gold}`,
            }}
          >
            {c.divider}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <section
      data-cl-reduced={reduced ? "true" : "false"}
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
      <style>{CELESTIAL_CSS}</style>

      {/* ── Depth layer 1 (deepest): sky — nebula washes + far star field ── */}
      <div
        ref={skyRef}
        aria-hidden
        className="cl-parallax"
        style={{ position: "absolute", inset: "-10%", zIndex: 0, willChange: "transform" }}
      >
        <NightSky accent={c.accent} gold={c.gold} />
        <StarField stars={STARS_FAR} color={c.text} />
        <StarField stars={STARS_NEAR} color={c.gold} glow />
      </div>

      {/* shooting stars — start once the sky is open */}
      {opened && (
        <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
          {STREAKS.map((s, i) => (
            <span
              key={i}
              className="cl-streak"
              style={{
                top: s.top,
                left: s.left,
                background: `linear-gradient(90deg, ${c.gold}00, ${c.gold}cc 60%, #ffffff)`,
                ["--st-dur" as never]: `${s.duration}s`,
                ["--st-delay" as never]: `${s.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Content grid: tagline / moon over script words / names + date ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100dvh",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          rowGap: 18,
          padding: "42px 28px 48px",
          textAlign: "center",
        }}
      >
        {/* tagline ribbon */}
        <div className={opened ? "cl-open-1" : undefined} style={{ opacity: opened ? undefined : 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span aria-hidden style={{ width: 26, height: 1, background: `${c.gold}55` }} />
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                color: c.muted,
                paddingLeft: "0.4em",
              }}
            >
              {data.tagline || "Written in the Stars"}
            </span>
            <span aria-hidden style={{ width: 26, height: 1, background: `${c.gold}55` }} />
          </div>
          {data.subhead && (
            <p style={{ fontSize: 11, color: c.muted, letterSpacing: "0.14em", margin: "10px 0 0" }}>
              {data.subhead}
            </p>
          )}
        </div>

        {/* ── Depth layers 2 + 3: giant script words BEHIND the moon print ── */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            ref={wordsRef}
            aria-hidden
            className={`cl-parallax ${opened ? "cl-open-2" : ""}`}
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
                top: "0%",
                left: "-3%",
                fontFamily: script,
                fontSize: "clamp(42px, 15cqw, 72px)",
                fontWeight: 600,
                color: c.accent,
                opacity: 0.55,
                transform: "rotate(-7deg)",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              written in
            </span>
            <span
              style={{
                position: "absolute",
                bottom: "1%",
                right: "-4%",
                fontFamily: script,
                fontSize: "clamp(36px, 13cqw, 62px)",
                fontWeight: 600,
                color: c.muted,
                opacity: 0.5,
                transform: "rotate(-5deg)",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              the stars
            </span>
          </div>

          {/* the full moon — couple photo in front */}
          <div className={opened ? "cl-open-3" : undefined} style={{ position: "relative", zIndex: 1, opacity: opened ? undefined : 0 }}>
            <div className="cl-moon-float">
              <div ref={moonRef} style={{ willChange: "transform" }}>
                {moon("min(62cqw, 264px)", true)}
              </div>
            </div>
          </div>
        </div>

        {/* names + constellation date + scroll hint */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <div className={opened ? "cl-open-4" : undefined} style={{ opacity: opened ? undefined : 0 }}>
            {nameRight ? (
              <h1
                style={{
                  fontFamily: display,
                  fontSize: "clamp(27px, 8.6cqw, 38px)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: c.text,
                  margin: 0,
                  lineHeight: 1.25,
                  textShadow: `0 0 30px ${c.accent}33`,
                }}
              >
                {nameLeft}
                <span
                  style={{
                    fontFamily: script,
                    fontStyle: "normal",
                    color: c.gold,
                    padding: "0 12px",
                    fontSize: "1.05em",
                    textShadow: `0 0 22px ${c.gold}88`,
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
                {nameLeft || "Zara & Iskandar"}
              </h1>
            )}
          </div>

          {dateParts && (
            <div className={opened ? "cl-open-5" : undefined} style={{ opacity: opened ? undefined : 0 }}>
              <ConstellationDate
                parts={dateParts}
                ink={c.text}
                inkSoft={c.muted}
                gold={c.gold}
                display={display}
                body={body}
              />
            </div>
          )}

          <div className={opened ? "cl-open-6" : undefined} style={{ opacity: opened ? undefined : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span className="cl-pulse" style={{ fontSize: 11, color: c.gold }} aria-hidden>
                ✦
              </span>
              <span
                aria-hidden
                style={{
                  width: 1,
                  height: 26,
                  background: `linear-gradient(180deg, ${c.gold}88, ${c.gold}00)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* bottom seam — the sky fades into the card background so the night
          continues seamlessly into the next section */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 120,
          zIndex: 3,
          background: `linear-gradient(180deg, ${c.bg}00, ${c.bg})`,
          pointerEvents: "none",
        }}
      />

      {/* ── Entrance overlay — tap to light the stars ── */}
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
          transition: "opacity 0.8s ease",
          overflow: "hidden",
        }}
      >
        <div aria-hidden style={{ position: "absolute", inset: 0 }}>
          <NightSky accent={c.accent} gold={c.gold} />
          <StarField stars={STARS_FAR} color={c.text} />
        </div>

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
          {(data.tagline || "WRITTEN IN THE STARS").toUpperCase()}
          {dateParts ? ` · ${dateParts.year}` : ""}
        </span>

        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px" }}>
          <p
            style={{
              fontFamily: script,
              fontSize: "clamp(38px, 13cqw, 56px)",
              fontWeight: 600,
              color: c.accent,
              lineHeight: 1,
              margin: "0 0 30px",
              transform: "rotate(-2deg)",
              textShadow: `0 0 40px ${c.accent}55`,
            }}
          >
            {data.tagline || "Written in the Stars"}
          </p>

          {/* the star locket — a small sealed moon the guest opens */}
          <div className="cl-locket-float" style={{ display: "inline-block" }}>
            {moon("min(40cqw, 168px)", true)}
          </div>

          <p
            style={{
              fontFamily: display,
              fontStyle: "italic",
              fontSize: 21,
              color: c.text,
              margin: "26px 0 0",
            }}
          >
            {data.headline || "Zara & Iskandar"}
          </p>
          {dateShort && (
            <p style={{ fontSize: 9, letterSpacing: "0.32em", color: c.muted, margin: "10px 0 0" }}>
              {dateShort}
            </p>
          )}

          <p
            className="cl-pulse"
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: c.gold,
              margin: "26px 0 0",
            }}
          >
            ✦ Sentuh untuk menyalakan bintang · Tap to light the stars ✦
          </p>
        </div>
      </div>
    </section>
  )
}
