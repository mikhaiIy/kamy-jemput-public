"use client"

import { z } from "zod"
import { useEffect, useState } from "react"
import { defineSection } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { SectionShell } from "../_shared"

function useCountdown(targetIso?: string) {
  const [v, setV] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    if (!targetIso) return
    const target = new Date(targetIso).getTime()
    if (Number.isNaN(target)) return
    const tick = () => {
      const diff = Math.max(0, target - Date.now())
      setV({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetIso])
  return v
}

const Digital: SectionRenderer<"countdown"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const cd = useCountdown(data.targetDate)
  return (
    <SectionShell theme={theme} title={data.label || "Menghitung Hari"}>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {(
          [
            ["Hari", cd.d],
            ["Jam", cd.h],
            ["Minit", cd.m],
            ["Saat", cd.s],
          ] as [string, number][]
        ).map(([label, value]) => (
          <div
            key={label}
            style={{
              flex: 1,
              maxWidth: 90,
              textAlign: "center",
              background: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 12,
              padding: "14px 4px",
            }}
          >
            <div
              style={{
                fontFamily: fontFor(theme, "display"),
                fontSize: 32,
                fontWeight: 600,
                color: c.accent,
                lineHeight: 1,
              }}
            >
              {String(value).padStart(2, "0")}
            </div>
            <div
              style={{
                fontSize: 10,
                color: c.muted,
                marginTop: 4,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}

const FlipCards: SectionRenderer<"countdown"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const cd = useCountdown(data.targetDate)
  return (
    <SectionShell theme={theme} title={data.label || "Menghitung Hari"}>
      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
        {(
          [
            ["D", cd.d],
            ["H", cd.h],
            ["M", cd.m],
            ["S", cd.s],
          ] as [string, number][]
        ).map(([label, value]) => (
          <div
            key={label}
            style={{
              background: c.accent,
              color: "#fff",
              borderRadius: 8,
              padding: "10px 14px",
              fontFamily: fontFor(theme, "display"),
              fontSize: 28,
              fontWeight: 700,
              boxShadow: "0 2px 6px rgba(0,0,0,0.12) inset",
              position: "relative",
            }}
          >
            {String(value).padStart(2, "0")}
            <span
              style={{
                position: "absolute",
                bottom: 2,
                right: 4,
                fontSize: 9,
                opacity: 0.7,
                fontFamily: fontFor(theme, "body"),
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}

// ---------------------------------------------------------------------------
// LunarPhases — the "Celestial Story" countdown: a strip of moons waxing from
// new to full (the wedding night is the full moon), then the remaining time as
// four glowing orbs. Pure CSS moons — a gold disc with the theme background
// sliding off it — so any palette works.
// ---------------------------------------------------------------------------

const LUNAR_CSS = `
  @keyframes lp-full-glow {
    0%, 100% { box-shadow: 0 0 14px var(--lp-gold), 0 0 30px var(--lp-gold-soft); }
    50%      { box-shadow: 0 0 22px var(--lp-gold), 0 0 48px var(--lp-gold-soft); }
  }
  .lp-full { animation: lp-full-glow 3.6s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .lp-full { animation: none !important; }
  }
`

/** One moon at phase f (0 = new, 1 = full): a gold disc with a bg-coloured
 *  shadow disc that slides aside as the moon waxes. */
function MoonPhase({ f, size, gold, bg }: { f: number; size: number; gold: string; bg: string }) {
  const full = f >= 1
  return (
    <span
      className={full ? "lp-full" : undefined}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: gold,
        border: `1px solid ${gold}66`,
        flexShrink: 0,
        display: "inline-block",
        ["--lp-gold" as never]: `${gold}55`,
        ["--lp-gold-soft" as never]: `${gold}2e`,
      }}
      aria-hidden
    >
      {!full && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: bg,
            opacity: 0.92,
            transform: `translateX(${f * 100}%)`,
          }}
        />
      )}
    </span>
  )
}

const LunarPhases: SectionRenderer<"countdown"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const cd = useCountdown(data.targetDate)
  return (
    <SectionShell theme={theme} title={data.label || "Menanti Bulan Penuh"}>
      <style>{LUNAR_CSS}</style>

      {/* waxing strip — the night approaches */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {[0, 0.25, 0.5, 0.75].map((f) => (
          <MoonPhase key={f} f={f} size={16} gold={c.gold} bg={c.bg} />
        ))}
        <MoonPhase f={1} size={26} gold={c.gold} bg={c.bg} />
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {(
          [
            ["Hari", cd.d],
            ["Jam", cd.h],
            ["Minit", cd.m],
            ["Saat", cd.s],
          ] as [string, number][]
        ).map(([label, value]) => (
          <div
            key={label}
            style={{
              width: 66,
              height: 66,
              borderRadius: "50%",
              background: c.card,
              border: `1px solid ${c.gold}44`,
              boxShadow: `0 0 18px ${c.gold}22, inset 0 0 14px ${c.gold}11`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontFamily: fontFor(theme, "display"),
                fontSize: 22,
                fontWeight: 600,
                color: c.accent,
                lineHeight: 1,
              }}
            >
              {String(value).padStart(2, "0")}
            </div>
            <div
              style={{
                fontSize: 8,
                color: c.muted,
                marginTop: 4,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}

// ---------------------------------------------------------------------------
// FilmLeader — the "Cinema Story" countdown: the old-school film leader. A
// crosshair circle with a sweeping second hand counts the days to the
// premiere, and hours/minutes/seconds run below as three film frames with
// sprocket dots. Pure CSS, everything from the theme, so any palette works.
// ---------------------------------------------------------------------------

const LEADER_CSS = `
  @keyframes fl-sweep {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .fl-sweep { animation: fl-sweep 4s linear infinite; }
  @media (prefers-reduced-motion: reduce) {
    .fl-sweep { animation: none !important; opacity: 0; }
  }
`

const FilmLeader: SectionRenderer<"countdown"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const cd = useCountdown(data.targetDate)
  const display = fontFor(theme, "display")
  const body = fontFor(theme, "body")

  return (
    <SectionShell theme={theme} title={data.label || "Tayangan Perdana Dalam"}>
      <style>{LEADER_CSS}</style>

      {/* the leader dial — crosshair, rings, sweeping wedge, day count */}
      <div
        style={{
          position: "relative",
          width: 168,
          height: 168,
          margin: "0 auto 24px",
          borderRadius: "50%",
          border: `1px solid ${c.accent}40`,
          background: c.card,
          overflow: "hidden",
        }}
      >
        {/* crosshair hairlines */}
        <span aria-hidden style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: `${c.accent}26` }} />
        <span aria-hidden style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: `${c.accent}26` }} />
        {/* inner ring */}
        <span aria-hidden style={{ position: "absolute", inset: "9%", borderRadius: "50%", border: `1px solid ${c.accent}33` }} />
        {/* sweeping wedge */}
        <span
          aria-hidden
          className="fl-sweep"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `conic-gradient(${c.gold}3d 0deg 38deg, transparent 38deg)`,
          }}
        />
        {/* day count */}
        <div
          style={{
            position: "absolute",
            inset: "18%",
            borderRadius: "50%",
            background: c.card,
            border: `1px solid ${c.accent}26`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: display,
              fontSize: 44,
              fontWeight: 500,
              lineHeight: 1,
              color: c.accent,
              fontVariantNumeric: "lining-nums",
            }}
          >
            {cd.d}
          </span>
          <span
            style={{
              fontFamily: body,
              fontSize: 8,
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              color: c.muted,
              marginTop: 6,
              paddingLeft: "0.34em",
            }}
          >
            Hari
          </span>
        </div>
      </div>

      {/* hours / minutes / seconds as three film frames */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {(
          [
            ["Jam", cd.h],
            ["Minit", cd.m],
            ["Saat", cd.s],
          ] as [string, number][]
        ).map(([label, value]) => (
          <div
            key={label}
            style={{
              width: 76,
              padding: "10px 0 9px",
              textAlign: "center",
              background: c.card,
              border: `1px solid ${c.border}`,
              // sprocket dots along the top and bottom frame edges
              backgroundImage: `radial-gradient(circle at 50% 50%, ${c.accent}2e 0 1.5px, transparent 2.5px), radial-gradient(circle at 50% 50%, ${c.accent}2e 0 1.5px, transparent 2.5px)`,
              backgroundSize: "12px 4px, 12px 4px",
              backgroundPosition: "center 3px, center calc(100% - 3px)",
              backgroundRepeat: "repeat-x, repeat-x",
            }}
          >
            <div
              style={{
                fontFamily: display,
                fontSize: 26,
                fontWeight: 500,
                color: c.accent,
                lineHeight: 1,
                fontVariantNumeric: "lining-nums",
              }}
            >
              {String(value).padStart(2, "0")}
            </div>
            <div
              style={{
                fontSize: 8,
                color: c.muted,
                marginTop: 5,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                paddingLeft: "0.26em",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}

export const countdownModule = defineSection<"countdown">({
  type: "countdown",
  label: { en: "Countdown", ms: "Kira Detik" },
  schema: z.object({
    label: z.string().optional(),
    targetDate: z.string().optional(),
  }),
  variants: { digital: Digital, flip_cards: FlipCards, lunar_phases: LunarPhases, film_leader: FilmLeader },
  variantLabels: { digital: "Digital", flip_cards: "Kad Selak", lunar_phases: "Fasa Bulan", film_leader: "Film Leader" },
  variantMeta: {
    lunar_phases: {
      swatch: "linear-gradient(135deg, #101528 0%, #e8c97e 90%, #fff 140%)",
      hint: "Bulan mengembang ke purnama + orb masa bersinar",
      recommendedFor: ["wedding_general", "wedding_malay", "engagement_general", "anniversary"],
    },
    film_leader: {
      swatch: "linear-gradient(135deg, #fafaf9 0%, #0d0d0d 70%, #b8a070 130%)",
      hint: "Dail film leader bersilang + bingkai filem jam/minit/saat",
      recommendedFor: ["wedding_general", "wedding_chinese", "engagement_general", "anniversary"],
    },
  },
  defaultVariant: "digital",
  defaultData: { label: "Menghitung Hari", targetDate: "" },
  appliesTo: "all",
})
