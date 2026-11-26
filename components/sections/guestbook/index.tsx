"use client"

import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer } from "@/lib/sections/types"
import { SectionShell } from "../_shared"
import { useWishes } from "../_wishes_context"

const EMOJIS = ["💌", "🌸", "✨", "💕", "🌺", "🎊", "💐", "🤍", "🫶", "🌹"]

function WishCard({
  guestName,
  message,
  index,
  accentColor,
  mutedColor,
  bgColor,
  fontBody,
}: {
  guestName: string
  message: string
  index: number
  accentColor: string
  mutedColor: string
  bgColor: string
  fontBody: string | undefined
}) {
  const emoji = EMOJIS[index % EMOJIS.length]
  return (
    <div
      style={{
        flexShrink: 0,
        width: 200,
        background: bgColor,
        border: `1px solid ${accentColor}33`,
        borderRadius: 14,
        padding: "14px 16px",
        marginRight: 12,
        boxShadow: `0 2px 12px ${accentColor}18`,
      }}
    >
      <p style={{ fontSize: 18, margin: "0 0 6px" }}>{emoji}</p>
      <p
        style={{
          fontFamily: fontBody,
          fontSize: 12,
          color: accentColor,
          lineHeight: 1.5,
          margin: "0 0 8px",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        &ldquo;{message}&rdquo;
      </p>
      <p
        style={{
          fontFamily: fontBody,
          fontSize: 10,
          color: mutedColor,
          fontWeight: 600,
          letterSpacing: "0.04em",
          margin: 0,
          textTransform: "uppercase",
        }}
      >
        — {guestName}
      </p>
    </div>
  )
}

function MarqueeRow({
  wishes,
  direction,
  accentColor,
  mutedColor,
  bgColor,
  fontBody,
  speed,
}: {
  wishes: { guestName: string; message: string }[]
  direction: "left" | "right"
  accentColor: string
  mutedColor: string
  bgColor: string
  fontBody: string | undefined
  speed: number
}) {
  // Duplicate so the loop is seamless
  const doubled = [...wishes, ...wishes]
  const animName = direction === "left" ? "marquee-left" : "marquee-right"

  return (
    <div style={{ overflow: "hidden", width: "100%" }}>
      <style>{`
        @keyframes marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          animation: `${animName} ${speed}s linear infinite`,
          willChange: "transform",
        }}
      >
        {doubled.map((w, i) => (
          <WishCard
            key={i}
            guestName={w.guestName}
            message={w.message}
            index={i}
            accentColor={accentColor}
            mutedColor={mutedColor}
            bgColor={bgColor}
            fontBody={fontBody}
          />
        ))}
      </div>
    </div>
  )
}

const WishesWall: SectionRenderer<"guestbook"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const fontBody = fontFor(theme, "body")
  const wishes = useWishes()
  const publicWishes = data.allowPublic ? wishes : []

  // Split into two rows for the dual-marquee effect
  const row1 = publicWishes.filter((_, i) => i % 2 === 0)
  const row2 = publicWishes.filter((_, i) => i % 2 === 1)

  const cardBg = `${c.accent}0d`

  return (
    <SectionShell theme={theme} title={data.title || "Ucapan Tetamu"} padded>
      {data.prompt && (
        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: c.muted,
            margin: "0 0 20px",
            fontFamily: fontBody,
          }}
        >
          {data.prompt}
        </p>
      )}

      {publicWishes.length === 0 ? (
        <p
          style={{
            textAlign: "center",
            fontFamily: fontFor(theme, "script") || fontFor(theme, "display"),
            fontSize: 15,
            color: c.accent,
            fontStyle: "italic",
            padding: "20px 0",
          }}
        >
          Ucapan akan dipaparkan di sini selepas RSVP
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "0 -20px" }}>
          {row1.length > 0 && (
            <MarqueeRow
              wishes={row1.length < 3 ? [...row1, ...row1, ...row1] : row1}
              direction="left"
              accentColor={c.accent}
              mutedColor={c.muted}
              bgColor={cardBg}
              fontBody={fontBody}
              speed={row1.length * 6}
            />
          )}
          {row2.length > 0 && (
            <MarqueeRow
              wishes={row2.length < 3 ? [...row2, ...row2, ...row2] : row2}
              direction="right"
              accentColor={c.accent}
              mutedColor={c.muted}
              bgColor={cardBg}
              fontBody={fontBody}
              speed={row2.length * 7}
            />
          )}
          {publicWishes.length === 1 && (
            <MarqueeRow
              wishes={[publicWishes[0], publicWishes[0], publicWishes[0]]}
              direction="right"
              accentColor={c.accent}
              mutedColor={c.muted}
              bgColor={cardBg}
              fontBody={fontBody}
              speed={10}
            />
          )}
        </div>
      )}

      <p
        style={{
          textAlign: "center",
          fontFamily: fontBody,
          fontSize: 11,
          color: c.muted,
          marginTop: 16,
        }}
      >
        {publicWishes.length > 0
          ? `${publicWishes.length} ucapan`
          : !data.allowPublic
          ? "(Ucapan dilihat hanya oleh tuan rumah)"
          : ""}
      </p>
    </SectionShell>
  )
}

export const guestbookModule = defineSection<"guestbook">({
  type: "guestbook",
  label: { en: "Guestbook", ms: "Ucapan Tetamu" },
  tier: "free",
  schema: z.object({
    allowPublic: z.boolean(),
    title: z.string().optional(),
    prompt: z.string().optional(),
  }),
  variants: { wishes_wall: WishesWall },
  variantLabels: { wishes_wall: "Dinding Ucapan" },
  defaultVariant: "wishes_wall",
  defaultData: {
    allowPublic: true,
    title: "Ucapan Tetamu",
    prompt: "Sila tinggalkan ucapan untuk kami",
  },
  appliesTo: "all",
})
