"use client"

import { z } from "zod"
import { useState } from "react"
import type { CSSProperties, FormEvent, ReactNode } from "react"
import { defineSection } from "@/lib/sections/types"
import type { SectionRenderer } from "@/lib/sections/types"
import {
  resolveRsvpTheme,
  rsvpSwatch,
  RSVP_SIGNATURES,
  type RsvpAmbient,
  type RsvpSignatureId,
} from "@/lib/sections/rsvp/signatures"
import type { ThemeColors } from "@/lib/sections/theme"

declare global {
  interface Window {
    __KAMY_CARD_ID__?: string
  }
}

/* ------------------------------------------------------------------ */
/*  Shared keyframes (CSS-only animations — injected once per panel)  */
/* ------------------------------------------------------------------ */

const KEYFRAMES = `
  @keyframes rsvp-fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rsvp-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rsvp-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes rsvp-stamp-press {
    0%   { transform: scale(1)   rotate(0deg); }
    40%  { transform: scale(.94) rotate(-2deg); }
    100% { transform: scale(1)   rotate(0deg); }
  }
  @keyframes rsvp-bloom {
    0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
    60%  { transform: scale(1.15) rotate(8deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg);   opacity: 1; }
  }
  @keyframes rsvp-confetti-rise {
    0%   { transform: translate(var(--tx,0), 0)       rotate(0deg); opacity: 1; }
    100% { transform: translate(var(--tx,0), -160px)  rotate(var(--r,180deg)); opacity: 0; }
  }
  @keyframes rsvp-petal-drift {
    0%   { transform: translate(0,0) rotate(0); opacity: 0; }
    20%  { opacity: 1; }
    100% { transform: translate(var(--dx,40px), 80px) rotate(180deg); opacity: 0; }
  }
  @keyframes rsvp-ring-radiate {
    0%   { transform: scale(.5); opacity: .8; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  /* Ambient particle fields */
  @keyframes rsvp-amb-rise {
    0%   { transform: translate(0,0) rotate(0); opacity: 0; }
    12%  { opacity: var(--o,.5); }
    86%  { opacity: var(--o,.5); }
    100% { transform: translate(var(--dx,0), -170px) rotate(var(--r,180deg)); opacity: 0; }
  }
  @keyframes rsvp-amb-fall {
    0%   { transform: translate(0,0) rotate(0); opacity: 0; }
    12%  { opacity: var(--o,.7); }
    86%  { opacity: var(--o,.7); }
    100% { transform: translate(var(--dx,30px), 260px) rotate(var(--r,200deg)); opacity: 0; }
  }
  @keyframes rsvp-grid-travel {
    0%   { background-position: 0 0, 0 0; }
    100% { background-position: 0 28px, 28px 0; }
  }
  @keyframes rsvp-marigold-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    [data-rsvp-particle] { animation: none !important; opacity: .35 !important; }
  }
`

function Keyframes() {
  return <style>{KEYFRAMES}</style>
}

/* ------------------------------------------------------------------ */
/*  Ambient layer — CSS-only living background per culture            */
/* ------------------------------------------------------------------ */

type Particle = {
  left: number
  size: number
  dur: number
  delay: number
  dx: number
  o: number
  r: number
  ci: number
}

const AMBIENT_COUNTS: Record<RsvpAmbient, { n: number; min: number; max: number }> = {
  motes: { n: 18, min: 3, max: 6 },
  lanterns: { n: 13, min: 5, max: 11 },
  petals_rose: { n: 14, min: 9, max: 16 },
  petals_marigold: { n: 16, min: 8, max: 15 },
  confetti: { n: 18, min: 5, max: 10 },
  grid: { n: 0, min: 0, max: 0 },
  none: { n: 0, min: 0, max: 0 },
}

// Deterministic PRNG (mulberry32). The RSVP card is server-rendered, so the
// ambient field MUST be identical on the server and the client — using
// Math.random() here (even in a useState initializer) produces different
// values per call and triggers a hydration mismatch. A fixed seed per `kind`
// keeps the layout varied between variants but stable across SSR/CSR.
function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeParticles(kind: RsvpAmbient): Particle[] {
  const cfg = AMBIENT_COUNTS[kind]
  let seed = 0
  for (let i = 0; i < kind.length; i++) seed = (seed * 31 + kind.charCodeAt(i)) >>> 0
  const rand = mulberry32(seed || 1)
  return Array.from({ length: cfg.n }).map(() => ({
    left: rand() * 100,
    size: cfg.min + rand() * (cfg.max - cfg.min),
    dur: 6 + rand() * 8,
    // Negative delay so the field is already populated on first paint.
    delay: rand() * -14,
    dx: (rand() - 0.5) * 90,
    o: 0.32 + rand() * 0.42,
    r: (rand() - 0.5) * 360,
    ci: Math.floor(rand() * 997),
  }))
}

// Precomputed once per kind at module load — deterministic, so the server and
// client always render the exact same particle markup.
const AMBIENT_PARTICLES: Record<RsvpAmbient, Particle[]> = {
  motes: makeParticles("motes"),
  lanterns: makeParticles("lanterns"),
  petals_rose: makeParticles("petals_rose"),
  petals_marigold: makeParticles("petals_marigold"),
  confetti: makeParticles("confetti"),
  grid: makeParticles("grid"),
  none: makeParticles("none"),
}

function Ambient({ kind, colors }: { kind: RsvpAmbient; colors: string[] }) {
  if (kind === "grid") {
    const color = colors[0]
    return (
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: `linear-gradient(${color}12 1px, transparent 1px), linear-gradient(90deg, ${color}12 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          animation: "rsvp-grid-travel 7s linear infinite",
          maskImage: "radial-gradient(ellipse at 50% -10%, #000 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% -10%, #000 0%, transparent 75%)",
        }}
      />
    )
  }

  const seeds = AMBIENT_PARTICLES[kind]
  const falling =
    kind === "petals_rose" || kind === "petals_marigold" || kind === "confetti"
  const isPetal = kind === "petals_rose" || kind === "petals_marigold"
  const isEmber = kind === "lanterns"
  const isConfetti = kind === "confetti"

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {seeds.map((s, i) => {
        const color = colors[s.ci % colors.length]
        const style = {
          position: "absolute",
          left: `${s.left}%`,
          top: falling ? -22 : "auto",
          bottom: falling ? "auto" : -22,
          width: s.size,
          height: isConfetti ? s.size * 0.5 : isPetal ? s.size * 1.3 : s.size,
          background: isEmber
            ? `radial-gradient(circle at 35% 35%, ${color}, transparent 72%)`
            : color,
          borderRadius: isPetal ? "50% 0 50% 50%" : isConfetti ? 1 : "50%",
          boxShadow: isEmber ? `0 0 ${s.size}px ${color}aa` : "none",
          opacity: 0,
          animation: `${falling ? "rsvp-amb-fall" : "rsvp-amb-rise"} ${s.dur}s linear ${s.delay}s infinite`,
          "--dx": `${s.dx}px`,
          "--o": `${s.o}`,
          "--r": `${s.r}deg`,
        } as CSSProperties
        return <span key={i} data-rsvp-particle style={style} />
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  RsvpStage — the self-contained themed surface every variant sits on */
/* ------------------------------------------------------------------ */

function RsvpStage({
  on,
  ambient,
  colors,
  surface,
  bg,
  pad = "28px 22px",
  radius = 22,
  children,
}: {
  on: boolean
  ambient: RsvpAmbient
  colors: string[]
  surface: ThemeColors
  bg?: string
  pad?: string
  radius?: number
  children: ReactNode
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        margin: "12px 14px",
        borderRadius: radius,
        background: bg ?? surface.bg,
        border: `1px solid ${surface.border}`,
        boxShadow: `0 14px 38px ${surface.accent}14`,
        color: surface.text,
      }}
    >
      <Keyframes />
      {on && ambient !== "none" && <Ambient kind={ambient} colors={colors} />}
      <div style={{ position: "relative", zIndex: 1, padding: pad }}>
        {children}
      </div>
    </div>
  )
}

function StageDivider({ c, fonts }: { c: ThemeColors; fonts: { display: string } }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "12px auto 0",
        maxWidth: 200,
      }}
    >
      <div style={{ flex: 1, height: 1, background: `${c.gold}55` }} />
      <span style={{ color: c.gold, fontSize: 14, opacity: 0.85, fontFamily: fonts.display }}>
        {c.divider}
      </span>
      <div style={{ flex: 1, height: 1, background: `${c.gold}55` }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared submit hook                                                */
/* ------------------------------------------------------------------ */

type SubmitState = "idle" | "sending" | "ok" | "err"

function useRsvpSubmit() {
  const [state, setState] = useState<SubmitState>("idle")
  const submit = async (payload: {
    guestName: string
    guestContact?: string
    attending: boolean
    pax?: number
    message?: string
  }) => {
    const cardId = typeof window !== "undefined" ? window.__KAMY_CARD_ID__ : undefined
    if (!cardId) {
      setState("err")
      return
    }
    setState("sending")
    try {
      const res = await fetch(`/api/rsvp/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      setState("ok")
    } catch {
      setState("err")
    }
  }
  return { state, setState, submit }
}

/* ------------------------------------------------------------------ */
/*  Shared field primitives                                           */
/* ------------------------------------------------------------------ */

function FloatingField({
  label,
  name,
  type = "text",
  required,
  accent,
  border,
  text,
  card = "#fff",
  fontFamily,
  multiline,
  rows,
  inputMode,
  placeholder,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  accent: string
  border: string
  text: string
  card?: string
  fontFamily?: string
  multiline?: boolean
  rows?: number
  inputMode?: "text" | "tel" | "email" | "numeric"
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  const [hasValue, setHasValue] = useState(false)
  const float = focused || hasValue
  const id = `${name}-${label.length}`

  const sharedStyle: CSSProperties = {
    width: "100%",
    padding: multiline ? "20px 14px 12px" : "20px 14px 8px",
    border: `1.5px solid ${focused ? accent : border}`,
    borderRadius: 12,
    background: card,
    color: text,
    fontFamily: fontFamily || "var(--font-jakarta), sans-serif",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 160ms ease, box-shadow 160ms ease",
    boxShadow: focused ? `0 0 0 3px ${accent}1f` : "none",
    resize: multiline ? "vertical" : undefined,
    minHeight: multiline ? 92 : 56,
  }

  const labelStyle: CSSProperties = {
    position: "absolute",
    left: 14,
    top: float ? 6 : 18,
    fontSize: float ? 10 : 14,
    color: float ? accent : `${text}88`,
    fontWeight: float ? 700 : 400,
    letterSpacing: float ? "0.04em" : "0",
    textTransform: float ? "uppercase" : "none",
    pointerEvents: "none",
    transition: "all 160ms ease",
    fontFamily: "var(--font-jakarta), sans-serif",
    background: "transparent",
  }

  return (
    <div style={{ position: "relative" }}>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          required={required}
          rows={rows ?? 3}
          placeholder={focused ? placeholder : ""}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false)
            setHasValue(!!e.currentTarget.value)
          }}
          style={sharedStyle}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={name === "guestContact" ? "tel" : type}
          inputMode={inputMode}
          autoComplete={name === "guestName" ? "name" : name === "guestContact" ? "tel" : undefined}
          required={required}
          placeholder={focused ? placeholder : ""}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false)
            setHasValue(!!e.currentTarget.value)
          }}
          style={sharedStyle}
        />
      )}
      <label htmlFor={id} style={labelStyle}>
        {label}
        {required && <span style={{ color: accent, opacity: 0.7 }}> *</span>}
      </label>
    </div>
  )
}

function Stepper({
  name,
  defaultValue = 1,
  min = 1,
  max = 10,
  accent,
  border,
  text,
  card = "#fff",
  label,
}: {
  name: string
  defaultValue?: number
  min?: number
  max?: number
  accent: string
  border: string
  text: string
  card?: string
  label?: string
}) {
  const [value, setValue] = useState(defaultValue)
  const dec = () => setValue((v) => Math.max(min, v - 1))
  const inc = () => setValue((v) => Math.min(max, v + 1))
  const btn: CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 10,
    border: `1.5px solid ${border}`,
    background: card,
    color: accent,
    fontSize: 20,
    fontWeight: 600,
    cursor: "pointer",
    lineHeight: 1,
    transition: "transform 100ms ease",
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px",
        border: `1.5px solid ${border}`,
        borderRadius: 12,
        background: card,
        gap: 12,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: `${text}99`,
          fontFamily: "var(--font-jakarta), sans-serif",
        }}
      >
        {label || "Pax"}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button type="button" onClick={dec} style={btn} aria-label="Kurangkan bilangan tetamu">
          −
        </button>
        <span aria-live="polite" aria-label={`Bilangan tetamu: ${value}`}
          style={{
            minWidth: 28,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            color: accent,
            fontFamily: "var(--font-jakarta), sans-serif",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        <button type="button" onClick={inc} style={btn} aria-label="Tambah bilangan tetamu">
          +
        </button>
      </div>
      <input type="hidden" name={name} value={value} readOnly />
    </div>
  )
}

function Confetti({
  colors,
  count = 24,
  emoji,
}: {
  colors: string[]
  count?: number
  emoji?: string[]
}) {
  type Seed = { tx: number; r: number; delay: number; size: number }
  const [seeds] = useState<Seed[]>(() =>
    Array.from({ length: count }).map(() => ({
      tx: (Math.random() - 0.5) * 240,
      r: (Math.random() - 0.5) * 720,
      delay: Math.random() * 250,
      size: 8 + Math.random() * 10,
    }))
  )
  const pieces = seeds.map((s, i) => {
    const color = colors[i % colors.length]
    const em = emoji && emoji[i % emoji.length]
    return (
      <span
        key={i}
        style={
          {
            position: "absolute",
            left: "50%",
            bottom: 8,
            width: em ? "auto" : s.size,
            height: em ? "auto" : s.size * 0.4,
            background: em ? "transparent" : color,
            borderRadius: 2,
            fontSize: em ? s.size + 8 : undefined,
            color: em ? color : undefined,
            animation: `rsvp-confetti-rise 1100ms cubic-bezier(.2,.7,.4,1) ${s.delay}ms forwards`,
            "--tx": `${s.tx}px`,
            "--r": `${s.r}deg`,
          } as CSSProperties
        }
      >
        {em || ""}
      </span>
    )
  })
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {pieces}
    </div>
  )
}

function ErrorNote({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <div role="alert"
      style={{
        padding: "10px 14px",
        background: "#fff0ee",
        color: "#c0392b",
        borderRadius: 10,
        fontSize: 12,
        border: `1px solid #f5c6c2`,
        borderLeft: `3px solid ${accent ?? "#c0392b"}`,
      }}
    >
      {children}
    </div>
  )
}

/* ================================================================== */
/*  Variant 1 — WALIMAH (Malay / Islamic) — songket emerald & gold    */
/* ================================================================== */

const Walimah: SectionRenderer<"rsvp"> = ({ data, theme }) => {
  const { c, accent2, fonts, ambient, glyph } = resolveRsvpTheme("walimah", theme, {
    inherit: data.inheritTheme,
  })
  const ambientOn = data.ambient !== false
  const amb = [c.gold, c.accent, accent2]
  const [attending, setAttending] = useState<boolean | null>(null)
  const [attendanceError, setAttendanceError] = useState(false)
  const { state, submit } = useRsvpSubmit()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (attending === null) {
      setAttendanceError(true)
      return
    }
    const fd = new FormData(e.currentTarget)
    await submit({
      guestName: String(fd.get("guestName") || ""),
      guestContact: String(fd.get("guestContact") || ""),
      attending,
      pax: data.askPax && attending ? Number(fd.get("pax") || 1) : 1,
      message: String(fd.get("message") || ""),
    })
  }

  if (state === "ok") {
    return (
      <RsvpStage on={ambientOn} ambient={ambient} colors={amb} surface={c} pad="34px 22px">
        <div style={{ textAlign: "center", animation: "rsvp-fade-up 420ms ease both" }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 14px",
              borderRadius: "50%",
              border: `1.5px solid ${c.gold}66`,
              display: "grid",
              placeItems: "center",
              background: `radial-gradient(circle, ${c.gold}1f 0%, transparent 70%)`,
            }}
          >
            <span style={{ fontSize: 28, color: c.gold }}>{glyph}</span>
          </div>
          <p style={{ fontFamily: fonts.script, fontSize: 24, color: c.accent, margin: "0 0 6px", fontStyle: "italic" }}>
            Jazaakallaahu khairan
          </p>
          <p style={{ fontFamily: fonts.body, fontSize: 12, color: c.muted, margin: 0 }}>
            Ucapan anda telah disampaikan kepada kami
          </p>
        </div>
      </RsvpStage>
    )
  }

  const pickerBtn = (active: boolean, isYes: boolean): CSSProperties => ({
    flex: 1,
    height: 56,
    borderRadius: 14,
    border: `1.5px solid ${active ? c.accent : c.border}`,
    background: active
      ? isYes
        ? `linear-gradient(135deg, ${c.gold} 0%, ${c.accent} 115%)`
        : c.accent
      : c.card,
    color: active ? "#fff" : c.text,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: fonts.body,
    letterSpacing: "0.02em",
    transition: "all 180ms ease",
    transform: active ? "translateY(-1px)" : "none",
    boxShadow: active ? `0 8px 24px ${c.accent}33` : "none",
    opacity: attending !== null && !active ? 0.45 : 1,
  })

  return (
    <RsvpStage on={ambientOn} ambient={ambient} colors={amb} surface={c}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontStyle: "italic", color: c.accent, margin: 0 }}>
          Maklumbalas
        </h2>
        <StageDivider c={c} fonts={fonts} />
        <p style={{ margin: "10px 0 0", fontFamily: fonts.script, fontStyle: "italic", fontSize: 15, color: c.gold }}>
          Sahkan kehadiran anda
        </p>
      </div>
      {data.deadline && (
        <p style={deadlineLine(c, fonts.body)}>Sila balas sebelum {data.deadline}</p>
      )}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {state === "err" && <ErrorNote accent={c.accent}>Ralat semasa menghantar. Sila cuba lagi.</ErrorNote>}
        {attendanceError && <ErrorNote accent={c.accent}>Sila pilih sama ada anda akan hadir atau tidak.</ErrorNote>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => { setAttending(true); setAttendanceError(false) }} style={pickerBtn(attending === true, true)} aria-pressed={attending === true}>
            ✿ InsyaAllah, Hadir
          </button>
          <button type="button" onClick={() => { setAttending(false); setAttendanceError(false) }} style={pickerBtn(attending === false, false)} aria-pressed={attending === false}>
            ✕ Tidak Dapat Hadir
          </button>
        </div>
        {attending !== null && (
          <div style={revealCol}>
            <FloatingField label="Nama Penuh" name="guestName" required accent={c.accent} border={c.border} text={c.text} card={c.card} />
            <FloatingField label="Telefon / Email (pilihan)" name="guestContact" inputMode="tel" accent={c.accent} border={c.border} text={c.text} card={c.card} />
            {data.askPax && attending && (
              <Stepper name="pax" accent={c.accent} border={c.border} text={c.text} card={c.card} label="Bilangan tetamu" />
            )}
            <FloatingField
              label="Ucapan untuk pengantin (pilihan)"
              name="message"
              multiline
              rows={3}
              placeholder="cth. Tahniah! Semoga bahagia ke akhir hayat..."
              accent={c.accent}
              border={c.border}
              text={c.text}
              card={c.card}
            />
            <button type="submit" disabled={state === "sending"} style={shimmerBtn(c, fonts.body)}>
              {state === "sending" ? "Menghantar…" : "Sahkan & Hantar"}
            </button>
          </div>
        )}
      </form>
    </RsvpStage>
  )
}

/* ================================================================== */
/*  Variant 2 — ROMANCE ENVELOPE (general weddings, anniversary)      */
/* ================================================================== */

const RomanceEnvelope: SectionRenderer<"rsvp"> = ({ data, theme }) => {
  const { c, accent2, fonts, ambient } = resolveRsvpTheme("romance_envelope", theme, {
    inherit: data.inheritTheme,
  })
  const ambientOn = data.ambient !== false
  const amb = [c.accent, c.gold, accent2]
  const isMinimal = theme.palette === "minimal_ink" && data.inheritTheme
  const [opened, setOpened] = useState(false)
  const [attending, setAttending] = useState<boolean | null>(null)
  const { state, submit } = useRsvpSubmit()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (attending === null) return
    const fd = new FormData(e.currentTarget)
    await submit({
      guestName: String(fd.get("guestName") || ""),
      guestContact: String(fd.get("guestContact") || ""),
      attending,
      pax: data.askPax && attending ? Number(fd.get("pax") || 1) : 1,
      message: String(fd.get("message") || ""),
    })
  }

  if (state === "ok") {
    return (
      <RsvpStage on={ambientOn} ambient={ambient} colors={amb} surface={c} pad="38px 22px">
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: fonts.script,
              fontSize: 36,
              color: c.accent,
              margin: "0 0 6px",
              fontStyle: "italic",
              animation: "rsvp-fade-up 420ms ease both",
            }}
          >
            Thank you {!isMinimal && "♡"}
          </p>
          <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, margin: 0 }}>
            Your reply means the world to us
          </p>
        </div>
      </RsvpStage>
    )
  }

  if (!opened) {
    return (
      <RsvpStage on={ambientOn} ambient={ambient} colors={amb} surface={c} pad="34px 22px">
        <div style={{ display: "grid", placeItems: "center" }}>
          <button
            type="button"
            onClick={() => setOpened(true)}
            style={{
              position: "relative",
              width: "min(100%, 300px)",
              aspectRatio: "16 / 10",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              background: `linear-gradient(160deg, ${c.card} 0%, ${c.bg} 100%)`,
              boxShadow: `0 18px 40px ${c.accent}1f, 0 2px 6px ${c.accent}14`,
              padding: 0,
              overflow: "hidden",
            }}
            aria-label="Open RSVP"
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: `
                  linear-gradient(135deg, transparent 49.5%, ${c.border} 49.5%, ${c.border} 50.5%, transparent 50.5%),
                  linear-gradient(225deg, transparent 49.5%, ${c.border} 49.5%, ${c.border} 50.5%, transparent 50.5%)`,
                opacity: 0.7,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%,-50%)",
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: `radial-gradient(circle at 30% 30%, ${c.gold}, ${c.accent})`,
                boxShadow: `0 4px 12px ${c.accent}55, inset 0 0 0 2px ${c.gold}aa`,
                display: "grid",
                placeItems: "center",
                fontFamily: fonts.display,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "#fff",
                textTransform: "uppercase",
              }}
            >
              RSVP
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 14,
                left: 0,
                right: 0,
                textAlign: "center",
                fontFamily: fonts.script,
                fontSize: 16,
                fontStyle: "italic",
                color: c.muted,
                letterSpacing: "0.04em",
              }}
            >
              tap to open
            </div>
          </button>
        </div>
      </RsvpStage>
    )
  }

  const ribbonBtn = (active: boolean): CSSProperties => ({
    flex: 1,
    height: 54,
    borderRadius: 4,
    border: `1px solid ${active ? c.accent : c.border}`,
    background: active ? c.accent : c.card,
    color: active ? "#fff" : c.text,
    fontFamily: fonts.display,
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: 500,
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "all 180ms ease",
    transform: active ? "translateY(-1px)" : "none",
    boxShadow: active ? `0 6px 18px ${c.accent}33` : "none",
    opacity: attending !== null && !active ? 0.55 : 1,
  })

  return (
    <RsvpStage on={ambientOn} ambient={ambient} colors={amb} surface={c}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontStyle: "italic", color: c.accent, margin: 0 }}>
          Kindly Reply
        </h2>
        <StageDivider c={c} fonts={fonts} />
        <p style={{ margin: "10px 0 0", fontFamily: fonts.script, fontStyle: "italic", fontSize: 15, color: c.muted }}>
          favour us with your response
        </p>
      </div>
      {data.deadline && <p style={deadlineLine(c, fonts.body)}>by {data.deadline}</p>}
      <form onSubmit={onSubmit} style={{ ...revealCol, animationDuration: "320ms" }}>
        {state === "err" && <ErrorNote accent={c.accent}>Something went wrong. Please try again.</ErrorNote>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => setAttending(true)} style={ribbonBtn(attending === true)} aria-pressed={attending === true}>
            {isMinimal ? "Accept" : "♡ Joyfully Accept"}
          </button>
          <button type="button" onClick={() => setAttending(false)} style={ribbonBtn(attending === false)} aria-pressed={attending === false}>
            {isMinimal ? "Decline" : "Regretfully Decline"}
          </button>
        </div>
        {attending !== null && (
          <div style={revealCol}>
            <FloatingField label="Your Name" name="guestName" required accent={c.accent} border={c.border} text={c.text} card={c.card} />
            <FloatingField label="Phone or Email (optional)" name="guestContact" inputMode="tel" accent={c.accent} border={c.border} text={c.text} card={c.card} />
            {data.askPax && attending && (
              <Stepper name="pax" accent={c.accent} border={c.border} text={c.text} card={c.card} label="Bringing guests?" />
            )}
            <FloatingField
              label="A note for the couple (optional)"
              name="message"
              multiline
              rows={3}
              placeholder="Wishing you a lifetime of love..."
              accent={c.accent}
              border={c.border}
              text={c.text}
              card={c.card}
            />
            <button
              type="submit"
              disabled={state === "sending"}
              style={{
                height: 52,
                marginTop: 4,
                border: `1px solid ${c.accent}`,
                borderRadius: 4,
                cursor: state === "sending" ? "wait" : "pointer",
                color: "#fff",
                background: c.accent,
                fontFamily: fonts.display,
                fontStyle: "italic",
                fontSize: 15,
                letterSpacing: "0.06em",
                boxShadow: `0 8px 22px ${c.accent}33`,
              }}
            >
              {state === "sending" ? "Sending…" : isMinimal ? "Send Reply" : "Reply with Love"}
            </button>
          </div>
        )}
      </form>
    </RsvpStage>
  )
}

/* ================================================================== */
/*  Variant 3 — DOUBLE HAPPINESS (Chinese) — crimson lacquer & gold   */
/* ================================================================== */

const CJK = "'Noto Serif SC','Songti SC','Source Han Serif SC',serif"

/** Loads Noto Serif SC for the Chinese variant only (mirrors the @import
 *  pattern used in ChineseWeddingCard.tsx — kept out of globals.css because
 *  Tailwind's own @import would otherwise force it out of "imports first"). */
function CjkFont() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html:
          "@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');",
      }}
    />
  )
}

const DoubleHappiness: SectionRenderer<"rsvp"> = ({ data, theme }) => {
  const { c, accent2, fonts, ambient } = resolveRsvpTheme("double_happiness", theme, {
    inherit: data.inheritTheme,
  })
  const ambientOn = data.ambient !== false
  const amb = [c.gold, c.accent, accent2]
  const [attending, setAttending] = useState<boolean | null>(null)
  const { state, submit } = useRsvpSubmit()
  const [stamping, setStamping] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (attending === null) return
    setStamping(true)
    const fd = new FormData(e.currentTarget)
    await submit({
      guestName: String(fd.get("guestName") || ""),
      guestContact: String(fd.get("guestContact") || ""),
      attending,
      pax: data.askPax && attending ? Number(fd.get("pax") || 1) : 1,
      message: String(fd.get("message") || ""),
    })
  }

  const paperBg = `
    radial-gradient(circle at 20% 10%, ${c.gold}14 0%, transparent 50%),
    radial-gradient(circle at 80% 60%, ${c.accent}10 0%, transparent 50%),
    repeating-linear-gradient(45deg, ${c.accent}06 0 2px, transparent 2px 6px),
    ${c.bg}
  `

  if (state === "ok") {
    return (
      <RsvpStage on={ambientOn} ambient={ambient} colors={amb} surface={c} bg={paperBg} pad="42px 22px">
        <CjkFont />
        <div style={{ textAlign: "center", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <div
              aria-hidden
              style={{
                width: 200,
                height: 200,
                borderRadius: "50%",
                border: `2px solid ${c.gold}`,
                animation: "rsvp-ring-radiate 1.2s ease-out forwards",
              }}
            />
          </div>
          <div
            style={{
              position: "relative",
              fontSize: 56,
              color: c.gold,
              lineHeight: 1,
              marginBottom: 12,
              fontFamily: CJK,
              animation: "rsvp-bloom 600ms cubic-bezier(.34,1.56,.64,1) both",
            }}
          >
            囍
          </div>
          <p style={{ position: "relative", fontFamily: CJK, fontSize: 24, color: c.accent, margin: "0 0 4px" }}>謝謝</p>
          <p style={{ position: "relative", fontFamily: fonts.body, fontSize: 12, color: c.muted, margin: 0 }}>
            Thank you for your reply
          </p>
        </div>
      </RsvpStage>
    )
  }

  const lacquerBtn = (active: boolean): CSSProperties => ({
    flex: 1,
    minHeight: 64,
    borderRadius: 6,
    border: `1.5px solid ${active ? c.gold : c.border}`,
    background: active ? `linear-gradient(180deg, ${c.accent} 0%, ${accent2} 100%)` : c.card,
    color: active ? c.gold : c.accent,
    fontFamily: CJK,
    cursor: "pointer",
    transition: "all 200ms ease",
    transform: active ? "translateY(-1px)" : "none",
    boxShadow: active ? `0 10px 24px ${c.accent}55, inset 0 0 0 1px ${c.gold}55` : "none",
    opacity: attending !== null && !active ? 0.55 : 1,
    padding: "10px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  })

  return (
    <RsvpStage on={ambientOn} ambient={ambient} colors={amb} surface={c} bg={paperBg}>
      <CjkFont />
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: CJK, fontSize: 38, color: c.gold, lineHeight: 1, marginBottom: 6 }}>囍</div>
        <h2 style={{ fontFamily: CJK, fontSize: 18, color: c.accent, margin: 0, letterSpacing: "0.06em" }}>
          敬請賜覆 · Kindly Reply
        </h2>
        {data.deadline && <p style={{ ...deadlineLine(c, fonts.body), margin: "8px 0 0" }}>by {data.deadline}</p>}
      </div>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {state === "err" && <ErrorNote accent={c.accent}>Something went wrong. Please try again.</ErrorNote>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => setAttending(true)} style={lacquerBtn(attending === true)} aria-pressed={attending === true}>
            <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 600 }}>出席</span>
            <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.85, fontFamily: fonts.body }}>
              Attending
            </span>
          </button>
          <button type="button" onClick={() => setAttending(false)} style={lacquerBtn(attending === false)} aria-pressed={attending === false}>
            <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 600 }}>缺席</span>
            <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.85, fontFamily: fonts.body }}>
              Regrets
            </span>
          </button>
        </div>
        {attending !== null && (
          <div style={revealCol}>
            <FloatingField label="姓名 · Full Name" name="guestName" required accent={c.accent} border={c.border} text={c.text} card={c.card} />
            <FloatingField label="聯絡 · Phone / Email" name="guestContact" inputMode="tel" accent={c.accent} border={c.border} text={c.text} card={c.card} />
            {data.askPax && attending && (
              <Stepper name="pax" accent={c.accent} border={c.border} text={c.text} card={c.card} label="席位 · Seats" />
            )}
            <FloatingField
              label="留言 · Message"
              name="message"
              multiline
              rows={3}
              placeholder="百年好合, 永結同心..."
              accent={c.accent}
              border={c.border}
              text={c.text}
              card={c.card}
            />
            <button
              type="submit"
              disabled={state === "sending"}
              style={{
                position: "relative",
                height: 54,
                marginTop: 4,
                border: `1.5px solid ${c.gold}`,
                borderRadius: 6,
                cursor: state === "sending" ? "wait" : "pointer",
                color: c.gold,
                background: `linear-gradient(180deg, ${c.accent} 0%, ${accent2} 100%)`,
                fontFamily: CJK,
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "0.14em",
                boxShadow: `0 8px 22px ${c.accent}55, inset 0 0 0 1px ${c.gold}55`,
                animation: stamping ? "rsvp-stamp-press 320ms ease both" : "none",
              }}
            >
              {state === "sending" ? "送出中…" : "封印 · Send Reply"}
            </button>
          </div>
        )}
      </form>
    </RsvpStage>
  )
}

/* ================================================================== */
/*  Variant 4 — MARIGOLD (Indian) — marigold, saffron & crimson       */
/* ================================================================== */

const Marigold: SectionRenderer<"rsvp"> = ({ data, theme }) => {
  const { c, accent2, fonts, ambient } = resolveRsvpTheme("marigold", theme, {
    inherit: data.inheritTheme,
  })
  const ambientOn = data.ambient !== false
  const amb = [c.accent, c.gold, accent2]
  const [attending, setAttending] = useState<boolean | null>(null)
  const { state, submit } = useRsvpSubmit()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (attending === null) return
    const fd = new FormData(e.currentTarget)
    await submit({
      guestName: String(fd.get("guestName") || ""),
      guestContact: String(fd.get("guestContact") || ""),
      attending,
      pax: data.askPax && attending ? Number(fd.get("pax") || 1) : 1,
      message: String(fd.get("message") || ""),
    })
  }

  // A "toran" — a hanging marigold garland of layered blossoms.
  const garland = (
    <div aria-hidden style={{ display: "flex", justifyContent: "center", gap: 7, marginBottom: 14 }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          style={{
            position: "relative",
            width: 14,
            height: 14,
            marginTop: i % 2 === 0 ? 0 : 6,
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 40%, ${c.gold} 0%, ${c.accent} 60%, ${accent2} 100%)`,
              boxShadow: `0 2px 6px ${c.accent}40`,
            }}
          />
        </span>
      ))}
    </div>
  )

  const marigoldFlower = (size: number) => (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: `
          radial-gradient(circle at 50% 50%, ${c.gold} 0 22%, transparent 23%),
          conic-gradient(from 0deg, ${c.accent}, ${c.gold}, ${c.accent}, ${c.gold}, ${c.accent})`,
        boxShadow: `0 4px 14px ${c.accent}44, inset 0 0 0 2px ${c.gold}66`,
        animation: "rsvp-marigold-spin 14s linear infinite",
      }}
    />
  )

  if (state === "ok") {
    return (
      <RsvpStage on={ambientOn} ambient={ambient} colors={amb} surface={c} pad="40px 22px">
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 14, animation: "rsvp-bloom 600ms cubic-bezier(.34,1.56,.64,1) both" }}>
            {marigoldFlower(72)}
          </div>
          <p style={{ fontFamily: fonts.display, fontSize: 30, fontStyle: "italic", color: c.accent, margin: "0 0 4px" }}>
            Dhanyavaad
          </p>
          <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, margin: 0 }}>
            Your blessing is received with joy
          </p>
        </div>
      </RsvpStage>
    )
  }

  const blossomBtn = (active: boolean, isYes: boolean): CSSProperties => ({
    flex: 1,
    minHeight: 70,
    borderRadius: 16,
    border: `2px solid ${active ? (isYes ? c.accent : accent2) : c.border}`,
    background: active
      ? isYes
        ? `linear-gradient(135deg, ${c.gold} 0%, ${c.accent} 100%)`
        : `linear-gradient(135deg, ${accent2} 0%, ${c.accent} 100%)`
      : c.card,
    color: active ? "#fff" : c.text,
    cursor: "pointer",
    fontFamily: fonts.body,
    fontWeight: 700,
    transition: "all 200ms cubic-bezier(.34,1.56,.64,1)",
    transform: active ? "translateY(-2px)" : "none",
    boxShadow: active ? `0 12px 26px ${c.accent}40` : `0 2px 6px ${c.accent}14`,
    opacity: attending !== null && !active ? 0.5 : 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    padding: 8,
  })

  return (
    <RsvpStage on={ambientOn} ambient={ambient} colors={amb} surface={c}>
      {garland}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: 23, fontStyle: "italic", color: c.accent, margin: 0 }}>
          Aapki Upasthiti
        </h2>
        <StageDivider c={c} fonts={fonts} />
        <p style={{ margin: "10px 0 0", fontFamily: fonts.script, fontStyle: "italic", fontSize: 15, color: c.gold }}>
          kindly grace us with your reply
        </p>
      </div>
      {data.deadline && <p style={deadlineLine(c, fonts.body)}>by {data.deadline}</p>}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {state === "err" && <ErrorNote accent={c.accent}>Something went wrong. Please try again.</ErrorNote>}
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={() => setAttending(true)} style={blossomBtn(attending === true, true)} aria-pressed={attending === true}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>🪔</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Joyfully Accept</span>
          </button>
          <button type="button" onClick={() => setAttending(false)} style={blossomBtn(attending === false, false)} aria-pressed={attending === false}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>🙏</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>With Regret</span>
          </button>
        </div>
        {attending !== null && (
          <div style={revealCol}>
            <FloatingField label="Full Name" name="guestName" required accent={c.accent} border={c.border} text={c.text} card={c.card} />
            <FloatingField label="Phone / Email (optional)" name="guestContact" inputMode="tel" accent={c.accent} border={c.border} text={c.text} card={c.card} />
            {data.askPax && attending && (
              <Stepper name="pax" accent={c.accent} border={c.border} text={c.text} card={c.card} label="How many guests?" />
            )}
            <FloatingField
              label="A blessing for the couple (optional)"
              name="message"
              multiline
              rows={3}
              placeholder="Wishing you a life full of light & laughter..."
              accent={c.accent}
              border={c.border}
              text={c.text}
              card={c.card}
            />
            <button
              type="submit"
              disabled={state === "sending"}
              style={{
                height: 54,
                marginTop: 4,
                border: "none",
                borderRadius: 16,
                cursor: state === "sending" ? "wait" : "pointer",
                color: "#fff",
                background: `linear-gradient(135deg, ${c.accent} 0%, ${c.gold} 60%, ${accent2} 120%)`,
                fontFamily: fonts.body,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.04em",
                boxShadow: `0 12px 28px ${c.accent}44`,
              }}
            >
              {state === "sending" ? "Sending…" : "Send with Blessings"}
            </button>
          </div>
        )}
      </form>
    </RsvpStage>
  )
}

/* ================================================================== */
/*  Variant 5 — CONFETTI POP (birthday, gender-reveal, graduation)    */
/* ================================================================== */

const ConfettiPop: SectionRenderer<"rsvp"> = ({ data, theme }) => {
  const { c, accent2, fonts, ambient } = resolveRsvpTheme("confetti_pop", theme, {
    inherit: data.inheritTheme,
  })
  const ambientOn = data.ambient !== false
  const [attending, setAttending] = useState<boolean | null>(null)
  const [burst, setBurst] = useState(0)
  const { state, submit } = useRsvpSubmit()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (attending === null) return
    const fd = new FormData(e.currentTarget)
    await submit({
      guestName: String(fd.get("guestName") || ""),
      guestContact: String(fd.get("guestContact") || ""),
      attending,
      pax: data.askPax && attending ? Number(fd.get("pax") || 1) : 1,
      message: String(fd.get("message") || ""),
    })
  }

  const palette = [c.accent, c.gold, accent2, "#ff5d8f", "#ffd166", "#a78bfa"]
  const emojiSet = ["🎉", "🎊", "✨", "💫", "🎈"]

  if (state === "ok") {
    return (
      <RsvpStage on={ambientOn} ambient={ambient} colors={palette} surface={c} pad="38px 22px">
        <div style={{ textAlign: "center", position: "relative", overflow: "hidden" }}>
          <Confetti colors={palette} emoji={emojiSet} count={28} />
          <p
            style={{
              position: "relative",
              fontFamily: fonts.display,
              fontSize: 36,
              fontWeight: 700,
              color: c.accent,
              margin: "0 0 6px",
              letterSpacing: "-0.01em",
              animation: "rsvp-bloom 540ms cubic-bezier(.34,1.56,.64,1) both",
            }}
          >
            YAY! 🎉
          </p>
          <p style={{ position: "relative", fontFamily: fonts.body, fontSize: 13, color: c.muted, margin: 0 }}>
            Can&apos;t wait to celebrate with you
          </p>
        </div>
      </RsvpStage>
    )
  }

  const tile = (active: boolean, isYes: boolean): CSSProperties => ({
    flex: 1,
    minHeight: 80,
    borderRadius: 18,
    border: `2px solid ${active ? c.accent : c.border}`,
    background: active
      ? isYes
        ? `linear-gradient(135deg, ${c.accent} 0%, ${c.gold} 100%)`
        : c.card
      : c.card,
    color: active ? (isYes ? "#fff" : c.accent) : c.text,
    cursor: "pointer",
    fontFamily: fonts.body,
    transition: "all 220ms cubic-bezier(.34,1.56,.64,1)",
    transform: active ? "translateY(-3px) rotate(-1deg)" : "none",
    boxShadow: active ? `0 14px 28px ${c.accent}44` : `0 2px 6px ${c.accent}14`,
    opacity: attending !== null && !active ? 0.55 : 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 8,
    position: "relative",
    overflow: "visible",
  })

  return (
    <RsvpStage on={ambientOn} ambient={ambient} colors={palette} surface={c}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 700, color: c.accent, margin: 0 }}>
          Sertai Kami!
        </h2>
        <StageDivider c={c} fonts={fonts} />
      </div>
      {data.deadline && <p style={deadlineLine(c, fonts.body)}>by {data.deadline}</p>}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {state === "err" && <ErrorNote accent={c.accent}>Oops! Something went wrong. Try again?</ErrorNote>}
        <div style={{ display: "flex", gap: 12, position: "relative" }}>
          <button
            type="button"
            onClick={() => {
              setAttending(true)
              setBurst((n) => n + 1)
            }}
            style={tile(attending === true, true)}
            aria-pressed={attending === true}
          >
            <span style={{ fontSize: 26, lineHeight: 1 }}>🎉</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>I&apos;ll be there!</span>
            {attending === true && burst > 0 && (
              <Confetti key={burst} colors={palette} emoji={emojiSet} count={14} />
            )}
          </button>
          <button type="button" onClick={() => setAttending(false)} style={tile(attending === false, false)} aria-pressed={attending === false}>
            <span style={{ fontSize: 26, lineHeight: 1 }}>💌</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>Sending love</span>
          </button>
        </div>
        {attending !== null && (
          <div style={revealCol}>
            <FloatingField label="Your Name" name="guestName" required accent={c.accent} border={c.border} text={c.text} card={c.card} />
            <FloatingField label="Phone / Email (optional)" name="guestContact" inputMode="tel" accent={c.accent} border={c.border} text={c.text} card={c.card} />
            {data.askPax && attending && (
              <Stepper name="pax" accent={c.accent} border={c.border} text={c.text} card={c.card} label="How many of you?" />
            )}
            <FloatingField
              label="Leave a wish (optional)"
              name="message"
              multiline
              rows={3}
              placeholder="Sending lots of love & confetti!"
              accent={c.accent}
              border={c.border}
              text={c.text}
              card={c.card}
            />
            <button
              type="submit"
              disabled={state === "sending"}
              style={{
                height: 54,
                marginTop: 4,
                border: "none",
                borderRadius: 16,
                cursor: state === "sending" ? "wait" : "pointer",
                color: "#fff",
                background: `linear-gradient(135deg, ${c.accent} 0%, ${c.gold} 100%)`,
                fontFamily: fonts.body,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.02em",
                boxShadow: `0 12px 28px ${c.accent}44`,
              }}
            >
              {state === "sending" ? "Sending…" : "🚀 Send my reply"}
            </button>
          </div>
        )}
      </form>
    </RsvpStage>
  )
}

/* ================================================================== */
/*  Variant 6 — BOARDROOM BADGE (corporate, workshop)                 */
/* ================================================================== */

const BoardroomBadge: SectionRenderer<"rsvp"> = ({ data, theme }) => {
  const { c, accent2, fonts, ambient } = resolveRsvpTheme("boardroom_badge", theme, {
    inherit: data.inheritTheme,
  })
  const ambientOn = data.ambient !== false
  const fontMono = "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace"
  const [attending, setAttending] = useState<boolean | null>(null)
  const [name, setName] = useState("")
  const [ref] = useState(() => Math.random().toString(36).slice(2, 8).toUpperCase())
  const { state, submit } = useRsvpSubmit()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (attending === null) return
    const fd = new FormData(e.currentTarget)
    await submit({
      guestName: String(fd.get("guestName") || ""),
      guestContact: String(fd.get("guestContact") || ""),
      attending,
      pax: data.askPax && attending ? Number(fd.get("pax") || 1) : 1,
      message: String(fd.get("message") || ""),
    })
  }

  if (state === "ok") {
    return (
      <RsvpStage on={ambientOn} ambient={ambient} colors={[c.accent]} surface={c}>
        <div
          style={{
            border: `1.5px solid ${c.accent}`,
            borderRadius: 6,
            padding: "20px 18px",
            background: c.card,
            fontFamily: fontMono,
            color: c.text,
            position: "relative",
            animation: "rsvp-fade-up 400ms ease both",
            boxShadow: `0 14px 30px ${c.accent}1a`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px dashed ${c.border}`,
              paddingBottom: 10,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 9, letterSpacing: "0.2em", color: c.muted }}>ATTENDEE PASS</span>
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.16em",
                padding: "3px 8px",
                borderRadius: 4,
                background: attending ? accent2 : c.muted,
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {attending ? "CONFIRMED" : "REGRETS"}
            </span>
          </div>
          <p style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 600, color: c.accent, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            {name || "Guest"}
          </p>
          <p style={{ fontSize: 10, letterSpacing: "0.14em", color: c.muted, margin: "0 0 16px", textTransform: "uppercase" }}>
            RSVP RECORDED · {new Date().toISOString().slice(0, 10)}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 9,
              letterSpacing: "0.16em",
              color: c.muted,
              borderTop: `1px dashed ${c.border}`,
              paddingTop: 10,
            }}
          >
            <span>REF · {ref}</span>
            <span>THANK YOU</span>
          </div>
        </div>
      </RsvpStage>
    )
  }

  const chipBtn = (active: boolean): CSSProperties => ({
    flex: 1,
    height: 52,
    borderRadius: 6,
    border: `1.5px solid ${active ? c.accent : c.border}`,
    background: active ? c.accent : c.card,
    color: active ? "#fff" : c.text,
    fontFamily: fontMono,
    fontSize: 11,
    letterSpacing: "0.18em",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 140ms ease",
    boxShadow: active ? `inset 0 2px 0 ${c.text}30, 0 1px 0 ${c.text}10` : `0 1px 0 ${c.border}`,
    opacity: attending !== null && !active ? 0.55 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  })

  return (
    <RsvpStage on={ambientOn} ambient={ambient} colors={[c.accent]} surface={c}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <p style={{ fontFamily: fontMono, fontSize: 10, letterSpacing: "0.24em", color: c.muted, margin: "0 0 6px", textTransform: "uppercase" }}>
          RSVP · Required
        </p>
        <h2 style={{ fontFamily: fonts.display, fontSize: 22, color: c.accent, margin: 0, letterSpacing: "-0.01em" }}>
          Confirm Attendance
        </h2>
        {data.deadline && (
          <p style={{ fontFamily: fontMono, fontSize: 10, letterSpacing: "0.16em", color: c.muted, margin: "8px 0 0", textTransform: "uppercase" }}>
            Deadline · {data.deadline}
          </p>
        )}
      </div>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {state === "err" && <ErrorNote accent={accent2}>Submission failed. Please retry.</ErrorNote>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => setAttending(true)} style={chipBtn(attending === true)} aria-pressed={attending === true}>
            {attending === true ? "■" : "□"} ATTENDING
          </button>
          <button type="button" onClick={() => setAttending(false)} style={chipBtn(attending === false)} aria-pressed={attending === false}>
            {attending === false ? "■" : "□"} DECLINED
          </button>
        </div>
        {attending !== null && (
          <div style={revealCol}>
            <FloatingField label="Full Name" name="guestName" required accent={c.accent} border={c.border} text={c.text} card={c.card} />
            <FloatingField label="Email or Phone" name="guestContact" inputMode="email" accent={c.accent} border={c.border} text={c.text} card={c.card} />
            {data.askPax && attending && (
              <Stepper name="pax" accent={c.accent} border={c.border} text={c.text} card={c.card} label="Colleagues joining?" max={5} />
            )}
            <FloatingField
              label="Comments (optional)"
              name="message"
              multiline
              rows={3}
              placeholder="Any special requirements..."
              accent={c.accent}
              border={c.border}
              text={c.text}
              card={c.card}
            />
            <NameCapture onName={setName} />
            <button
              type="submit"
              disabled={state === "sending"}
              style={{
                height: 50,
                marginTop: 4,
                border: `1.5px solid ${c.accent}`,
                borderRadius: 6,
                cursor: state === "sending" ? "wait" : "pointer",
                color: "#fff",
                background: c.accent,
                fontFamily: fontMono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              {state === "sending" ? "Submitting…" : "Confirm RSVP"}
            </button>
          </div>
        )}
      </form>
    </RsvpStage>
  )
}

/** Listens on the form's guestName field so the success badge can show it. */
function NameCapture({ onName }: { onName: (s: string) => void }) {
  return (
    <input
      type="hidden"
      name="_name_capture"
      ref={(el) => {
        if (!el) return
        const form = el.closest("form")
        if (!form) return
        const handler = () => {
          const v = (form.elements.namedItem("guestName") as HTMLInputElement | null)?.value || ""
          onName(v)
        }
        form.addEventListener("input", handler)
        return () => form.removeEventListener("input", handler)
      }}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Shared inline styles                                              */
/* ------------------------------------------------------------------ */

const revealCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  animation: "rsvp-fade-up 320ms ease both",
}

function deadlineLine(c: ThemeColors, fontBody: string): CSSProperties {
  return {
    textAlign: "center",
    fontSize: 11,
    color: c.muted,
    margin: "0 0 14px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontFamily: fontBody,
  }
}

function shimmerBtn(c: ThemeColors, fontBody: string): CSSProperties {
  return {
    height: 52,
    marginTop: 4,
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    color: "#fff",
    fontFamily: fontBody,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.04em",
    background: `linear-gradient(110deg, ${c.accent} 0%, ${c.gold} 50%, ${c.accent} 100%)`,
    backgroundSize: "200% 100%",
    animation: "rsvp-shimmer 3.2s linear infinite",
    boxShadow: `0 10px 26px ${c.accent}40`,
  }
}

/* ------------------------------------------------------------------ */
/*  Backwards-compat aliases for older saved cards                    */
/* ------------------------------------------------------------------ */

const Classic = Walimah
const YesNoSwipe = ConfettiPop

/* ------------------------------------------------------------------ */
/*  Module definition                                                 */
/* ------------------------------------------------------------------ */

const VARIANT_HINTS: Record<RsvpSignatureId, string> = {
  walimah: "Songket emerald & gold",
  double_happiness: "Crimson lacquer & gold 囍",
  marigold: "Marigold, saffron & crimson",
  romance_envelope: "Blush, sage & ivory",
  confetti_pop: "Bright & playful",
  boardroom_badge: "Ink & steel, restrained",
}

const variantMeta = Object.fromEntries(
  (Object.keys(RSVP_SIGNATURES) as RsvpSignatureId[]).map((id) => [
    id,
    {
      swatch: rsvpSwatch(id),
      hint: VARIANT_HINTS[id],
      recommendedFor: RSVP_SIGNATURES[id].recommendedFor,
    },
  ])
)

export const rsvpModule = defineSection<"rsvp">({
  type: "rsvp",
  label: { en: "RSVP", ms: "Maklumbalas" },
  schema: z.object({
    deadline: z.string().optional(),
    askPax: z.boolean(),
    askDietary: z.boolean(),
    inheritTheme: z.boolean().optional(),
    ambient: z.boolean().optional(),
  }),
  variants: {
    walimah: Walimah,
    romance_envelope: RomanceEnvelope,
    double_happiness: DoubleHappiness,
    marigold: Marigold,
    confetti_pop: ConfettiPop,
    boardroom_badge: BoardroomBadge,
    // Legacy aliases (older cards may still reference these)
    classic: Classic,
    yes_no_swipe: YesNoSwipe,
  },
  variantLabels: {
    walimah: "Walimah · Malay",
    romance_envelope: "Romance Envelope",
    double_happiness: "Double Happiness · Chinese",
    marigold: "Marigold · Indian",
    confetti_pop: "Confetti Pop",
    boardroom_badge: "Boardroom Badge",
  },
  variantMeta,
  hiddenVariants: ["classic", "yes_no_swipe"],
  defaultVariant: "walimah",
  defaultData: {
    deadline: "",
    askPax: true,
    askDietary: false,
    inheritTheme: false,
    ambient: true,
  },
  appliesTo: "all",
})
