"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  isSectionCard,
  type CardData,
  type LegacyCardData,
  type RSVPResponse,
} from "@/lib/types"
import { resolveCardDataAssetUrls } from "@/lib/card-assets"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SectionInvitationCard } from "./SectionInvitationCard"

// Top-level dispatch. Section-v2 cards go through SectionInvitationCard.
// Legacy cards continue to use the long-form hand-coded renderer below.
export function InvitationCard({
  cardId,
  userId,
  data,
  rsvpResponses = [],
  publicationId,
}: {
  cardId: string
  userId?: string | null
  data: CardData
  rsvpResponses?: RSVPResponse[]
  publicationId?: string
}) {
  if (isSectionCard(data)) {
    const wishes = rsvpResponses
      .filter((r) => r.message && r.message.trim().length > 0)
      .map((r) => ({ guestName: r.guest_name, message: r.message!, createdAt: r.created_at }))
    return (
      <SectionInvitationCard
        cardId={cardId}
        userId={userId}
        data={data}
        wishes={wishes}
        publicationId={publicationId}
      />
    )
  }
  return (
    <LegacyInvitationCard
      cardId={cardId}
      data={resolveCardDataAssetUrls(data, { cardId, userId })}
      rsvpResponses={rsvpResponses}
    />
  )
}

// ── Template palettes ─────────────────────────────────────────────────────
const TMPL: Record<
  string,
  {
    bg: string
    cvFrom: string
    cvTo: string
    text: string
    accent: string
    gold: string
    border: string
    card: string
    titleFont: string
    divider: string
    openingText: string
    ptclColors: string[]
  }
> = {
  malay: {
    bg: "#fdf6ec",
    cvFrom: "#6b2505",
    cvTo: "#c9984a",
    text: "#3a2010",
    accent: "#92450a",
    gold: "#c9984a",
    border: "rgba(201,152,74,0.4)",
    card: "rgba(255,252,242,0.88)",
    titleFont: "var(--font-cormorant), Georgia, serif",
    divider: "✦",
    openingText: "Dengan Nama Allah Yang Maha Pemurah Lagi Maha Penyayang",
    ptclColors: ["#f5d060", "rgba(255,190,80,0.8)", "rgba(210,140,60,0.6)"],
  },
  chinese: {
    bg: "#8b0000",
    cvFrom: "#3a0000",
    cvTo: "#8b0000",
    text: "#f5d060",
    accent: "#f5d060",
    gold: "#f5d060",
    border: "rgba(245,208,96,0.3)",
    card: "rgba(100,0,0,0.75)",
    titleFont: "var(--font-cormorant), Georgia, serif",
    divider: "❧",
    openingText: "囍 Our Wedding 囍",
    ptclColors: ["#f5d060", "rgba(255,200,80,0.7)", "rgba(220,50,50,0.6)"],
  },
  minimalist: {
    bg: "#f8f7f5",
    cvFrom: "#1a1a1a",
    cvTo: "#444",
    text: "#1a1a1a",
    accent: "#1a1a1a",
    gold: "#888",
    border: "#ddd",
    card: "#ffffff",
    titleFont: "var(--font-cormorant), Georgia, serif",
    divider: "—",
    openingText: "You are invited",
    ptclColors: ["rgba(0,0,0,0.15)", "rgba(0,0,0,0.1)", "rgba(100,100,100,0.12)"],
  },
  birthday: {
    bg: "#fef0f5",
    cvFrom: "#c2185b",
    cvTo: "#7b1fa2",
    text: "#4a0072",
    accent: "#c2185b",
    gold: "#e91e8c",
    border: "rgba(194,24,91,0.2)",
    card: "rgba(255,255,255,0.88)",
    titleFont: "var(--font-cormorant), Georgia, serif",
    divider: "🎉",
    openingText: "You're invited to celebrate!",
    ptclColors: ["#f48fb1", "rgba(225,0,140,0.5)", "rgba(150,0,200,0.4)"],
  },
  corporate: {
    bg: "#0f1f3d",
    cvFrom: "#0a1628",
    cvTo: "#1a3460",
    text: "#e2e8f0",
    accent: "#60a5fa",
    gold: "#38bdf8",
    border: "rgba(96,165,250,0.2)",
    card: "rgba(22,32,64,0.9)",
    titleFont: "var(--font-jakarta), sans-serif",
    divider: "◆",
    openingText: "You are cordially invited",
    ptclColors: [
      "rgba(96,165,250,0.5)",
      "rgba(56,189,248,0.4)",
      "rgba(148,210,255,0.3)",
    ],
  },
}

function getTmplKey(templateId: string): string {
  if (templateId.includes("malay")) return "malay"
  if (templateId.includes("chinese")) return "chinese"
  if (templateId === "birthday") return "birthday"
  if (templateId === "corporate") return "corporate"
  return "minimalist"
}

// Deterministic particles
const PTCLS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: i * 5.5 + 2,
  size: 4 + (i % 4),
  delay: i * 0.25,
  dur: 3.2 + (i % 4) * 0.65,
  dx: (i % 2 === 0 ? 1 : -1) * (12 + i * 2.8),
}))

interface InvitationCardProps {
  cardId: string
  data: LegacyCardData
  rsvpResponses?: RSVPResponse[]
}

function LegacyInvitationCard({ cardId, data, rsvpResponses = [] }: InvitationCardProps) {
  const tmKey = getTmplKey(data.templateId)
  const c = TMPL[tmKey]

  const [entered, setEntered] = useState(false)
  const [activeNav, setActiveNav] = useState<string | null>(null)
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0 })
  const [giftTab, setGiftTab] = useState<"bank" | "registry">("bank")
  const [giftModal, setGiftModal] = useState<NonNullable<LegacyCardData["gifts"]>["registry"] extends Array<infer T> ? T | null : null>(null)
  const [reservedGifts, setReservedGifts] = useState<Set<number>>(new Set())
  const [copiedBank, setCopiedBank] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [rsvpAttending, setRsvpAttending] = useState<boolean | null>(null)
  const [rsvpState, setRsvpState] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const secRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const registerSec = useCallback((id: string) => (el: HTMLDivElement | null) => {
    secRefs.current[id] = el
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    if (!data.eventDate) return
    const target = new Date(`${data.eventDate}T${data.eventTime || "11:00"}:00+08:00`)
    const tick = () => {
      const diff = target.getTime() - Date.now()
      if (diff <= 0) {
        setCountdown({ d: 0, h: 0, m: 0, s: 0 })
        return
      }
      setCountdown({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [data.eventDate, data.eventTime])

  const scrollToSection = useCallback((key: string) => {
    setActiveNav(key)
    const el = secRefs.current[key]
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }, [])

  async function handleRSVP(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setRsvpState("submitting")
    try {
      const res = await fetch(`/api/rsvp/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: fd.get("guestName"),
          guestContact: fd.get("guestContact"),
          attending: rsvpAttending,
          pax: parseInt(fd.get("pax") as string) || 1,
          message: fd.get("message"),
        }),
      })
      if (!res.ok) throw new Error()
      setRsvpState("success")
    } catch {
      setRsvpState("error")
    }
  }

  const formattedDate = data.eventDate
    ? new Date(data.eventDate).toLocaleDateString("ms-MY", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : ""

  const attendingCount = rsvpResponses.filter((r) => r.attending).reduce((s, r) => s + (r.pax || 1), 0)
  const notAttendingCount = rsvpResponses.filter((r) => !r.attending).length

  const bgStyle =
    tmKey === "birthday"
      ? "linear-gradient(160deg, #fce4ec 0%, #f3e5f5 100%)"
      : c.bg

  if (!entered) {
    return <CoverSection onEnter={() => setEntered(true)} c={c} data={data} />
  }

  return (
    <div style={{ position: "relative", background: bgStyle, fontFamily: "var(--font-jakarta), sans-serif", minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kamy-floatUp {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: .75 }
          100% { transform: translateY(-220px) translateX(var(--ptx)) rotate(360deg); opacity: 0 }
        }
      ` }} />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            background: "color-mix(in srgb, var(--primary) 92%, transparent)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 20,
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 13,
            fontWeight: 500,
            zIndex: 60,
            whiteSpace: "nowrap",
            backdropFilter: "blur(8px)",
          }}
        >
          {toast}
        </div>
      )}

      <div style={{ paddingBottom: 80 }}>

        {/* ── Opening ── */}
        <div
          ref={registerSec("opening")}
          style={{ padding: "32px 24px 20px", textAlign: "center" }}
        >
          <p
            style={{
              fontFamily: c.titleFont,
              fontStyle: "italic",
              fontSize: 13,
              color: c.accent,
              letterSpacing: "0.05em",
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            {c.openingText}
          </p>
          <Divider symbol={c.divider} color={c.gold} />
          {(data.brideParent || data.hostNames) && (
            <p style={{ fontSize: 12, color: c.text, opacity: 0.65, lineHeight: 1.6 }}>
              {data.brideParent || data.hostNames}
            </p>
          )}
          {data.groomParent && (
            <>
              <p style={{ fontSize: 11, color: c.text, opacity: 0.45, margin: "4px 0" }}>&amp;</p>
              <p style={{ fontSize: 12, color: c.text, opacity: 0.65, lineHeight: 1.6, marginBottom: 16 }}>
                {data.groomParent}
              </p>
            </>
          )}
          <p style={{ fontSize: 12, color: c.text, opacity: 0.5, fontStyle: "italic", marginBottom: 12 }}>
            {tmKey === "malay" ? "Dengan penuh kegembiraan, menjemput" : "With great joy, invite you to"}
          </p>
          <h2
            style={{
              fontFamily: c.titleFont,
              fontSize: 36,
              fontWeight: 400,
              color: c.accent,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {data.brideName || data.eventName}
          </h2>
          {data.groomName && (
            <>
              <p
                style={{
                  fontFamily: c.titleFont,
                  fontSize: 22,
                  color: c.gold,
                  margin: "4px 0",
                  fontStyle: "italic",
                }}
              >
                &amp;
              </p>
              <h2
                style={{
                  fontFamily: c.titleFont,
                  fontSize: 36,
                  fontWeight: 400,
                  color: c.accent,
                  margin: "0 0 8px",
                  lineHeight: 1.1,
                }}
              >
                {data.groomName}
              </h2>
            </>
          )}
          {data.hashtag && (
            <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: c.text, opacity: 0.5 }}>
              {data.hashtag}
            </p>
          )}
        </div>

        {/* ── Details ── */}
        <Section id="details" registerRef={registerSec} c={c}>
          <div
            style={{
              background: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 14,
              padding: "20px",
              backdropFilter: "blur(8px)",
            }}
          >
            <DetailRow icon="📅" label={tmKey === "malay" ? "Tarikh" : "Date"} value={formattedDate} sub={data.eventTime} c={c} />
            <div style={{ height: 1, background: c.border, margin: "14px 0" }} />
            <DetailRow icon="🕌" label={tmKey === "malay" ? "Tempat" : "Venue"} value={data.venue} sub={data.venueAddress} c={c} />
          </div>
        </Section>

        {/* ── Program ── */}
        {data.program && data.program.length > 0 && (
          <Section id="program" registerRef={registerSec} title={tmKey === "malay" ? "Atur Cara Majlis" : "Program"} c={c}>
            <div
              style={{
                background: c.card,
                border: `1px solid ${c.border}`,
                borderRadius: 14,
                padding: "16px 20px",
                backdropFilter: "blur(8px)",
              }}
            >
              {data.program.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: i < (data.program?.length ?? 0) - 1 ? `1px solid ${c.border}` : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: c.titleFont,
                      fontSize: 14,
                      color: c.gold,
                      fontStyle: "italic",
                      minWidth: 100,
                    }}
                  >
                    {p.time}
                  </span>
                  <span style={{ fontSize: 13, color: c.text, textAlign: "right" }}>{p.event}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Countdown ── */}
        <Section id="countdown" registerRef={registerSec} title={tmKey === "malay" ? "Menghitung Hari" : "Counting Down"} c={c}>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {([["Hari", countdown.d], ["Jam", countdown.h], ["Minit", countdown.m], ["Saat", countdown.s]] as [string, number][]).map(([l, v]) => (
              <div
                key={l}
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: c.card,
                  border: `1px solid ${c.border}`,
                  borderRadius: 12,
                  padding: "14px 4px",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    fontFamily: c.titleFont,
                    fontSize: 36,
                    fontWeight: 600,
                    color: c.accent,
                    lineHeight: 1,
                  }}
                >
                  {String(v).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: c.text,
                    opacity: 0.6,
                    marginTop: 4,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Additional Message ── */}
        {data.additionalMessage && (
          <div style={{ padding: "8px 24px 16px", textAlign: "center" }}>
            <p
              style={{
                fontFamily: c.titleFont,
                fontSize: 16,
                fontStyle: "italic",
                color: c.accent,
                lineHeight: 1.65,
                opacity: 0.85,
              }}
            >
              &ldquo;{data.additionalMessage}&rdquo;
            </p>
          </div>
        )}

        {/* ── Gallery ── */}
        {(data.galleryUrls?.length || data.coverPhotoUrl) && (
          <Section id="gallery" registerRef={registerSec} title="Galeri" c={c}>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {(data.galleryUrls?.length
                ? data.galleryUrls
                : [data.coverPhotoUrl!]
              ).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`Photo ${i + 1}`}
                  style={{
                    flexShrink: 0,
                    width: 140,
                    height: 175,
                    borderRadius: 10,
                    objectFit: "cover",
                    border: `1px solid ${c.border}`,
                  }}
                />
              ))}
            </div>
          </Section>
        )}

        {/* ── Location ── */}
        <Section id="location" registerRef={registerSec} title={tmKey === "malay" ? "Lokasi" : "Location"} c={c}>
          <div
            style={{
              background: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 14,
              padding: "16px",
              marginBottom: 14,
              backdropFilter: "blur(8px)",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700, color: c.accent, margin: "0 0 4px" }}>
              {data.venue}
            </p>
            <p style={{ fontSize: 12, color: c.text, opacity: 0.7, margin: 0, lineHeight: 1.5 }}>
              {data.venueAddress}
            </p>
          </div>

          {/* Map placeholder */}
          <div
            style={{
              height: 80,
              background: `repeating-linear-gradient(45deg, ${c.border} 0px, ${c.border} 4px, ${c.card} 4px, ${c.card} 8px)`,
              borderRadius: 12,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${c.border}`,
            }}
          >
            <span style={{ fontFamily: "monospace", fontSize: 10, color: c.text, opacity: 0.4 }}>
              map view
            </span>
          </div>

          {/* Map buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {(
              [
                ["Waze", "#00BAFF", "🚗"],
                ["Google Maps", "#4285F4", "📍"],
                ["Apple Maps", "#333", "🗺"],
              ] as [string, string, string][]
            ).map(([label, bg, em]) => (
              <button
                key={label}
                onClick={() => showToast(`Membuka ${label}…`)}
                style={{
                  flex: 1,
                  height: 38,
                  background: bg,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <span>{em}</span>
                <span>{label.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* Calendar buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            {(["Google Calendar", "Apple Calendar"] as const).map((label) => (
              <button
                key={label}
                onClick={() => showToast(`Menambah ke ${label}…`)}
                style={{
                  flex: 1,
                  height: 36,
                  background: "transparent",
                  color: c.accent,
                  border: `1px solid ${c.border}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                📅 {label.split(" ")[0]}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Contacts ── */}
        {data.contacts && data.contacts.length > 0 && (
          <Section id="contacts" registerRef={registerSec} title="Hubungi" c={c}>
            <p style={{ textAlign: "center", fontSize: 12, color: c.text, opacity: 0.6, marginBottom: 14 }}>
              Bagi sebarang pertanyaan, sila hubungi:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.contacts.map((ct, i) => (
                <button
                  key={i}
                  onClick={() => showToast(`Menghubungi ${ct.name}…`)}
                  style={{
                    height: 44,
                    background: i === 0 ? "var(--primary)" : "transparent",
                    color: i === 0 ? "#fff" : c.accent,
                    border: `1.5px solid ${i === 0 ? "transparent" : c.border}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {ct.name} · {ct.phone}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* ── Catering / Vendor ── */}
        {data.caterers && data.caterers.length > 0 && (
          <Section id="catering" registerRef={registerSec} title="Vendor Makanan" c={c}>
            <p style={{ textAlign: "center", fontSize: 12, color: c.text, opacity: 0.6, marginBottom: 14 }}>
              Kenali vendor yang hadir di majlis ini
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.caterers.map((v, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: c.card,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: c.border,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {v.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: "0 0 2px" }}>
                      {v.name}
                    </p>
                    <p style={{ fontSize: 11, color: c.text, opacity: 0.6, margin: 0 }}>{v.food}</p>
                  </div>
                  <button
                    onClick={() => showToast(`Menghubungi ${v.name}…`)}
                    style={{
                      height: 32,
                      padding: "0 12px",
                      background: "transparent",
                      border: `1px solid ${c.border}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                      color: c.accent,
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-jakarta), sans-serif",
                    }}
                  >
                    Hubungi
                  </button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Hadiah / Gift ── */}
        {data.gifts && (
          <Section id="hadiah" registerRef={registerSec} title="Hadiah" c={c}>
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                background: c.card,
                borderRadius: 10,
                padding: 3,
                border: `1px solid ${c.border}`,
                marginBottom: 16,
              }}
            >
              {(
                [
                  ["bank", "Pindahan Bank / QR"],
                  ["registry", "Senarai Hadiah"],
                ] as ["bank" | "registry", string][]
              ).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setGiftTab(k)}
                  style={{
                    flex: 1,
                    height: 36,
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    background: giftTab === k ? c.accent : "transparent",
                    color: giftTab === k ? "#fff" : c.text,
                    opacity: giftTab === k ? 1 : 0.6,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            {giftTab === "bank" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {data.gifts.banks?.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      background: c.card,
                      border: `1px solid ${c.border}`,
                      borderRadius: 12,
                      padding: "14px 16px",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.accent }}>🏦 {b.bank}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(b.accNumber).catch(() => {})
                          setCopiedBank(i)
                          setTimeout(() => setCopiedBank(null), 1500)
                        }}
                        style={{
                          fontSize: 12,
                          color: copiedBank === i ? "#27ae60" : c.gold,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontFamily: "var(--font-jakarta), sans-serif",
                        }}
                      >
                        {copiedBank === i ? "✓ Disalin" : "⎘ Salin"}
                      </button>
                    </div>
                    <p style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: c.text, letterSpacing: "0.08em", margin: "0 0 4px" }}>
                      {b.accNumber}
                    </p>
                    <p style={{ fontSize: 11, color: c.text, opacity: 0.6, margin: 0 }}>{b.accName}</p>
                  </div>
                ))}
                {data.gifts.qrCodes?.map((q, i) => (
                  <div
                    key={i}
                    style={{
                      background: c.card,
                      border: `1px solid ${c.border}`,
                      borderRadius: 12,
                      padding: "16px",
                      textAlign: "center",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: c.accent, marginBottom: 12 }}>{q.method}</p>
                    <QRMock size={100} fg={tmKey === "chinese" ? "#8b0000" : "var(--primary)"} />
                    <p style={{ fontSize: 12, color: c.text, marginTop: 8, opacity: 0.7 }}>{q.name}</p>
                    <p style={{ fontFamily: "monospace", fontSize: 12, color: c.text, opacity: 0.55 }}>{q.phone}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.gifts.registry?.map((gift) => {
                  const isReserved = reservedGifts.has(gift.id)
                  return (
                    <div
                      key={gift.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        background: c.card,
                        border: `1px solid ${c.border}`,
                        borderRadius: 12,
                        padding: "12px 14px",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 8,
                          background: "repeating-linear-gradient(45deg, #f0e8d8 0px, #f0e8d8 4px, #ede0cc 4px, #ede0cc 8px)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span style={{ fontSize: 8, color: "var(--muted-foreground)", fontFamily: "monospace" }}>img</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: c.text, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {gift.name}
                        </p>
                        <p style={{ fontSize: 11, color: c.gold, fontWeight: 700, margin: 0 }}>{gift.price}</p>
                      </div>
                      <button
                        onClick={() => !isReserved && setGiftModal(gift as never)}
                        style={{
                          flexShrink: 0,
                          height: 32,
                          padding: "0 12px",
                          background: isReserved ? c.border : c.accent,
                          color: isReserved ? c.text : "#fff",
                          border: "none",
                          borderRadius: 8,
                          cursor: isReserved ? "default" : "pointer",
                          fontFamily: "var(--font-jakarta), sans-serif",
                          fontSize: 11,
                          fontWeight: 700,
                          opacity: isReserved ? 0.7 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isReserved ? "Sudah Ditempah ✓" : "Tempah Hadiah ›"}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        )}

        {/* ── Attendance & Messages ── */}
        {rsvpResponses.length > 0 && (
          <Section id="kehadiran" registerRef={registerSec} title="Kehadiran" c={c}>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              {([
                [attendingCount, "Hadir", "#27ae60"],
                [notAttendingCount, "Tidak Hadir", "#c0392b"],
              ] as [number, string, string][]).map(([v, l, col]) => (
                <div
                  key={l}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    background: c.card,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    padding: "16px 8px",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <div style={{ fontFamily: c.titleFont, fontSize: 36, fontWeight: 600, color: col }}>{v}</div>
                  <div style={{ fontSize: 11, color: c.text, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
                </div>
              ))}
            </div>

            {rsvpResponses.slice(0, 5).map((r, i) => (
              <div
                key={i}
                style={{
                  background: c.card,
                  border: `1px solid ${c.border}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 8,
                  backdropFilter: "blur(6px)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.accent }}>{r.guest_name}</span>
                  {r.pax > 0 && (
                    <span style={{ fontSize: 10, color: c.gold, fontWeight: 600 }}>{r.pax} orang hadir</span>
                  )}
                </div>
                {r.message && (
                  <p style={{ fontSize: 12, color: c.text, opacity: 0.8, margin: 0, fontStyle: "italic" }}>
                    &ldquo;{r.message}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* ── RSVP ── */}
        {data.rsvpEnabled && (
          <Section id="rsvp" registerRef={registerSec} title="Maklumbalas" c={c}>
            {rsvpState === "success" ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: c.accent }}>Terima kasih kerana membalas!</p>
                <p style={{ fontSize: 13, color: c.text, opacity: 0.65 }}>Maklumbalas anda telah direkodkan.</p>
              </div>
            ) : (
              <form
                onSubmit={handleRSVP}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {rsvpState === "error" && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#fff0ee",
                      border: "1px solid #f5c6c0",
                      borderRadius: 8,
                      fontSize: 13,
                      color: "#c0392b",
                      fontFamily: "var(--font-jakarta), sans-serif",
                    }}
                  >
                    Ralat semasa menghantar. Sila cuba lagi.
                  </div>
                )}
                <input
                  name="guestName"
                  placeholder="Nama Penuh *"
                  required
                  style={rsvpInputStyle(c)}
                />
                <input
                  name="guestContact"
                  placeholder="Telefon / Email (pilihan)"
                  style={rsvpInputStyle(c)}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  {(
                    [
                      [true, "✓ Ya, saya hadir", "#27ae60"],
                      [false, "✕ Tidak dapat hadir", "#c0392b"],
                    ] as [boolean, string, string][]
                  ).map(([val, label, col]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setRsvpAttending(val)}
                      style={{
                        flex: 1,
                        height: 44,
                        border: `1.5px solid ${rsvpAttending === val ? col : c.border}`,
                        borderRadius: 10,
                        background: rsvpAttending === val ? col : "transparent",
                        color: rsvpAttending === val ? "#fff" : c.text,
                        cursor: "pointer",
                        fontFamily: "var(--font-jakarta), sans-serif",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {rsvpAttending && (
                  <input
                    name="pax"
                    type="number"
                    placeholder="Bilangan tetamu (termasuk anda)"
                    min={1}
                    max={10}
                    defaultValue={1}
                    style={{ ...rsvpInputStyle(c), width: 220 }}
                  />
                )}
                <textarea
                  name="message"
                  placeholder="Ucapan untuk tuan/puan rumah (pilihan)"
                  rows={3}
                  style={{
                    padding: "10px 14px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 13,
                    color: c.text,
                    background:
                      tmKey === "corporate" ? "rgba(22,32,64,0.9)" : "#fff",
                    outline: "none",
                    resize: "none",
                    boxSizing: "border-box",
                    width: "100%",
                  }}
                />
                <button
                  type="submit"
                  disabled={rsvpState === "submitting" || rsvpAttending === null}
                  style={{
                    height: 48,
                    background: rsvpAttending !== null ? c.accent : c.border,
                    color: rsvpAttending !== null ? "#fff" : c.text,
                    border: "none",
                    borderRadius: 10,
                    cursor: rsvpAttending !== null ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    opacity: rsvpAttending !== null ? 1 : 0.6,
                  }}
                >
                  {rsvpState === "submitting" ? "Menghantar…" : "Hantar Maklumbalas"}
                </button>
              </form>
            )}

            <div
              style={{
                textAlign: "center",
                marginTop: 20,
                paddingTop: 16,
                borderTop: `1px solid ${c.border}`,
              }}
            >
              <p style={{ fontSize: 10, color: c.text, opacity: 0.35, letterSpacing: "0.1em" }}>
                Dihasilkan oleh kamy jemput
              </p>
            </div>
          </Section>
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 30,
          padding: "8px 12px 10px",
          background: "linear-gradient(to top, rgba(255,255,255,0.98) 70%, rgba(255,255,255,0))",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            background: "#fff",
            borderRadius: 40,
            boxShadow: "0 2px 20px rgba(0,0,0,0.12)",
            padding: "6px 8px",
          }}
        >
          {(
            [
              ["contacts", <PhoneIcon key="phone" />],
              ["location", <LocationIcon key="loc" />],
              ["hadiah", <GiftIcon key="gift" />],
              ["rsvp", <MailIcon key="mail" />],
            ] as [string, React.ReactNode][]
          ).map(([key, icon]) => (
            <button
              key={key}
              onClick={() => scrollToSection(key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "6px 10px",
                borderRadius: 20,
                background: activeNav === key ? "var(--primary)" : "transparent",
                color: activeNav === key ? "#fff" : "var(--muted-foreground)",
                border: "none",
                cursor: "pointer",
                minWidth: 44,
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Gift Modal ── */}
      {giftModal && data.gifts && (
        <GiftModal
          gift={giftModal as { id: number; name: string; price: string; link?: string; msg?: string }}
          shippingAddress={data.gifts.shippingAddress}
          reserved={reservedGifts.has((giftModal as { id: number }).id)}
          onReserve={() => {
            setReservedGifts((prev) => new Set([...prev, (giftModal as { id: number }).id]))
            setGiftModal(null)
            showToast("Hadiah berjaya ditempah! ✓")
          }}
          onClose={() => setGiftModal(null)}
        />
      )}
    </div>
  )
}

// ── Cover Section ─────────────────────────────────────────────────────────
function CoverSection({
  onEnter,
  c,
  data,
}: {
  onEnter: () => void
  c: (typeof TMPL)[string]
  data: LegacyCardData
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100dvh",
        background: `linear-gradient(160deg, ${c.cvFrom} 0%, ${c.cvTo} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kamy-floatUp {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: .75 }
          100% { transform: translateY(-220px) translateX(var(--ptx)) rotate(360deg); opacity: 0 }
        }
        @keyframes kamy-pulseRing {
          0%, 100% { transform: scale(1); opacity: .6 }
          50% { transform: scale(1.08); opacity: 1 }
        }
        @keyframes kamy-fadeSlideUp {
          from { opacity: 0; transform: translateY(20px) }
          to { opacity: 1; transform: translateY(0) }
        }
      ` }} />

      {/* Particles */}
      {PTCLS.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            bottom: "15%",
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: c.ptclColors[p.id % 3],
            // @ts-expect-error CSS custom property
            "--ptx": `${p.dx}px`,
            animation: `kamy-floatUp ${p.dur}s ${p.delay}s ease-out infinite`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Content */}
      <div
        style={{
          textAlign: "center",
          padding: "0 32px",
          animation: "kamy-fadeSlideUp 1s ease both",
          position: "relative",
          zIndex: 2,
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 11,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)",
            marginBottom: 16,
          }}
        >
          {data.templateId.includes("malay")
            ? "Walimatul Urus"
            : data.templateId.includes("corporate")
            ? "Corporate Invitation"
            : data.templateId === "birthday"
            ? "You're Invited!"
            : "The Wedding of"}
        </p>
        <h1
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: 54,
            fontWeight: 400,
            color: "#fff",
            lineHeight: 1.05,
            margin: "0 0 6px",
            textShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}
        >
          {data.brideName || data.eventName}
        </h1>
        {data.groomName && (
          <>
            <p
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 28,
                color: "rgba(255,255,255,0.7)",
                margin: "4px 0",
                fontStyle: "italic",
              }}
            >
              &amp;
            </p>
            <h1
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: 54,
                fontWeight: 400,
                color: "#fff",
                lineHeight: 1.05,
                margin: "0 0 20px",
                textShadow: "0 2px 20px rgba(0,0,0,0.3)",
              }}
            >
              {data.groomName}
            </h1>
          </>
        )}
        {data.eventDate && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              justifyContent: "center",
              marginBottom: 32,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.35)", maxWidth: 60 }} />
            <p
              style={{
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 13,
                color: "rgba(255,255,255,0.8)",
                letterSpacing: "0.12em",
              }}
            >
              {new Date(data.eventDate).toLocaleDateString("ms-MY", {
                day: "numeric",
                month: "numeric",
                year: "numeric",
              })}
            </p>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.35)", maxWidth: 60 }} />
          </div>
        )}
        <button
          onClick={onEnter}
          style={{
            background: "rgba(255,255,255,0.18)",
            border: "1.5px solid rgba(255,255,255,0.5)",
            color: "#fff",
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "12px 28px",
            borderRadius: 40,
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            animation: "kamy-pulseRing 2.5s ease infinite",
          }}
        >
          ▶ Ketuk untuk masuk
        </button>
      </div>

      <div style={{ position: "absolute", bottom: 14, textAlign: "center", width: "100%" }}>
        <span
          style={{
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 10,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.15em",
          }}
        >
          kamy jemput
        </span>
      </div>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────
function Section({
  id,
  registerRef,
  title,
  c,
  children,
}: {
  id: string
  registerRef: (id: string) => (el: HTMLDivElement | null) => void
  title?: string
  c: (typeof TMPL)[string]
  children: React.ReactNode
}) {
  return (
    <div
      id={id}
      ref={registerRef(id)}
      style={{ padding: "28px 20px" }}
    >
      {title && (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h2
            style={{
              fontFamily: c.titleFont,
              fontSize: 22,
              fontWeight: 600,
              fontStyle: "italic",
              color: c.accent,
              margin: 0,
            }}
          >
            {title}
          </h2>
          <Divider symbol={c.divider} color={c.gold} />
        </div>
      )}
      {children}
    </div>
  )
}

function Divider({ symbol, color }: { symbol: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
      <div style={{ flex: 1, height: 1, background: `${color}44` }} />
      <span style={{ color, fontSize: 14, opacity: 0.7 }}>{symbol}</span>
      <div style={{ flex: 1, height: 1, background: `${color}44` }} />
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
  sub,
  c,
}: {
  icon: string
  label: string
  value: string
  sub?: string
  c: (typeof TMPL)[string]
}) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: c.text, opacity: 0.45, margin: "0 0 2px" }}>
          {label}
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: c.accent, margin: "0 0 2px" }}>{value}</p>
        {sub && <p style={{ fontSize: 12, color: c.text, opacity: 0.65, margin: 0, lineHeight: 1.5 }}>{sub}</p>}
      </div>
    </div>
  )
}

// ── Gift Modal ────────────────────────────────────────────────────────────
function GiftModal({
  gift,
  shippingAddress,
  reserved,
  onReserve,
  onClose,
}: {
  gift: { id: number; name: string; price: string; link?: string; msg?: string }
  shippingAddress?: string
  reserved: boolean
  onReserve: () => void
  onClose: () => void
}) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [copied, setCopied] = useState(false)

  async function copyAddr() {
    if (!shippingAddress) return
    try {
      await navigator.clipboard.writeText(shippingAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { setCopied(false) }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogTitle>Tempah hadiah</DialogTitle>
        <DialogDescription>{gift.name} · {gift.price}</DialogDescription>
        {gift.msg && <p className="text-sm leading-6 text-muted-foreground">{gift.msg}</p>}
        {shippingAddress && <div className="rounded-lg border bg-secondary p-4">
          <p className="mb-2 text-xs font-medium">Alamat penghantaran</p>
          <p className="whitespace-pre-wrap text-sm leading-6">{shippingAddress}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={copyAddr}>{copied ? "Disalin!" : "Salin alamat"}</Button>
        </div>}
        {!reserved ? <>
          <label className="space-y-2 text-xs font-medium">Nama penuh<Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
          <label className="space-y-2 text-xs font-medium">Nombor telefon<Input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" /></label>
          <DialogFooter><Button variant="outline" onClick={onClose}>Batal</Button><Button onClick={onReserve} disabled={!name.trim() || !phone.trim()}>Tempah sekarang</Button></DialogFooter>
        </> : <p role="status" className="rounded-lg bg-secondary p-4 text-sm text-primary">Hadiah ini sudah ditempah.</p>}
      </DialogContent>
    </Dialog>
  )
}

// ── QR Mock ───────────────────────────────────────────────────────────────
function QRMock({ size = 80, fg = "#333" }: { size?: number; fg?: string }) {
  const N = 16
  const grid = [1,1,1,0,1,0,1,1,1,1,0,0,0,1,1,0,1,0,0,1,0,1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,1,1,0,0,0,1,0,0,1,0,1,0,1,0,0,1,1,0,1,0,1,0,0,0,0,1,0,0,1,1,0,1,0,0,1,0,1,1,1,0,0,0,1,0,1,1,0,0,1,0,1,1,1,0,0,1,0,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,0,0,1,1,1,0,1,0,1,0,0,0,0,0,1,0,0,1,1,0,1,0,0,1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,1,0,1,0,0,0,0,1,1,0,0,0,1,0,1,0,0,1,1,0,1,0,1,0,1,1,1,0,0,1,0,1,0,0,1,0,1,0,0,1,1,0,1,0,0,1,1,0,0,0,1,0,0,1,0,1,0,1,0,0,1,1,0,1,0,0,1,0,1,0,1,1,1,0,0,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,0,0,1,1,0,1,0,1,0,0,1,1,1]
  return (
    <div style={{ display: "inline-block", padding: 8, background: "#fff", borderRadius: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${N} ${N}`} style={{ imageRendering: "pixelated", display: "block" }}>
        <rect width={N} height={N} fill="#fff" />
        {grid.slice(0, N * N).map((on, i) =>
          on ? <rect key={i} x={i % N} y={Math.floor(i / N)} width={1} height={1} fill={fg} /> : null
        )}
        {([[0,0],[9,0],[0,9]] as [number,number][]).map(([ox, oy], fi) => (
          <g key={fi}>
            <rect x={ox} y={oy} width={6} height={6} fill={fg} />
            <rect x={ox+1} y={oy+1} width={4} height={4} fill="#fff" />
            <rect x={ox+2} y={oy+2} width={2} height={2} fill={fg} />
          </g>
        ))}
      </svg>
    </div>
  )
}

function rsvpInputStyle(c: (typeof TMPL)[string]): React.CSSProperties {
  return {
    height: 44,
    padding: "0 14px",
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    fontFamily: "var(--font-jakarta), sans-serif",
    fontSize: 14,
    background: "#fff",
    color: c.text,
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  }
}

// ── SVG Icons ─────────────────────────────────────────────────────────────
function PhoneIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
  )
}
function LocationIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function GiftIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  )
}
function MailIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}
