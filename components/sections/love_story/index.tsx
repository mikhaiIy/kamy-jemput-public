"use client"

import type { CSSProperties } from "react"
import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { cardImageReferenceSchema } from "@/lib/card-image-reference"
import type { SectionRenderer, SectionFormComponent } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { StoryMoment } from "@/lib/types"
import { Reveal } from "../_shared"
import { ImageUploadField } from "../_image_upload"

// ---------------------------------------------------------------------------
// Love Story — the narrative chapter.
//
// jestudio's most distinctive section: short, playful story beats ("They said
// 'just friends.' The universe laughed.") interleaved with photos, script
// headings and small uppercase labels. Each beat scroll-reveals as the guest
// reads down the page, so the invitation *tells the couple's story* instead of
// listing facts.
// ---------------------------------------------------------------------------

const ORDINALS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"]

const Chapters: SectionRenderer<"love_story"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const script = fontFor(theme, "script") || fontFor(theme, "display")
  const body = fontFor(theme, "body")

  return (
    <section style={{ padding: "36px 0 28px", fontFamily: body, overflow: "hidden" }}>
      {/* Section header — big script title + small tag, jestudio-style */}
      <Reveal style={{ padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <h2
            style={{
              fontFamily: script,
              fontSize: 44,
              fontWeight: 600,
              color: c.accent,
              lineHeight: 1,
              margin: 0,
            }}
          >
            {data.title || "Our Story"}
          </h2>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.3em",
              color: c.muted,
              paddingBottom: 6,
              textTransform: "uppercase",
            }}
          >
            — Love Story
          </span>
        </div>
        {data.intro && (
          <p
            style={{
              fontFamily: script,
              fontSize: 16,
              color: c.muted,
              margin: "8px 0 0 4px",
            }}
          >
            {data.intro}
          </p>
        )}
      </Reveal>

      <div style={{ display: "flex", flexDirection: "column", gap: 30, marginTop: 26 }}>
        {data.moments.map((m, i) => (
          <Moment key={i} moment={m} index={i} themeColors={c} script={script} body={body} />
        ))}
      </div>

      {data.signature && (
        <Reveal style={{ textAlign: "center", marginTop: 28 }}>
          <span style={{ fontSize: 12, color: c.accent, letterSpacing: "0.1em" }}>
            / {data.signature} /
          </span>
        </Reveal>
      )}
    </section>
  )
}

function Moment({
  moment,
  index,
  themeColors: c,
  script,
  body,
}: {
  moment: StoryMoment
  index: number
  themeColors: ReturnType<typeof colorsFor>
  script?: string
  body?: string
}) {
  // Alternate the photo tilt so a stack of moments feels hand-placed.
  const tilt = index % 2 === 0 ? -1.5 : 1.5
  const ordinal = ORDINALS[index] ?? String(index + 1)

  return (
    <Reveal delay={80}>
      <div style={{ padding: "0 24px" }}>
        {/* Chapter tag */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.32em",
              color: c.muted,
              textTransform: "uppercase",
            }}
          >
            Chapter {ordinal}
          </span>
          <span style={{ flex: 1, height: 1, background: `${c.gold}44` }} />
          <span style={{ color: c.gold, fontSize: 12 }}>✦</span>
        </div>

        {/* Script heading */}
        <h3
          style={{
            fontFamily: script,
            fontSize: 28,
            fontWeight: 600,
            color: c.accent,
            margin: "0 0 10px",
            lineHeight: 1.15,
          }}
        >
          {moment.label}
        </h3>

        {/* Photo (optional) — tilted print with accent frame offset */}
        {moment.photoUrl && (
          <div style={{ position: "relative", margin: "16px 6px 18px" }}>
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: -8,
                right: -8,
                width: "62%",
                height: "82%",
                border: `2px solid ${c.accent}`,
                borderRadius: 4,
                transform: `rotate(${tilt}deg)`,
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={moment.photoUrl}
              alt=""
              loading="lazy"
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4 / 3",
                objectFit: "cover",
                borderRadius: 4,
                transform: `rotate(${tilt * 0.5}deg)`,
                boxShadow: "0 8px 26px rgba(0,0,0,0.12)",
              }}
            />
          </div>
        )}

        {/* Story text */}
        <p
          style={{
            fontFamily: body,
            fontSize: 13,
            fontStyle: "italic",
            color: c.text,
            opacity: 0.78,
            lineHeight: 2.1,
            textAlign: moment.photoUrl ? "center" : "left",
            margin: 0,
            whiteSpace: "pre-line",
          }}
        >
          {moment.text}
        </p>
      </div>
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Constellation — the "Celestial Story" narrative: each moment is a star on a
// glowing vertical line, read top to bottom like a constellation being charted.
// Photos sit in circular "orbit" frames (dashed ring + satellite dot) so the
// section continues the night-sky language of the celestial_gate hero, but it
// reads everything from the theme so it also works on light palettes.
//
// SSR-safe: twinkle positions are constants (no Math.random in render).
// ---------------------------------------------------------------------------

const CST_TWINKLES: readonly {
  left: string
  top: string
  size: number
  duration: number
  delay: number
  opacity: number
}[] = [
  { left: "8%",  top: "6%",  size: 2, duration: 3.4, delay: 0.2, opacity: 0.4 },
  { left: "88%", top: "10%", size: 3, duration: 4.2, delay: 1.1, opacity: 0.5 },
  { left: "78%", top: "30%", size: 2, duration: 3.8, delay: 0.6, opacity: 0.35 },
  { left: "92%", top: "48%", size: 2, duration: 4.6, delay: 1.8, opacity: 0.4 },
  { left: "84%", top: "66%", size: 3, duration: 3.6, delay: 0.9, opacity: 0.45 },
  { left: "90%", top: "84%", size: 2, duration: 4.4, delay: 2.3, opacity: 0.35 },
  { left: "6%",  top: "40%", size: 2, duration: 4.0, delay: 1.4, opacity: 0.3 },
  { left: "10%", top: "92%", size: 3, duration: 3.5, delay: 0.4, opacity: 0.45 },
]

const CST_CSS = `
  @keyframes cst-twinkle {
    0%, 100% { opacity: var(--tw-base); transform: scale(1); }
    50%      { opacity: 1; transform: scale(1.4); }
  }
  @keyframes cst-node-pulse {
    0%, 100% { text-shadow: 0 0 8px currentColor; }
    50%      { text-shadow: 0 0 18px currentColor, 0 0 30px currentColor; }
  }
  @keyframes cst-orbit-spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .cst-twinkle { position: absolute; border-radius: 50%; pointer-events: none;
                 animation: cst-twinkle var(--tw-dur) ease-in-out var(--tw-delay) infinite; }
  .cst-node { animation: cst-node-pulse 3.2s ease-in-out infinite; }
  .cst-orbit { animation: cst-orbit-spin 26s linear infinite; }
  @media (prefers-reduced-motion: reduce) {
    .cst-twinkle, .cst-node, .cst-orbit { animation: none !important; }
  }
`

const STAR_ORDINALS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"]

const Constellation: SectionRenderer<"love_story"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const script = fontFor(theme, "script") || fontFor(theme, "display")
  const body = fontFor(theme, "body")

  return (
    <section style={{ position: "relative", padding: "40px 0 32px", fontFamily: body, overflow: "hidden" }}>
      <style>{CST_CSS}</style>

      {/* ambient twinkles continuing the hero's star field */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {CST_TWINKLES.map((t, i) => (
          <span
            key={i}
            className="cst-twinkle"
            style={{
              left: t.left,
              top: t.top,
              width: t.size,
              height: t.size,
              background: c.gold,
              boxShadow: `0 0 ${t.size * 3}px ${c.gold}`,
              opacity: t.opacity,
              ["--tw-base" as never]: String(t.opacity),
              ["--tw-dur" as never]: `${t.duration}s`,
              ["--tw-delay" as never]: `${t.delay}s`,
            }}
          />
        ))}
      </div>

      {/* header */}
      <Reveal style={{ position: "relative", textAlign: "center", padding: "0 24px" }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.34em",
            color: c.muted,
            textTransform: "uppercase",
            paddingLeft: "0.34em",
          }}
        >
          ✦ Our Constellation ✦
        </span>
        <h2
          style={{
            fontFamily: script,
            fontSize: 42,
            fontWeight: 600,
            color: c.accent,
            lineHeight: 1.1,
            margin: "10px 0 0",
          }}
        >
          {data.title || "Written in the Stars"}
        </h2>
        {data.intro && (
          <p style={{ fontFamily: script, fontSize: 17, color: c.muted, margin: "8px 0 0" }}>
            {data.intro}
          </p>
        )}
      </Reveal>

      {/* the charted line of moments */}
      <div style={{ position: "relative", margin: "30px 24px 0 0", paddingLeft: 52 }}>
        {/* the constellation line */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 26,
            top: 0,
            bottom: 0,
            width: 1,
            background: `linear-gradient(180deg, ${c.gold}00, ${c.gold}77 12%, ${c.gold}77 88%, ${c.gold}00)`,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
          {data.moments.map((m, i) => (
            <ConstellationMoment key={i} moment={m} index={i} themeColors={c} script={script} body={body} />
          ))}
        </div>
      </div>

      {data.signature && (
        <Reveal style={{ position: "relative", textAlign: "center", marginTop: 30 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
            <span aria-hidden style={{ width: 30, height: 1, background: `${c.gold}55` }} />
            <span style={{ color: c.gold, fontSize: 11 }} aria-hidden>✦</span>
            <span aria-hidden style={{ width: 30, height: 1, background: `${c.gold}55` }} />
          </div>
          <span style={{ fontFamily: script, fontSize: 22, color: c.accent }}>
            {data.signature}
          </span>
        </Reveal>
      )}
    </section>
  )
}

function ConstellationMoment({
  moment,
  index,
  themeColors: c,
  script,
  body,
}: {
  moment: StoryMoment
  index: number
  themeColors: ReturnType<typeof colorsFor>
  script?: string
  body?: string
}) {
  const ordinal = STAR_ORDINALS[index] ?? String(index + 1)

  return (
    <Reveal delay={80}>
      <div style={{ position: "relative" }}>
        {/* the star node on the line */}
        <span
          aria-hidden
          className="cst-node"
          style={{
            position: "absolute",
            left: -26,
            top: 0,
            transform: "translateX(-50%)",
            color: c.gold,
            fontSize: 15,
            lineHeight: 1,
          }}
        >
          ✦
        </span>

        <div style={{ paddingRight: 24 }}>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.32em",
              color: c.muted,
              textTransform: "uppercase",
            }}
          >
            Star {ordinal}
          </span>
          <h3
            style={{
              fontFamily: script,
              fontSize: 27,
              fontWeight: 600,
              color: c.accent,
              margin: "6px 0 10px",
              lineHeight: 1.15,
            }}
          >
            {moment.label}
          </h3>

          {/* photo in a circular orbit frame */}
          {moment.photoUrl && (
            <div
              style={{
                position: "relative",
                width: "min(56cqw, 230px)",
                aspectRatio: "1",
                margin: "16px 0 18px",
              }}
            >
              <span
                aria-hidden
                className="cst-orbit"
                style={{
                  position: "absolute",
                  inset: "-6%",
                  borderRadius: "50%",
                  border: `1px dashed ${c.gold}55`,
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={moment.photoUrl}
                alt=""
                loading="lazy"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: `1.5px solid ${c.gold}77`,
                  boxShadow: `0 0 40px ${c.gold}30, 0 8px 26px rgba(0,0,0,0.18)`,
                }}
              />
            </div>
          )}

          <p
            style={{
              fontFamily: body,
              fontSize: 13,
              fontStyle: "italic",
              color: c.text,
              opacity: 0.8,
              lineHeight: 2.05,
              margin: 0,
              whiteSpace: "pre-line",
            }}
          >
            {moment.text}
          </p>
        </div>
      </div>
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// FilmEpisodes — the "Cinema Story" narrative: each moment is an episode of
// the couple's series. Episode slates (EPISODE 01 + gold rule), photos as
// sprocketed film frames with a SCENE/TAKE caption strip, and the story copy
// as screenplay-style italic lines. Everything reads from the theme so it
// works on any palette; the frame itself is film-black by design.
// ---------------------------------------------------------------------------

const FE_FILM_BLACK = "#0b0a09"

const FE_CSS = `
  @keyframes fe-marker-pulse {
    0%, 100% { opacity: 0.55; }
    50%      { opacity: 1; }
  }
  .fe-marker { animation: fe-marker-pulse 2.8s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .fe-marker { animation: none !important; }
  }
`

/** Vertical sprocket-hole strip for the film-frame photo edges. */
function SprocketStrip({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: 14,
        background: FE_FILM_BLACK,
        backgroundImage:
          "radial-gradient(circle at 50% 50%, rgba(245,241,232,0.2) 0 2px, transparent 3px)",
        backgroundSize: "100% 16px",
        backgroundPosition: "center",
      }}
    />
  )
}

const FilmEpisodes: SectionRenderer<"love_story"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const display = fontFor(theme, "display")
  const body = fontFor(theme, "body")

  return (
    <section style={{ padding: "40px 0 32px", fontFamily: body, overflow: "hidden" }}>
      <style>{FE_CSS}</style>

      {/* header — film-programme style: centered rule, tag, big title */}
      <Reveal style={{ textAlign: "center", padding: "0 24px" }}>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.44em",
            color: c.muted,
            textTransform: "uppercase",
            paddingLeft: "0.44em",
          }}
        >
          The Series
        </span>
        <h2
          style={{
            fontFamily: display,
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: c.accent,
            lineHeight: 1.2,
            margin: "10px 0 0",
          }}
        >
          {data.title || "Our Love Story"}
        </h2>
        {data.intro && (
          <p
            style={{
              fontFamily: display,
              fontStyle: "italic",
              fontSize: 15,
              color: c.gold,
              margin: "8px 0 0",
            }}
          >
            {data.intro}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14 }}>
          <span aria-hidden style={{ width: 36, height: 1, background: `${c.gold}66` }} />
          <span className="fe-marker" style={{ color: c.gold, fontSize: 10 }} aria-hidden>
            {c.divider}
          </span>
          <span aria-hidden style={{ width: 36, height: 1, background: `${c.gold}66` }} />
        </div>
      </Reveal>

      <div style={{ display: "flex", flexDirection: "column", gap: 38, marginTop: 32 }}>
        {data.moments.map((m, i) => (
          <FilmEpisode key={i} moment={m} index={i} themeColors={c} display={display} body={body} />
        ))}
      </div>

      {data.signature && (
        <Reveal style={{ textAlign: "center", marginTop: 34 }}>
          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.4em",
              color: c.muted,
              textTransform: "uppercase",
              display: "block",
              paddingLeft: "0.4em",
            }}
          >
            To be continued
          </span>
          <span
            style={{
              fontFamily: display,
              fontStyle: "italic",
              fontSize: 19,
              color: c.accent,
              display: "block",
              marginTop: 8,
            }}
          >
            {data.signature}
          </span>
        </Reveal>
      )}
    </section>
  )
}

function FilmEpisode({
  moment,
  index,
  themeColors: c,
  display,
  body,
}: {
  moment: StoryMoment
  index: number
  themeColors: ReturnType<typeof colorsFor>
  display?: string
  body?: string
}) {
  const num = String(index + 1).padStart(2, "0")
  // Alternate the slate alignment so the scroll reads like cut scenes.
  const alignRight = index % 2 === 1

  return (
    <Reveal delay={80}>
      <div style={{ padding: "0 24px", textAlign: alignRight ? "right" : "left" }}>
        {/* episode slate */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            flexDirection: alignRight ? "row-reverse" : "row",
          }}
        >
          <span
            style={{
              fontFamily: display,
              fontSize: 34,
              lineHeight: 1,
              color: c.gold,
              fontVariantNumeric: "lining-nums",
            }}
          >
            {num}
          </span>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.38em",
                color: c.muted,
                textTransform: "uppercase",
              }}
            >
              Episode {num}
            </span>
            <span aria-hidden style={{ height: 1, background: `linear-gradient(${alignRight ? 270 : 90}deg, ${c.gold}88, ${c.gold}00)` }} />
          </div>
        </div>

        <h3
          style={{
            fontFamily: display,
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: "0.06em",
            color: c.accent,
            margin: "12px 0 0",
            lineHeight: 1.25,
          }}
        >
          {moment.label}
        </h3>

        {/* photo as a sprocketed film frame */}
        {moment.photoUrl && (
          <div
            style={{
              position: "relative",
              margin: "18px 0",
              background: FE_FILM_BLACK,
              padding: "10px 14px",
              boxShadow: "0 14px 36px rgba(0,0,0,0.22)",
            }}
          >
            <SprocketStrip side="left" />
            <SprocketStrip side="right" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={moment.photoUrl}
              alt=""
              loading="lazy"
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 10",
                objectFit: "cover",
                display: "block",
                filter: "saturate(0.9)",
              }}
            />
            <div
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 2px 0",
              }}
            >
              <span style={{ fontSize: 7, letterSpacing: "0.3em", color: "rgba(245,241,232,0.55)", textTransform: "uppercase" }}>
                Scene {num}
              </span>
              <span style={{ fontSize: 7, letterSpacing: "0.3em", color: "rgba(245,241,232,0.55)", textTransform: "uppercase" }}>
                Take 01
              </span>
            </div>
          </div>
        )}

        {/* story copy — screenplay italics */}
        <p
          style={{
            fontFamily: body,
            fontSize: 13,
            fontStyle: "italic",
            color: c.text,
            opacity: 0.8,
            lineHeight: 2.05,
            margin: moment.photoUrl ? 0 : "12px 0 0",
            whiteSpace: "pre-line",
          }}
        >
          {moment.text}
        </p>
      </div>
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Custom form — moments list (label, text, photo)
// ---------------------------------------------------------------------------

const LoveStoryForm: SectionFormComponent<"love_story"> = ({
  data,
  onChange,
  cardId,
  userId,
}) => {
  const moments = data.moments ?? []

  function commit(next: StoryMoment[]) {
    onChange({ ...data, moments: next })
  }

  function updateMoment(i: number, patch: Partial<StoryMoment>) {
    commit(moments.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={fieldStyle}>
        <label style={labelStyle}>Tajuk</label>
        <input
          value={data.title ?? ""}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          style={inputStyle}
        />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Pengenalan (pilihan)</label>
        <input
          value={data.intro ?? ""}
          onChange={(e) => onChange({ ...data, intro: e.target.value })}
          style={inputStyle}
        />
      </div>

      {moments.map((m, i) => (
        <div key={i} style={momentCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 13 }}>Bab #{i + 1}</strong>
            <button
              type="button"
              onClick={() => commit(moments.filter((_, idx) => idx !== i))}
              style={removeBtnStyle}
            >
              Buang
            </button>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Tajuk Bab</label>
            <input
              value={m.label}
              onChange={(e) => updateMoment(i, { label: e.target.value })}
              placeholder="How We Met"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Cerita</label>
            <textarea
              value={m.text}
              onChange={(e) => updateMoment(i, { text: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Foto (pilihan)</label>
            <ImageUploadField
              cardId={cardId ?? ""}
              userId={userId ?? ""}
              sectionType="love_story"
              value={m.photoUrl ?? ""}
              onChange={(url) => updateMoment(i, { photoUrl: url })}
              compact
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => commit([...moments, { label: "", text: "", photoUrl: "" }])}
        style={addBtnStyle}
      >
        + Tambah Bab
      </button>

      <div style={fieldStyle}>
        <label style={labelStyle}>Tandatangan (pilihan)</label>
        <input
          value={data.signature ?? ""}
          onChange={(e) => onChange({ ...data, signature: e.target.value })}
          placeholder="Alex & Mei"
          style={inputStyle}
        />
      </div>
    </div>
  )
}

const fieldStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 6 }
const labelStyle: CSSProperties = { fontSize: 12, fontWeight: 600, color: "#5a4a3a" }
const inputStyle: CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #e2d8cc",
  borderRadius: 8,
  fontSize: 14,
  background: "#fff",
}
const momentCardStyle: CSSProperties = {
  border: "1px solid #e2d8cc",
  borderRadius: 10,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  background: "#fdfbf7",
}
const removeBtnStyle: CSSProperties = {
  padding: "4px 10px",
  background: "transparent",
  border: "1px solid #e2d8cc",
  borderRadius: 6,
  color: "#9a8878",
  cursor: "pointer",
  fontSize: 12,
}
const addBtnStyle: CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  border: "1px dashed #c9984a",
  borderRadius: 8,
  color: "#92450a",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------

export const loveStoryModule = defineSection<"love_story">({
  type: "love_story",
  label: { en: "Love Story", ms: "Kisah Cinta" },
  schema: z.object({
    title: z.string().optional(),
    intro: z.string().optional(),
    moments: z.array(
      z.object({
        label: z.string().min(1, "Tajuk bab diperlukan"),
        text: z.string().min(1, "Cerita diperlukan"),
        photoUrl: cardImageReferenceSchema.optional(),
      })
    ),
    signature: z.string().optional(),
  }),
  variants: {
    chapters: Chapters,
    constellation: Constellation,
    film_episodes: FilmEpisodes,
  },
  variantLabels: {
    chapters: "Bab Bercerita",
    constellation: "Buruj Bintang",
    film_episodes: "Episod Filem",
  },
  variantMeta: {
    constellation: {
      swatch: "linear-gradient(135deg, #101528 0%, #e8c97e 90%, #fff 140%)",
      hint: "Setiap detik sebagai bintang di garis buruj yang bersinar",
      recommendedFor: ["wedding_general", "wedding_malay", "engagement_general", "anniversary"],
    },
    film_episodes: {
      swatch: "linear-gradient(135deg, #fafaf9 0%, #0d0d0d 70%, #b8a070 130%)",
      hint: "Kisah sebagai siri — slate EPISODE 01, foto bingkai filem, SCENE/TAKE",
      recommendedFor: ["wedding_general", "wedding_chinese", "engagement_general", "anniversary"],
    },
  },
  variantTiers: {
    constellation: "premium",
    film_episodes: "premium",
  },
  defaultVariant: "chapters",
  defaultData: {
    title: "Our Story",
    intro: "is my favourite thing to tell",
    moments: [
      {
        label: "How We Met",
        text: "He saw her. She saw him.\nTheir hearts said \"oh, it's you.\"",
        photoUrl: "",
      },
      {
        label: "The Proposal",
        text: "They said \"just friends.\"\nThe universe laughed.\nHere we are.",
        photoUrl: "",
      },
    ],
    signature: "",
  },
  appliesTo: [
    "wedding_malay",
    "wedding_chinese",
    "wedding_indian",
    "wedding_general",
    "engagement_malay",
    "engagement_general",
    "anniversary",
  ],
  customForm: LoveStoryForm,
})
