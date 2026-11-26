"use client"

import { useEffect, useRef, useState } from "react"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { splitHeadline, parseDateParts } from "./_hero_helpers"

// ---------------------------------------------------------------------------
// PremiereGate — the "Cinema Story" hero (see docs/DESIGN_CINEMA_STORY.md)
//
// One central idea: the invitation is a film premiere the guest *plays*.
//   1. Entrance — a black title card between two film-strip bands: production
//      tag, film title, a pulsing ▶ button. Tapping "starts the screening".
//   2. On open — the projector flickers to life, the couple's photo runs as a
//      letterboxed ken-burns shot, and the names land as a film title with a
//      letter-spacing reveal over "STARRING" credits ("Directed by Fate ·
//      Produced by Love"), closing on a PREMIERE date plaque.
//   3. The film-strip bands top and bottom frame the whole hero, so the
//      letterbox IS the seam into the rest of the card.
//
// The screen itself is cinema-black by design (a black screen is the one
// palette-neutral surface), while every accent — gold, fonts, divider,
// production tag — reads from the theme, so any Gaya recolours the credits.
//
// SSR-safe: dust-mote positions come from a constant array — never
// Math.random() in render (sections are SSR'd; see project memory + design
// doc). Entrance is position:absolute, NOT fixed (editor preview is inline).
// ---------------------------------------------------------------------------

// Projector-beam dust — small drifting motes over the screen. left/top in %,
// size px, drift duration s, delay s, drift pattern a/b/c.
const DUST: readonly {
  left: string
  top: string
  size: number
  duration: number
  delay: number
  opacity: number
  pattern: "a" | "b" | "c"
}[] = [
  { left: "6%",  top: "16%", size: 3, duration: 15, delay: 0.0, opacity: 0.4,  pattern: "a" },
  { left: "90%", top: "20%", size: 2, duration: 18, delay: 2.2, opacity: 0.3,  pattern: "b" },
  { left: "14%", top: "62%", size: 3, duration: 16, delay: 1.1, opacity: 0.35, pattern: "c" },
  { left: "84%", top: "70%", size: 2, duration: 19, delay: 3.0, opacity: 0.3,  pattern: "a" },
  { left: "48%", top: "12%", size: 2, duration: 17, delay: 0.6, opacity: 0.25, pattern: "b" },
  { left: "70%", top: "44%", size: 3, duration: 14, delay: 1.8, opacity: 0.35, pattern: "c" },
  { left: "10%", top: "38%", size: 2, duration: 20, delay: 2.6, opacity: 0.25, pattern: "b" },
  { left: "92%", top: "52%", size: 2, duration: 16, delay: 0.9, opacity: 0.3,  pattern: "c" },
  { left: "30%", top: "84%", size: 3, duration: 18, delay: 1.4, opacity: 0.3,  pattern: "a" },
  { left: "62%", top: "88%", size: 2, duration: 15, delay: 3.4, opacity: 0.25, pattern: "b" },
]

// The screen is cinema-black regardless of Gaya — a black screen is the one
// palette-neutral surface. Accents/typography stay theme-driven.
const SCREEN_BLACK = "#0b0a09"
const SCREEN_INK = "#f5f1e8"
const SCREEN_INK_SOFT = "rgba(245, 241, 232, 0.72)"
const SCREEN_INK_FAINT = "rgba(245, 241, 232, 0.4)"

const CINEMA_CSS = `
  @keyframes cn-kenburns {
    0%   { transform: scale(1.12) translate3d(0, 0, 0); }
    50%  { transform: scale(1.2)  translate3d(-1.6%, -1.2%, 0); }
    100% { transform: scale(1.12) translate3d(0, 0, 0); }
  }
  /* Projector warm-up — a few uneven brightness steps right after opening */
  @keyframes cn-flicker {
    0%   { opacity: 0; }
    12%  { opacity: 0.85; }
    20%  { opacity: 0.55; }
    34%  { opacity: 0.95; }
    46%  { opacity: 0.7; }
    60%  { opacity: 1; }
    74%  { opacity: 0.9; }
    100% { opacity: 1; }
  }
  /* Film-title reveal — tracking tightens as the title fades in */
  @keyframes cn-title {
    0%   { opacity: 0; letter-spacing: 0.4em; filter: blur(7px); }
    100% { opacity: 1; letter-spacing: 0.12em; filter: blur(0); }
  }
  @keyframes cn-fade-up {
    0%   { opacity: 0; transform: translateY(14px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes cn-fade-in {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes cn-rule-expand {
    0%   { transform: scaleX(0); }
    100% { transform: scaleX(1); }
  }
  @keyframes cn-play-pulse {
    0%   { box-shadow: 0 0 0 0 var(--cn-ring); }
    70%  { box-shadow: 0 0 0 22px transparent; }
    100% { box-shadow: 0 0 0 22px transparent; }
  }
  @keyframes cn-play-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-7px); }
  }
  @keyframes cn-hint-pulse {
    0%, 100% { opacity: 0.45; }
    50%      { opacity: 1; }
  }
  @keyframes cn-drift-a {
    0%   { transform: translate3d(0, 0, 0); }
    50%  { transform: translate3d(12px, -20px, 0); }
    100% { transform: translate3d(0, 0, 0); }
  }
  @keyframes cn-drift-b {
    0%   { transform: translate3d(0, 0, 0); }
    50%  { transform: translate3d(-16px, -26px, 0); }
    100% { transform: translate3d(0, 0, 0); }
  }
  @keyframes cn-drift-c {
    0%   { transform: translate3d(0, 0, 0); }
    50%  { transform: translate3d(8px, -32px, 0); }
    100% { transform: translate3d(0, 0, 0); }
  }
  .cn-photo      { animation: cn-kenburns 30s ease-in-out infinite; transform-origin: 50% 42%; }
  .cn-flicker    { animation: cn-flicker 1.5s steps(8, end) 0.1s both; }
  .cn-dust       { position: absolute; border-radius: 50%; pointer-events: none; }
  .cn-play-float { animation: cn-play-float 3.6s ease-in-out infinite; }
  .cn-play-ring  { animation: cn-play-pulse 2.6s ease-out 1.2s infinite; }
  .cn-hint       { animation: cn-hint-pulse 2.2s ease-in-out infinite; }
  .cn-open-1 { animation: cn-fade-in 1.0s ease 0.5s both; }
  .cn-open-2 { animation: cn-fade-up 0.9s ease 0.9s both; }
  .cn-open-3 { animation: cn-title 1.6s cubic-bezier(0.22, 0.61, 0.36, 1) 1.1s both; }
  .cn-open-4 { animation: cn-fade-up 1.0s ease 2.0s both; }
  .cn-open-5 { animation: cn-fade-up 1.0s ease 2.4s both; }
  .cn-open-6 { animation: cn-fade-up 1.0s ease 2.8s both; }
  .cn-rule   { transform-origin: center; animation: cn-rule-expand 1.1s cubic-bezier(0.22, 0.61, 0.36, 1) 2.2s both; }

  /* Reduced-motion kill switches */
  [data-cn-reduced="true"] .cn-photo,
  [data-cn-reduced="true"] .cn-flicker,
  [data-cn-reduced="true"] .cn-dust,
  [data-cn-reduced="true"] .cn-play-float,
  [data-cn-reduced="true"] .cn-play-ring,
  [data-cn-reduced="true"] .cn-hint { animation: none !important; }
  [data-cn-reduced="true"] .cn-flicker { opacity: 1; }
  [data-cn-reduced="true"] .cn-open-1, [data-cn-reduced="true"] .cn-open-2,
  [data-cn-reduced="true"] .cn-open-3, [data-cn-reduced="true"] .cn-open-4,
  [data-cn-reduced="true"] .cn-open-5, [data-cn-reduced="true"] .cn-open-6 {
    animation: none; opacity: 1; transform: none; filter: none; letter-spacing: 0.12em;
  }
  [data-cn-reduced="true"] .cn-rule { animation: none; transform: scaleX(1); }
  [data-cn-reduced="true"] .cn-parallax { transform: none !important; }
`

// SVG film grain — same fractal-noise recipe as the kinetic hero.
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

/** Horizontal film-strip band — black with a row of lit sprocket holes. */
function FilmBand({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [position]: 0,
        height: 24,
        background: SCREEN_BLACK,
        backgroundImage:
          "radial-gradient(circle at 50% 50%, rgba(245,241,232,0.16) 0 2.5px, transparent 3.5px)",
        backgroundSize: "20px 100%",
        backgroundPosition: "center",
        zIndex: 6,
        pointerEvents: "none",
      }}
    />
  )
}

/** Parse a credit line like "Directed by Fate · Produced by Love" into
 *  role/name pairs. Falls back to null when the line doesn't read as credits,
 *  in which case the caller renders the raw text. */
function parseCredits(line?: string): { role: string; name: string }[] | null {
  if (!line) return null
  const parts = line.split(/[·•|]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return null
  const credits: { role: string; name: string }[] = []
  for (const part of parts) {
    const m = part.match(/^(.*\b(?:by|oleh))\s+(.+)$/i)
    if (!m) return null
    credits.push({ role: m[1].trim(), name: m[2].trim() })
  }
  return credits
}

export const PremiereGate: SectionRenderer<"landing"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const display = fontFor(theme, "display")
  const body = fontFor(theme, "body")

  const { left: nameLeft, right: nameRight } = splitHeadline(data.headline || "")
  const dateParts = parseDateParts(data.eventDate)
  const hasPhoto = !!data.coverPhotoUrl
  const credits = parseCredits(data.subhead)
  const productionTag = (c.opening || "A Wedding Production").toUpperCase()

  const [opened, setOpened] = useState(false)
  const [reduced, setReduced] = useState(false)
  const screenRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLDivElement | null>(null)

  // Pointer + scroll parallax — the screen (photo) drifts with the pointer,
  // the title block against it. Pointer input only on fine pointers; phones
  // get the ken-burns + scroll offset instead.
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
      const scrollOffset = Math.min(scrollY * 0.14, 140)
      if (screenRef.current) {
        screenRef.current.style.transform = `translate3d(${cx * 10}px, ${scrollOffset + cy * 7}px, 0)`
      }
      if (titleRef.current) {
        titleRef.current.style.transform = `translate3d(${cx * -7}px, ${scrollY * -0.04 + cy * -5}px, 0)`
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

  const dateShort = dateParts ? `${dateParts.day}.${dateParts.month}.${dateParts.year}` : ""

  return (
    <section
      data-cn-reduced={reduced ? "true" : "false"}
      style={{
        position: "relative",
        minHeight: "100dvh",
        overflow: "hidden",
        isolation: "isolate",
        background: SCREEN_BLACK,
        color: SCREEN_INK,
        fontFamily: body,
      }}
    >
      <style>{CINEMA_CSS}</style>

      {/* ── The screen: ken-burns photo (or a projector-spotlight wash) ── */}
      <div className={opened ? "cn-flicker" : undefined} style={{ position: "absolute", inset: 0, zIndex: 0, opacity: opened ? undefined : 1 }}>
        <div
          ref={screenRef}
          aria-hidden
          className="cn-parallax"
          style={{ position: "absolute", inset: "-12% 0", willChange: "transform" }}
        >
          <div
            className="cn-photo"
            style={{
              position: "absolute",
              inset: 0,
              background: hasPhoto
                ? `url(${data.coverPhotoUrl}) center/cover no-repeat`
                : `radial-gradient(110% 85% at 50% 32%, ${c.gold}3d 0%, #221e18 55%, ${SCREEN_BLACK} 100%)`,
              filter: hasPhoto ? "saturate(0.82) contrast(1.06)" : "none",
              willChange: "transform",
            }}
          />
        </div>

        {/* letterbox vignette — dark at top/bottom so the type sits on film */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(11,10,9,0.82) 0%, rgba(11,10,9,0.25) 26%, rgba(11,10,9,0.2) 55%, rgba(11,10,9,0.88) 100%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(120% 80% at 50% 45%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.62) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* film grain */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${GRAIN_DATA_URL}")`,
          backgroundSize: "200px 200px",
          mixBlendMode: "overlay",
          opacity: 0.4,
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* projector-beam dust */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
        {DUST.map((d, i) => (
          <span
            key={i}
            className="cn-dust"
            style={{
              left: d.left,
              top: d.top,
              width: d.size,
              height: d.size,
              background: `radial-gradient(circle, ${c.gold} 0%, ${c.gold}00 70%)`,
              opacity: d.opacity,
              animation: `cn-drift-${d.pattern} ${d.duration}s ease-in-out ${d.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* film-strip bands framing the screen */}
      <FilmBand position="top" />
      <FilmBand position="bottom" />

      {/* ── Composition: production tag / starring title / premiere plaque ── */}
      <div
        ref={titleRef}
        className="cn-parallax"
        style={{
          position: "relative",
          zIndex: 4,
          minHeight: "100dvh",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          rowGap: 22,
          padding: "58px 30px 56px",
          textAlign: "center",
          willChange: "transform",
        }}
      >
        {/* production tag */}
        <div className={opened ? "cn-open-1" : undefined} style={{ opacity: opened ? undefined : 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span aria-hidden style={{ width: 26, height: 1, background: SCREEN_INK_FAINT }} />
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.42em",
                textTransform: "uppercase",
                color: SCREEN_INK_SOFT,
                paddingLeft: "0.42em",
              }}
            >
              {productionTag}
            </span>
            <span aria-hidden style={{ width: 26, height: 1, background: SCREEN_INK_FAINT }} />
          </div>
          {data.tagline && (
            <p
              style={{
                fontFamily: display,
                fontStyle: "italic",
                fontSize: 17,
                color: c.gold,
                letterSpacing: "0.1em",
                margin: "12px 0 0",
              }}
            >
              {data.tagline}
            </p>
          )}
        </div>

        {/* starring block — the film title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>
          <span
            className={opened ? "cn-open-2" : undefined}
            style={{
              fontSize: 10,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              color: c.gold,
              paddingLeft: "0.5em",
              marginBottom: 18,
              opacity: opened ? undefined : 0,
            }}
          >
            Starring
          </span>

          <div className={opened ? "cn-open-3" : undefined} style={{ opacity: opened ? undefined : 0 }}>
            {nameRight ? (
              <h1
                style={{
                  fontFamily: display,
                  fontWeight: 500,
                  fontSize: "clamp(30px, 9.6cqw, 46px)",
                  lineHeight: 1.22,
                  letterSpacing: "inherit",
                  textTransform: "uppercase",
                  color: SCREEN_INK,
                  margin: 0,
                  textShadow: "0 2px 28px rgba(0,0,0,0.5)",
                }}
              >
                {nameLeft}
                <span
                  aria-hidden
                  style={{
                    display: "block",
                    fontFamily: display,
                    fontStyle: "italic",
                    textTransform: "none",
                    fontSize: "0.62em",
                    color: c.gold,
                    lineHeight: 1.3,
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
                  fontWeight: 500,
                  fontSize: "clamp(32px, 10cqw, 48px)",
                  lineHeight: 1.15,
                  letterSpacing: "inherit",
                  textTransform: "uppercase",
                  color: SCREEN_INK,
                  margin: 0,
                  textShadow: "0 2px 28px rgba(0,0,0,0.5)",
                }}
              >
                {nameLeft || "Amira & Daniel"}
              </h1>
            )}
          </div>

          {/* credits — "DIRECTED BY Fate · PRODUCED BY Love" */}
          <div className={opened ? "cn-open-4" : undefined} style={{ marginTop: 24, opacity: opened ? undefined : 0 }}>
            {credits ? (
              <div style={{ display: "flex", justifyContent: "center", gap: 34 }}>
                {credits.map((cr, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span
                      style={{
                        fontSize: 8,
                        letterSpacing: "0.34em",
                        textTransform: "uppercase",
                        color: SCREEN_INK_SOFT,
                        paddingLeft: "0.34em",
                      }}
                    >
                      {cr.role}
                    </span>
                    <span style={{ fontFamily: display, fontStyle: "italic", fontSize: 17, color: c.gold }}>
                      {cr.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              data.subhead && (
                <p
                  style={{
                    fontFamily: display,
                    fontStyle: "italic",
                    fontSize: 14,
                    letterSpacing: "0.08em",
                    color: SCREEN_INK_SOFT,
                    maxWidth: 300,
                    margin: 0,
                  }}
                >
                  {data.subhead}
                </p>
              )
            )}
          </div>
        </div>

        {/* premiere plaque */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {dateParts ? (
            <div className={opened ? "cn-open-5" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: opened ? undefined : 0 }}>
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.46em",
                  textTransform: "uppercase",
                  color: c.gold,
                  paddingLeft: "0.46em",
                }}
              >
                Premiere
              </span>
              <span
                style={{
                  fontFamily: display,
                  fontSize: 30,
                  lineHeight: 1,
                  color: SCREEN_INK,
                  letterSpacing: "0.14em",
                  fontVariantNumeric: "lining-nums",
                  textShadow: "0 2px 22px rgba(0,0,0,0.5)",
                }}
              >
                {dateShort}
              </span>
              <span
                aria-hidden
                className="cn-rule"
                style={{ display: "block", width: 54, height: 1, background: c.gold, opacity: 0.8 }}
              />
              <span
                style={{
                  fontSize: 8,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: SCREEN_INK_SOFT,
                  paddingLeft: "0.3em",
                }}
              >
                {dateParts.longLabel}
              </span>
            </div>
          ) : (
            <span
              aria-hidden
              className={opened ? "cn-open-5" : undefined}
              style={{ display: "block", width: 54, height: 1, background: c.gold, opacity: opened ? 0.8 : 0 }}
            />
          )}

          <div className={opened ? "cn-open-6" : undefined} style={{ opacity: opened ? undefined : 0 }}>
            <span className="cn-hint" style={{ fontSize: 14, color: c.gold, display: "inline-block" }} aria-hidden>
              ⌄
            </span>
          </div>
        </div>
      </div>

      {/* ── Entrance overlay — the title card; tap ▶ to start the screening ── */}
      <div
        onClick={() => setOpened(true)}
        role="button"
        aria-label="Buka jemputan"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          background: `linear-gradient(180deg, ${SCREEN_BLACK} 0%, #15120e 52%, ${SCREEN_BLACK} 100%)`,
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
        <FilmBand position="top" />
        <FilmBand position="bottom" />

        {/* faint projector spotlight behind the title card */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(70% 50% at 50% 42%, ${c.gold}1f 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

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
            color: SCREEN_INK_FAINT,
          }}
        >
          {(data.tagline || "OUR LOVE STORY").toUpperCase()}
          {dateParts ? ` · ${dateParts.year}` : ""}
        </span>

        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 28px" }}>
          <p
            style={{
              fontSize: 9,
              letterSpacing: "0.46em",
              textTransform: "uppercase",
              color: SCREEN_INK_SOFT,
              margin: "0 0 18px",
              paddingLeft: "0.46em",
            }}
          >
            {productionTag}
          </p>

          <p
            style={{
              fontFamily: display,
              fontWeight: 500,
              fontSize: "clamp(30px, 10cqw, 46px)",
              lineHeight: 1.2,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: SCREEN_INK,
              margin: "0 0 10px",
            }}
          >
            {data.tagline || "Our Love Story"}
          </p>

          <p
            style={{
              fontFamily: display,
              fontStyle: "italic",
              fontSize: 18,
              color: c.gold,
              margin: "0 0 34px",
            }}
          >
            {data.headline || "Amira & Daniel"}
            {dateParts ? ` · ${dateParts.year}` : ""}
          </p>

          {/* the ▶ play button */}
          <div className="cn-play-float" style={{ display: "inline-block" }}>
            <div
              className="cn-play-ring"
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                border: `1px solid ${c.gold}88`,
                background: `radial-gradient(circle, ${c.gold}1c 0%, transparent 75%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                ["--cn-ring" as never]: `${c.gold}40`,
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "block",
                  width: 0,
                  height: 0,
                  marginLeft: 6,
                  borderTop: "13px solid transparent",
                  borderBottom: "13px solid transparent",
                  borderLeft: `20px solid ${SCREEN_INK}`,
                }}
              />
            </div>
          </div>

          <p
            className="cn-hint"
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: c.gold,
              margin: "30px 0 0",
            }}
          >
            Tekan untuk mula tayangan · Tap to play
          </p>
        </div>
      </div>
    </section>
  )
}
