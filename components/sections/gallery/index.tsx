"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { z } from "zod"
import { defineSection } from "@/lib/sections/types"
import { cardImageReferenceSchema } from "@/lib/card-image-reference"
import type { SectionRenderer, SectionFormComponent } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { GalleryBlock, GalleryLayout, SectionDataMap, Theme } from "@/lib/types"
import { Reveal } from "../_shared"
import { ImageUploadField } from "../_image_upload"

// ---------------------------------------------------------------------------
// Gallery — photo collage Section.
//
// jestudio's demos interleave photos through the whole story in varied
// framings. Each block here picks a layout (1 photo / 2 photos / carousel
// for 3+) AND a "photo design" — the frame + decorative elements around the
// photo. Three designs per layout:
//
//   single   : tape_polaroid · arch_botanic · doodle_frame
//   duo      : overlap_prints · album_pages · corner_tabs
//   carousel : postcard · filmstrip · gallery_wall   (auto-advances, 1 at a time)
//
// The old `soft_grid` / `polaroid_collage` variants still render saved cards
// but are hidden from the editor (hiddenVariants). `trio` is a legacy layout
// id treated as a carousel by the new variant.
// ---------------------------------------------------------------------------

function photoAt(block: GalleryBlock, i: number): string {
  return block.photos[i] || ""
}

function Placeholder({ theme, ratio }: { theme: Theme; ratio: string }) {
  const c = colorsFor(theme)
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: ratio,
        background: `linear-gradient(135deg, ${c.accent}22, ${c.gold}33)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: c.gold,
        fontSize: 22,
      }}
    >
      {c.divider}
    </div>
  )
}

function Photo({
  url,
  theme,
  ratio,
  style,
}: {
  url: string
  theme: Theme
  ratio: string
  style?: CSSProperties
}) {
  if (!url) return <Placeholder theme={theme} ratio={ratio} />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      loading="lazy"
      style={{
        width: "100%",
        aspectRatio: ratio,
        objectFit: "cover",
        display: "block",
        ...style,
      }}
    />
  )
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches)
    const onMq = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener?.("change", onMq)
    return () => mq.removeEventListener?.("change", onMq)
  }, [])
  return reduced
}

// ---------------------------------------------------------------------------
// Section header (shared by variants)
// ---------------------------------------------------------------------------

function GalleryHeader({ title, intro, theme }: { title?: string; intro?: string; theme: Theme }) {
  const c = colorsFor(theme)
  if (!title && !intro) return null
  return (
    <Reveal style={{ textAlign: "center", marginBottom: 24 }}>
      {title && (
        <h2
          style={{
            fontFamily: fontFor(theme, "script") || fontFor(theme, "display"),
            fontSize: 34,
            fontWeight: 600,
            color: c.accent,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
      )}
      {intro && (
        <p style={{ fontSize: 11, color: c.muted, letterSpacing: "0.18em", textTransform: "uppercase", margin: "8px 0 0" }}>
          {intro}
        </p>
      )}
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Shared decorative bits
// ---------------------------------------------------------------------------

function tapeStyle(gold: string, rot: string, pos: CSSProperties): CSSProperties {
  return {
    position: "absolute",
    width: 32,
    height: 13,
    background: `${gold}48`,
    border: `0.5px solid ${gold}33`,
    borderRadius: 1,
    transform: `rotate(${rot})`,
    zIndex: 2,
    ...pos,
  }
}

function LeafBranch({ color, flip }: { color: string; flip?: boolean }) {
  return (
    <svg
      width="54"
      height="30"
      viewBox="0 0 54 30"
      fill="none"
      aria-hidden
      style={{ transform: flip ? "scaleX(-1)" : undefined, opacity: 0.8 }}
    >
      <path d="M2 28C14 24 38 16 52 2" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M14 24c0-4 2-7 6-8-1 4-3 7-6 8zM24 19c0-4 2-7 6-8-1 4-3 7-6 8zM34 13c0-4 2-7 6-8-1 4-3 7-6 8z"
        fill={color}
        opacity="0.55"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// SINGLE designs
// ---------------------------------------------------------------------------

function SingleTapePolaroid({ block, theme }: { block: GalleryBlock; theme: Theme }) {
  const c = colorsFor(theme)
  return (
    <div style={{ padding: "0 18px" }}>
      <div
        style={{
          background: c.card,
          border: `1px solid ${c.border}`,
          boxShadow: "4px 6px 18px rgba(0,0,0,0.10)",
          padding: "8px 8px 26px",
          transform: "rotate(-1.6deg)",
          position: "relative",
        }}
      >
        <span style={tapeStyle(c.gold, "-18deg", { top: -7, left: -9 })} />
        <span style={tapeStyle(c.gold, "18deg", { top: -7, right: -9 })} />
        <Photo url={photoAt(block, 0)} theme={theme} ratio="4 / 5" />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 4,
            textAlign: "center",
            fontFamily: fontFor(theme, "script"),
            fontSize: 14,
            color: c.accent,
          }}
        >
          {block.caption || `✦ ${c.divider}`}
        </div>
      </div>
    </div>
  )
}

function SingleArchBotanic({ block, theme }: { block: GalleryBlock; theme: Theme }) {
  const c = colorsFor(theme)
  return (
    <div style={{ padding: "0 26px", textAlign: "center" }}>
      <div style={{ fontSize: 11, color: c.gold, letterSpacing: "0.4em", marginBottom: 12 }}>
        ✦ {c.divider} ✦
      </div>
      <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
        {/* offset hairline echo of the arch */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "-8px -8px 8px 8px",
            border: `1px solid ${c.gold}55`,
            borderRadius: "999px 999px 6px 6px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            overflow: "hidden",
            borderRadius: "999px 999px 4px 4px",
            border: `1px solid ${c.border}`,
            boxShadow: `0 18px 44px ${c.accent}22`,
          }}
        >
          <Photo url={photoAt(block, 0)} theme={theme} ratio="3 / 4" />
        </div>
        <span aria-hidden style={{ position: "absolute", bottom: -6, left: -14 }}>
          <LeafBranch color={c.gold} />
        </span>
        <span aria-hidden style={{ position: "absolute", bottom: -6, right: -14 }}>
          <LeafBranch color={c.gold} flip />
        </span>
      </div>
      {block.caption && (
        <p
          style={{
            fontFamily: fontFor(theme, "display"),
            fontStyle: "italic",
            fontSize: 14,
            color: c.muted,
            margin: "16px 0 0",
          }}
        >
          {block.caption}
        </p>
      )}
    </div>
  )
}

function SingleDoodleFrame({ block, theme }: { block: GalleryBlock; theme: Theme }) {
  const c = colorsFor(theme)
  return (
    <div style={{ padding: "0 22px", textAlign: "center" }}>
      <div
        style={{
          position: "relative",
          border: `2.5px dashed ${c.accent}aa`,
          borderRadius: 18,
          padding: 10,
          transform: "rotate(0.8deg)",
          background: c.card,
        }}
      >
        <Photo url={photoAt(block, 0)} theme={theme} ratio="4 / 5" style={{ borderRadius: 10 }} />
        {/* corner doodles */}
        <span aria-hidden style={{ position: "absolute", top: -14, left: -8, fontSize: 20, color: c.accent, transform: "rotate(-16deg)" }}>
          ♥
        </span>
        <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", bottom: -10, right: -8, transform: "rotate(14deg)" }}>
          <path d="M12 3l2.4 6.2L21 10l-5 4.2 1.6 6.6L12 17l-5.6 3.8L8 14.2 3 10l6.6-.8L12 3z" stroke={c.gold} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </div>
      <p style={{ fontFamily: "var(--font-caveat), cursive", fontSize: 20, color: c.text, margin: "12px 0 0" }}>
        {block.caption || "us ♥"}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DUO designs
// ---------------------------------------------------------------------------

function DuoOverlapPrints({ block, theme }: { block: GalleryBlock; theme: Theme }) {
  const c = colorsFor(theme)
  const print = (i: number, rot: number, z: number, ml: string): CSSProperties & { rot: number } => ({
    rot,
    width: "58%",
    background: c.card,
    border: `1px solid ${c.border}`,
    boxShadow: "6px 8px 20px rgba(0,0,0,0.12)",
    padding: 6,
    transform: `rotate(${rot}deg)`,
    position: "relative",
    zIndex: z,
    marginLeft: ml,
  })
  return (
    <div style={{ padding: "0 18px" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={print(0, -4, 1, "0")}>
          <Photo url={photoAt(block, 0)} theme={theme} ratio="3 / 4" />
        </div>
        <div style={{ ...print(1, 3, 2, "-16%"), marginTop: 26 }}>
          <span style={tapeStyle(c.gold, "14deg", { top: -8, right: 12 })} />
          <Photo url={photoAt(block, 1)} theme={theme} ratio="3 / 4" />
        </div>
      </div>
      {block.caption && (
        <p style={{ textAlign: "center", fontFamily: fontFor(theme, "script"), fontSize: 16, color: c.accent, margin: "14px 0 0" }}>
          {block.caption}
        </p>
      )}
    </div>
  )
}

function DuoAlbumPages({ block, theme }: { block: GalleryBlock; theme: Theme }) {
  const c = colorsFor(theme)
  return (
    <div style={{ padding: "0 20px" }}>
      <div
        style={{
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: 12,
          padding: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
        }}
      >
        <Photo url={photoAt(block, 0)} theme={theme} ratio="3 / 4" style={{ borderRadius: "8px 2px 2px 8px" }} />
        <Photo url={photoAt(block, 1)} theme={theme} ratio="3 / 4" style={{ borderRadius: "2px 8px 8px 2px" }} />
        {/* album spine + heart medallion */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 10,
            bottom: 10,
            left: "50%",
            width: 1,
            background: `linear-gradient(${c.gold}00, ${c.gold}88, ${c.gold}00)`,
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: c.card,
            border: `1px solid ${c.gold}77`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: c.accent,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          ♥
        </span>
      </div>
      {block.caption && (
        <p style={{ textAlign: "center", fontFamily: fontFor(theme, "display"), fontStyle: "italic", fontSize: 13, color: c.muted, margin: "12px 0 0" }}>
          {block.caption}
        </p>
      )}
    </div>
  )
}

function DuoCornerTabs({ block, theme }: { block: GalleryBlock; theme: Theme }) {
  const c = colorsFor(theme)
  const corner = (pos: CSSProperties, rot: number): CSSProperties => ({
    position: "absolute",
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderWidth: "14px 14px 0 0",
    borderColor: `${c.gold}cc transparent transparent transparent`,
    transform: `rotate(${rot}deg)`,
    ...pos,
  })
  const framed = (url: string, rise: number) => (
    <div style={{ position: "relative", padding: 8, background: `${c.gold}14`, marginTop: rise }}>
      <span aria-hidden style={corner({ top: 2, left: 2 }, 0)} />
      <span aria-hidden style={corner({ top: 2, right: 2 }, 90)} />
      <span aria-hidden style={corner({ bottom: 2, right: 2 }, 180)} />
      <span aria-hidden style={corner({ bottom: 2, left: 2 }, 270)} />
      <Photo url={url} theme={theme} ratio="3 / 4" />
    </div>
  )
  return (
    <div style={{ padding: "0 20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {framed(photoAt(block, 0), 0)}
        {framed(photoAt(block, 1), 22)}
      </div>
      <p
        style={{
          textAlign: "center",
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: c.muted,
          margin: "14px 0 0",
        }}
      >
        {block.caption || `— ${c.divider} —`}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CAROUSEL (3+ photos, auto-advance one at a time)
// ---------------------------------------------------------------------------

function useCarousel(count: number, reduced: boolean, intervalMs = 4000) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (reduced || paused || count <= 1) return
    const t = window.setInterval(() => setIdx((i) => (i + 1) % count), intervalMs)
    return () => window.clearInterval(t)
  }, [count, reduced, paused, intervalMs])
  return { idx, setIdx, setPaused }
}

function Dots({
  count,
  idx,
  color,
  onPick,
}: {
  count: number
  idx: number
  color: string
  onPick: (i: number) => void
}) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Foto ${i + 1}`}
          onClick={() => onPick(i)}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            border: "none",
            padding: 0,
            cursor: "pointer",
            background: color,
            opacity: i === idx ? 1 : 0.3,
            transform: i === idx ? "scale(1.25)" : "scale(1)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        />
      ))}
    </div>
  )
}

/** Cross-fading photo stack used by the postcard + gallery_wall designs. */
function FadeStack({
  photos,
  idx,
  theme,
  ratio,
  kenBurns,
}: {
  photos: string[]
  idx: number
  theme: Theme
  ratio: string
  kenBurns?: boolean
}) {
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: ratio, overflow: "hidden" }}>
      {photos.map((url, i) => (
        <div
          key={i}
          aria-hidden={i !== idx}
          style={{
            position: "absolute",
            inset: 0,
            opacity: i === idx ? 1 : 0,
            transition: "opacity 0.9s ease",
            transform: kenBurns && i === idx ? "scale(1.06)" : "scale(1)",
            transitionProperty: kenBurns ? "opacity, transform" : "opacity",
            transitionDuration: kenBurns ? "0.9s, 4.5s" : "0.9s",
          }}
        >
          <Photo url={url} theme={theme} ratio={ratio} style={{ height: "100%" }} />
        </div>
      ))}
    </div>
  )
}

function CarouselPostcard({ block, theme }: { block: GalleryBlock; theme: Theme }) {
  const c = colorsFor(theme)
  const reduced = useReducedMotion()
  const photos = block.photos.length ? block.photos : [""]
  const { idx, setIdx, setPaused } = useCarousel(photos.length, reduced)
  return (
    <div style={{ padding: "0 18px" }}>
      <div
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        style={{
          background: c.card,
          border: `1px solid ${c.border}`,
          boxShadow: "5px 7px 22px rgba(0,0,0,0.12)",
          padding: "10px 10px 14px",
          transform: "rotate(-1deg)",
          position: "relative",
        }}
      >
        {/* stamp */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 2,
            width: 38,
            height: 46,
            background: c.accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            border: "3px solid #fff",
            outline: `1px dashed ${c.accent}`,
            outlineOffset: -6,
            transform: "rotate(4deg)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          ♥
        </span>
        {/* postmark */}
        <svg aria-hidden width="54" height="54" viewBox="0 0 54 54" fill="none" style={{ position: "absolute", top: 10, right: 44, zIndex: 2, opacity: 0.5 }}>
          <circle cx="27" cy="27" r="20" stroke={c.text} strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="27" cy="27" r="14" stroke={c.text} strokeWidth="0.8" />
        </svg>
        <FadeStack photos={photos} idx={idx} theme={theme} ratio="4 / 3" />
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4px",
          }}
        >
          <span style={{ fontFamily: "var(--font-caveat), cursive", fontSize: 18, color: c.text }}>
            {block.caption || "wish you were here"}
          </span>
          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: c.muted }}>
            {idx + 1}/{photos.length}
          </span>
        </div>
      </div>
      <Dots count={photos.length} idx={idx} color={c.accent} onPick={setIdx} />
    </div>
  )
}

function CarouselFilmstrip({ block, theme }: { block: GalleryBlock; theme: Theme }) {
  const c = colorsFor(theme)
  const reduced = useReducedMotion()
  const photos = block.photos.length ? block.photos : [""]
  const { idx, setIdx, setPaused } = useCarousel(photos.length, reduced, 3600)
  const holes = Array.from({ length: 9 })
  const holeRow = (
    <div aria-hidden style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px" }}>
      {holes.map((_, i) => (
        <span key={i} style={{ width: 9, height: 6, borderRadius: 2, background: c.bg, opacity: 0.92 }} />
      ))}
    </div>
  )
  return (
    <div style={{ padding: "0 16px" }}>
      <div
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        style={{ background: "#181512", borderRadius: 6, overflow: "hidden", boxShadow: "0 14px 36px rgba(0,0,0,0.3)" }}
      >
        {holeRow}
        <div style={{ overflow: "hidden", margin: "0 8px" }}>
          <div
            style={{
              display: "flex",
              transform: `translateX(-${idx * 100}%)`,
              transition: reduced ? "none" : "transform 0.7s cubic-bezier(0.22, 0.61, 0.36, 1)",
            }}
          >
            {photos.map((url, i) => (
              <div key={i} style={{ flex: "0 0 100%", padding: "0 2px" }}>
                <Photo url={url} theme={theme} ratio="4 / 3" />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px 0" }}>
          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, letterSpacing: "0.18em", color: "#8a7f72" }}>
            {block.caption ? block.caption.toUpperCase() : "OUR FILM"}
          </span>
          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: "#8a7f72" }}>
            {String(idx + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
          </span>
        </div>
        {holeRow}
      </div>
      <Dots count={photos.length} idx={idx} color={c.gold} onPick={setIdx} />
    </div>
  )
}

function CarouselGalleryWall({ block, theme }: { block: GalleryBlock; theme: Theme }) {
  const c = colorsFor(theme)
  const reduced = useReducedMotion()
  const photos = block.photos.length ? block.photos : [""]
  const { idx, setIdx, setPaused } = useCarousel(photos.length, reduced, 4600)
  return (
    <div
      style={{
        padding: "26px 22px 22px",
        background: `radial-gradient(80% 60% at 50% 0%, ${c.gold}1f 0%, transparent 70%), ${c.text}0a`,
      }}
    >
      <div
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        style={{
          border: `3px solid ${c.gold}`,
          outline: `1px solid ${c.gold}88`,
          outlineOffset: 3,
          background: c.card,
          padding: 12,
          boxShadow: "0 22px 50px rgba(0,0,0,0.22)",
        }}
      >
        <FadeStack photos={photos} idx={idx} theme={theme} ratio="4 / 5" kenBurns={!reduced} />
      </div>
      {/* plaque */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
        <span
          style={{
            background: `linear-gradient(135deg, ${c.gold}dd, ${c.gold}99)`,
            color: c.card,
            fontFamily: fontFor(theme, "display"),
            fontStyle: "italic",
            fontSize: 12,
            letterSpacing: "0.08em",
            padding: "5px 16px",
            borderRadius: 3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          }}
        >
          {block.caption || `${c.divider} our gallery ${c.divider}`} · {idx + 1}/{photos.length}
        </span>
      </div>
      <Dots count={photos.length} idx={idx} color={c.gold} onPick={setIdx} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Design registry + Designer variant
// ---------------------------------------------------------------------------

type BlockRenderer = (props: { block: GalleryBlock; theme: Theme }) => React.JSX.Element

const SINGLE_DESIGNS: Record<string, BlockRenderer> = {
  tape_polaroid: SingleTapePolaroid,
  arch_botanic: SingleArchBotanic,
  doodle_frame: SingleDoodleFrame,
}
const DUO_DESIGNS: Record<string, BlockRenderer> = {
  overlap_prints: DuoOverlapPrints,
  album_pages: DuoAlbumPages,
  corner_tabs: DuoCornerTabs,
}
const CAROUSEL_DESIGNS: Record<string, BlockRenderer> = {
  postcard: CarouselPostcard,
  filmstrip: CarouselFilmstrip,
  gallery_wall: CarouselGalleryWall,
}

/** Normalise saved data: cards saved before the per-block refactor carry a
 *  flat `photos: string[]` instead of `blocks`. Wrap those into one block so
 *  every renderer can assume `blocks` exists. */
function blocksOf(data: SectionDataMap["gallery"]): GalleryBlock[] {
  if (Array.isArray(data.blocks)) return data.blocks
  const photos = (data as { photos?: unknown }).photos
  if (Array.isArray(photos) && photos.length > 0) {
    const layout = photos.length === 1 ? "single" : photos.length === 2 ? "duo" : "carousel"
    return [{ layout, photos: photos.filter((p): p is string => typeof p === "string") }]
  }
  return []
}

/** Normalise legacy ids: `trio` blocks render as carousels. */
function effectiveLayout(layout: GalleryLayout): "single" | "duo" | "carousel" {
  if (layout === "single" || layout === "duo") return layout
  return "carousel"
}

const DESIGNS_BY_LAYOUT: Record<"single" | "duo" | "carousel", Record<string, BlockRenderer>> = {
  single: SINGLE_DESIGNS,
  duo: DUO_DESIGNS,
  carousel: CAROUSEL_DESIGNS,
}

const DEFAULT_DESIGN: Record<"single" | "duo" | "carousel", string> = {
  single: "tape_polaroid",
  duo: "overlap_prints",
  carousel: "postcard",
}

function DesignerBlock({ block, theme }: { block: GalleryBlock; theme: Theme }) {
  const layout = effectiveLayout(block.layout)
  const designs = DESIGNS_BY_LAYOUT[layout]
  const Design = designs[block.design ?? ""] ?? designs[DEFAULT_DESIGN[layout]]
  return <Design block={block} theme={theme} />
}

const Designer: SectionRenderer<"gallery"> = ({ data, theme }) => {
  const blocks = blocksOf(data)
  return (
    <section style={{ padding: "32px 0", fontFamily: fontFor(theme, "body"), overflow: "hidden" }}>
      <div style={{ padding: "0 20px" }}>
        <GalleryHeader title={data.title} intro={data.intro} theme={theme} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        {blocks.map((block, i) => (
          <Reveal key={i} delay={(i % 3) * 100}>
            <DesignerBlock block={block} theme={theme} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Legacy variants (hidden from the editor; old saved cards still render)
// ---------------------------------------------------------------------------

const TILTS = [-2, 1.6, -1.2, 2.2, -1.8, 1.2]

const SoftGrid: SectionRenderer<"gallery"> = ({ data, theme }) => {
  const blocks = blocksOf(data)
  const c = colorsFor(theme)
  return (
    <section style={{ padding: "32px 20px", fontFamily: fontFor(theme, "body") }}>
      <GalleryHeader title={data.title} intro={data.intro} theme={theme} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {blocks.map((block, i) => (
          <Reveal key={i} delay={(i % 3) * 90}>
            <LegacyCollageRow block={block} theme={theme} />
            {block.caption && (
              <p
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  fontStyle: "italic",
                  color: c.muted,
                  letterSpacing: "0.08em",
                  margin: "10px 0 0",
                }}
              >
                {block.caption}
              </p>
            )}
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function LegacyCollageRow({ block, theme }: { block: GalleryBlock; theme: Theme }) {
  if (block.layout === "single") {
    return <Photo url={photoAt(block, 0)} theme={theme} ratio="4 / 5" style={{ borderRadius: 10 }} />
  }
  if (block.layout === "duo") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Photo url={photoAt(block, 0)} theme={theme} ratio="3 / 4" style={{ borderRadius: 10 }} />
        <Photo url={photoAt(block, 1)} theme={theme} ratio="3 / 4" style={{ borderRadius: 10 }} />
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Photo url={photoAt(block, 0)} theme={theme} ratio="16 / 10" style={{ borderRadius: 10 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Photo url={photoAt(block, 1)} theme={theme} ratio="1 / 1" style={{ borderRadius: 10 }} />
        <Photo url={photoAt(block, 2)} theme={theme} ratio="1 / 1" style={{ borderRadius: 10 }} />
      </div>
    </div>
  )
}

const PolaroidCollage: SectionRenderer<"gallery"> = ({ data, theme }) => {
  const blocks = blocksOf(data)
  return (
    <section style={{ padding: "32px 16px", fontFamily: fontFor(theme, "body") }}>
      <GalleryHeader title={data.title} intro={data.intro} theme={theme} />
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {blocks.map((block, i) => (
          <Reveal key={i} delay={(i % 3) * 110}>
            <LegacyPolaroidRow block={block} theme={theme} tilt={TILTS[i % TILTS.length]} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function LegacyPolaroidFrame({
  url,
  theme,
  ratio,
  tilt,
  caption,
}: {
  url: string
  theme: Theme
  ratio: string
  tilt: number
  caption?: string
}) {
  const c = colorsFor(theme)
  return (
    <div
      style={{
        background: c.card,
        border: `1px solid ${c.border}`,
        boxShadow: "4px 6px 18px rgba(0,0,0,0.10)",
        padding: "6px 6px 22px",
        transform: `rotate(${tilt}deg)`,
        position: "relative",
      }}
    >
      <span style={tapeStyle(c.gold, "-18deg", { top: -7, left: -9 })} />
      <span style={tapeStyle(c.gold, "18deg", { top: -7, right: -9 })} />
      <Photo url={url} theme={theme} ratio={ratio} />
      {caption ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 4,
            textAlign: "center",
            fontFamily: fontFor(theme, "script"),
            fontSize: 13,
            color: c.accent,
          }}
        >
          {caption}
        </div>
      ) : (
        <span style={{ position: "absolute", right: 12, bottom: 4, color: c.accent, fontSize: 11 }}>
          ✦ {c.divider}
        </span>
      )}
    </div>
  )
}

function LegacyPolaroidRow({ block, theme, tilt }: { block: GalleryBlock; theme: Theme; tilt: number }) {
  if (block.layout === "single") {
    return (
      <div style={{ padding: "0 14px" }}>
        <LegacyPolaroidFrame url={photoAt(block, 0)} theme={theme} ratio="4 / 5" tilt={tilt} caption={block.caption} />
      </div>
    )
  }
  if (block.layout === "duo") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 6px" }}>
        <LegacyPolaroidFrame url={photoAt(block, 0)} theme={theme} ratio="3 / 4" tilt={tilt} />
        <LegacyPolaroidFrame url={photoAt(block, 1)} theme={theme} ratio="3 / 4" tilt={-tilt} caption={block.caption} />
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "0 10px" }}>
        <LegacyPolaroidFrame url={photoAt(block, 0)} theme={theme} ratio="16 / 10" tilt={tilt} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 4px" }}>
        <LegacyPolaroidFrame url={photoAt(block, 1)} theme={theme} ratio="1 / 1" tilt={-tilt} />
        <LegacyPolaroidFrame url={photoAt(block, 2)} theme={theme} ratio="1 / 1" tilt={tilt * 0.7} caption={block.caption} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom form — per-block layout + design picker + photo slots
// ---------------------------------------------------------------------------

const LAYOUT_LABELS: Record<"single" | "duo" | "carousel", string> = {
  single: "1 Foto",
  duo: "2 Foto",
  carousel: "Karusel (3+)",
}

const DESIGN_LABELS: Record<string, { label: string; hint: string }> = {
  tape_polaroid: { label: "Polaroid Pita", hint: "Cetakan putih bercondong dengan pita washi" },
  arch_botanic: { label: "Gerbang Botani", hint: "Bingkai gerbang dengan ranting daun emas" },
  doodle_frame: { label: "Doodle Krayon", hint: "Bingkai lakaran tangan, hati & bintang" },
  overlap_prints: { label: "Bertindih", hint: "Dua cetakan bertindih, condong" },
  album_pages: { label: "Album", hint: "Dua halaman album dengan tulang tengah & ♥" },
  corner_tabs: { label: "Penjuru Klasik", hint: "Penjuru foto album lama, susun berperingkat" },
  postcard: { label: "Poskad", hint: "Poskad dengan setem & cop — foto bertukar sendiri" },
  filmstrip: { label: "Jalur Filem", hint: "Filem dengan lubang sproket — foto meluncur" },
  gallery_wall: { label: "Dinding Galeri", hint: "Bingkai emas + lampu sorot — foto pudar masuk" },
}

const CAROUSEL_MAX = 8

function slotsFor(layout: "single" | "duo" | "carousel", block: GalleryBlock): number {
  if (layout === "single") return 1
  if (layout === "duo") return 2
  return Math.min(Math.max(block.photos.length, 3), CAROUSEL_MAX)
}

const GalleryForm: SectionFormComponent<"gallery"> = ({
  data,
  onChange,
  cardId,
  userId,
}) => {
  const blocks = data.blocks ?? []

  function commit(next: GalleryBlock[]) {
    onChange({ ...data, blocks: next })
  }

  function updateBlock(i: number, patch: Partial<GalleryBlock>) {
    commit(blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  }

  function setLayout(i: number, layout: "single" | "duo" | "carousel") {
    const block = blocks[i]
    const want = layout === "single" ? 1 : layout === "duo" ? 2 : 3
    const photos = [...block.photos]
    while (photos.length < want) photos.push("")
    updateBlock(i, {
      layout,
      photos: layout === "carousel" ? photos : photos.slice(0, want),
      design: DEFAULT_DESIGN[layout],
    })
  }

  function setPhoto(i: number, slot: number, url: string) {
    const block = blocks[i]
    const photos = [...block.photos]
    while (photos.length <= slot) photos.push("")
    photos[slot] = url
    updateBlock(i, { photos })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={formFieldStyle}>
        <label style={formLabelStyle}>Tajuk</label>
        <input
          value={data.title ?? ""}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          style={formInputStyle}
        />
      </div>
      <div style={formFieldStyle}>
        <label style={formLabelStyle}>Pengenalan (pilihan)</label>
        <input
          value={data.intro ?? ""}
          onChange={(e) => onChange({ ...data, intro: e.target.value })}
          style={formInputStyle}
        />
      </div>

      {blocks.map((block, i) => {
        const layout = effectiveLayout(block.layout)
        const slots = slotsFor(layout, block)
        const designIds = Object.keys(DESIGNS_BY_LAYOUT[layout])
        const activeDesign = block.design && designIds.includes(block.design)
          ? block.design
          : DEFAULT_DESIGN[layout]
        return (
          <div key={i} style={blockCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 13 }}>Koleksi #{i + 1}</strong>
              <button
                type="button"
                onClick={() => commit(blocks.filter((_, idx) => idx !== i))}
                style={removeBtnStyle}
              >
                Buang
              </button>
            </div>

            <div style={formFieldStyle}>
              <label style={formLabelStyle}>Susun Atur</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(Object.keys(LAYOUT_LABELS) as Array<"single" | "duo" | "carousel">).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLayout(i, l)}
                    style={layoutChipStyle(layout === l)}
                  >
                    {LAYOUT_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>

            <div style={formFieldStyle}>
              <label style={formLabelStyle}>Reka Bentuk Foto</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {designIds.map((d) => {
                  const meta = DESIGN_LABELS[d]
                  const selected = d === activeDesign
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => updateBlock(i, { design: d })}
                      style={designRowStyle(selected)}
                    >
                      <span style={{ fontWeight: 700, fontSize: 12 }}>{meta?.label ?? d}</span>
                      <span style={{ fontSize: 11, color: selected ? "#e2d8cc" : "#9a8878" }}>
                        {meta?.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {Array.from({ length: slots }).map((_, slot) => (
              <div key={slot} style={formFieldStyle}>
                <label style={formLabelStyle}>
                  Foto {slot + 1} / {layout === "carousel" ? `${slots} (karusel)` : slots}
                </label>
                <ImageUploadField
                  cardId={cardId ?? ""}
                  userId={userId ?? ""}
                  sectionType="gallery"
                  value={block.photos[slot] ?? ""}
                  onChange={(url) => setPhoto(i, slot, url)}
                  compact
                />
              </div>
            ))}
            {layout === "carousel" && (
              <div style={{ display: "flex", gap: 8 }}>
                {block.photos.length < CAROUSEL_MAX && (
                  <button
                    type="button"
                    onClick={() => updateBlock(i, { photos: [...block.photos, ""] })}
                    style={addBtnStyle}
                  >
                    + Tambah Foto
                  </button>
                )}
                {block.photos.length > 3 && (
                  <button
                    type="button"
                    onClick={() => updateBlock(i, { photos: block.photos.slice(0, -1) })}
                    style={removeBtnStyle}
                  >
                    Buang Foto Terakhir
                  </button>
                )}
              </div>
            )}

            <div style={formFieldStyle}>
              <label style={formLabelStyle}>Kapsyen (pilihan)</label>
              <input
                value={block.caption ?? ""}
                onChange={(e) => updateBlock(i, { caption: e.target.value })}
                style={formInputStyle}
              />
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={() =>
          commit([...blocks, { layout: "single", design: "tape_polaroid", photos: [""] }])
        }
        style={addBtnStyle}
      >
        + Tambah Koleksi Foto
      </button>
    </div>
  )
}

// Form styles mirror the editor's generic form look.
const formFieldStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 6 }
const formLabelStyle: CSSProperties = { fontSize: 12, fontWeight: 600, color: "#5a4a3a" }
const formInputStyle: CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #e2d8cc",
  borderRadius: 8,
  fontSize: 14,
  background: "#fff",
}
const blockCardStyle: CSSProperties = {
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
function layoutChipStyle(active: boolean): CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? "#2c1a4a" : "#e2d8cc"}`,
    background: active ? "#2c1a4a" : "#fff",
    color: active ? "#fff" : "#5a4a3a",
    cursor: "pointer",
    fontSize: 12,
  }
}
function designRowStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    textAlign: "left",
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${active ? "#2c1a4a" : "#e2d8cc"}`,
    background: active ? "#2c1a4a" : "#fff",
    color: active ? "#fff" : "#5a4a3a",
    cursor: "pointer",
  }
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------

export const galleryModule = defineSection<"gallery">({
  type: "gallery",
  label: { en: "Photo Gallery", ms: "Galeri Foto" },
  schema: z.object({
    title: z.string().optional(),
    intro: z.string().optional(),
    blocks: z.array(
      z.object({
        layout: z.enum(["single", "duo", "trio", "carousel"]),
        design: z.string().optional(),
        photos: z.array(cardImageReferenceSchema),
        caption: z.string().optional(),
      })
    ),
  }),
  variants: {
    designer: Designer,
    // Legacy variants — kept so older saved cards render, hidden from picker.
    soft_grid: SoftGrid,
    polaroid_collage: PolaroidCollage,
  },
  variantLabels: {
    designer: "Per-Blok",
    soft_grid: "Grid Lembut",
    polaroid_collage: "Polaroid",
  },
  hiddenVariants: ["soft_grid", "polaroid_collage"],
  defaultVariant: "designer",
  // Collages should interleave between chapters (jestudio-style), so this
  // Section can be added multiple times per card.
  repeatable: true,
  defaultData: {
    title: "Our Moments",
    intro: "",
    blocks: [
      { layout: "single", design: "tape_polaroid", photos: [""], caption: "" },
      { layout: "carousel", design: "postcard", photos: ["", "", ""], caption: "" },
    ],
  },
  appliesTo: "all",
  customForm: GalleryForm,
})
