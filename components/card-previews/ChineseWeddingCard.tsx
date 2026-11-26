"use client"

import { useState, useEffect, useRef } from "react"
import type { LegacyCardData, RSVPResponse } from "@/lib/types"

interface ChineseWeddingProps extends LegacyCardData {
  cardId?: string
  rsvpResponses?: RSVPResponse[]
}

const C = {
  red: "#6b0000",
  red2: "#9b1515",
  red3: "#c41230",
  gold: "#d4af37",
  gold2: "#f5d060",
  cream: "#faf0d7",
  cream2: "#f0ddb0",
  dark: "#130202",
}

const MS = "'Ma Shan Zheng', cursive"
const CG = "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif"
const NS = "'Noto Serif SC', serif"

// Deterministic particle config — no random() at render time
const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  char: ["囍", "❤", "✦", "✧", "♡", "✿"][i % 6],
  left: `${i * 4.1 + 1}%`,
  size: 8 + (i % 5),
  color: i % 3 === 0 ? "#f5d060" : i % 3 === 1 ? "rgba(212,175,55,.5)" : "rgba(245,208,96,.28)",
  dur: `${5 + (i % 5)}s`,
  delay: `${i * 0.24}s`,
  dx: `${(i % 2 === 0 ? 1 : -1) * (10 + i * 2.4)}px`,
}))

// Build May 2027 calendar cells for a given date
function buildCalendar(eventDate: string) {
  if (!eventDate) return null
  const d = new Date(eventDate)
  const year = d.getFullYear()
  const month = d.getMonth()
  const day = d.getDate()
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return { year, month, day, firstDay, daysInMonth }
}

export function ChineseWeddingCard({
  eventName, eventDate, eventTime, venue, venueAddress, hostNames,
  coverPhotoUrl, additionalMessage, rsvpEnabled, rsvpDeadline,
  brideName, groomName, brideParent, groomParent, galleryUrls, contacts,
  cardId, rsvpResponses = [],
}: ChineseWeddingProps) {
  const [countdown, setCountdown] = useState({ d: "--", h: "--", m: "--", s: "--" })
  const [activeTab, setActiveTab] = useState<"bride" | "groom">("bride")
  const [toast, setToast] = useState("")
  const [attending, setAttending] = useState<boolean | null>(null)
  const [rsvpDone, setRsvpDone] = useState(false)
  const [rsvpName, setRsvpName] = useState("")
  const [rsvpContact, setRsvpContact] = useState("")
  const [rsvpPax, setRsvpPax] = useState(1)
  const [rsvpMsg, setRsvpMsg] = useState("")
  const [rsvpError, setRsvpError] = useState("")

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 2200)
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  // Countdown timer
  useEffect(() => {
    if (!eventDate) return
    const target = new Date(`${eventDate}T${eventTime || "19:00"}+08:00`)
    const tick = () => {
      const diff = target.getTime() - Date.now()
      if (diff <= 0) return
      setCountdown({
        d: String(Math.floor(diff / 86400000)).padStart(2, "0"),
        h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, "0"),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [eventDate, eventTime])

  async function submitRSVP() {
    setRsvpError("")
    if (!rsvpName || !rsvpContact || attending === null) {
      showToast("请填写所有必填项目 Please fill in all required fields")
      return
    }
    if (cardId) {
      try {
        const res = await fetch(`/api/rsvp/${cardId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestName: rsvpName, guestContact: rsvpContact, attending, pax: attending ? rsvpPax : 1, message: rsvpMsg }),
        })
        if (!res.ok) throw new Error("RSVP failed")
      } catch {
        setRsvpError("Maaf, maklumbalas tidak dapat dihantar. Sila cuba lagi.")
        return
      }
    }
    setRsvpDone(true)
  }

  const cal = buildCalendar(eventDate)
  const zhDays = ["日", "一", "二", "三", "四", "五", "六"]
  const zhMonths = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]

  const riInput: React.CSSProperties = {
    height: 44, border: "1px solid rgba(212,175,55,.3)", borderRadius: 8,
    padding: "0 14px", fontFamily: NS, fontSize: 13,
    background: "rgba(255,255,255,.05)", color: C.cream, outline: "none", width: "100%",
  }

  // Date short display
  const dateShort = eventDate
    ? (() => { const d = new Date(eventDate); return `${String(d.getMonth() + 1).padStart(2, "0")} · ${String(d.getDate()).padStart(2, "0")} · ${d.getFullYear()}` })()
    : ""

  return (
    <div style={{ fontFamily: NS, background: C.red, color: C.cream, maxWidth: 480, margin: "0 auto", overflowX: "hidden", position: "relative" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+SC:wght@300;400;600&display=swap');
        @keyframes cw-pfloat{0%{transform:translateY(100vh) translateX(0) rotate(0deg);opacity:0}8%{opacity:.85}85%{opacity:.3}100%{transform:translateY(-60px) translateX(var(--cw-dx)) rotate(480deg);opacity:0}}
        @keyframes cw-vspin{to{transform:rotate(360deg)}}
        @keyframes cw-mprog{0%{width:18%}100%{width:92%}}
        @keyframes cw-s1{0%,28%{opacity:1}34%,100%{opacity:0}}
        @keyframes cw-s2{0%,32%{opacity:0}34%,61%{opacity:1}67%,100%{opacity:0}}
        @keyframes cw-s3{0%,65%{opacity:0}67%,95%{opacity:1}100%{opacity:0}}
        @keyframes cw-kb{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.09) translate(-2%,2%)}}
        @keyframes cw-kb2{0%{transform:scale(1.09) translate(2%,-1%)}100%{transform:scale(1) translate(0,2%)}}
        @keyframes cw-kb3{0%{transform:scale(1.04) translate(-1%,1%)}100%{transform:scale(1.09) translate(2%,-2%)}}
        .cw-slide:nth-child(1){animation:cw-s1 12s ease-in-out infinite}
        .cw-slide:nth-child(2){animation:cw-s2 12s ease-in-out infinite}
        .cw-slide:nth-child(3){animation:cw-s3 12s ease-in-out infinite}
        .cw-kb{animation:cw-kb 12s ease-in-out infinite alternate}
        .cw-kb2{animation:cw-kb2 12s ease-in-out infinite alternate;animation-delay:-4s}
        .cw-kb3{animation:cw-kb3 12s ease-in-out infinite alternate;animation-delay:-8s}
        .cw-vinyl{animation:cw-vspin 3.2s linear infinite}
        .cw-mpfill{animation:cw-mprog 35s linear infinite;height:100%;background:${C.gold};border-radius:2px}
      ` }} />

      {/* Particles */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 0,
              left: p.left,
              fontFamily: MS,
              fontSize: p.size,
              color: p.color,
              animation: `cw-pfloat ${p.dur} linear ${p.delay} infinite`,
              // @ts-expect-error CSS custom property
              "--cw-dx": p.dx,
            }}
          >
            {p.char}
          </div>
        ))}
      </div>

      {/* COVER */}
      <section id="cw-cover" style={{ minHeight: "100svh", background: `linear-gradient(170deg,#130202 0%,#5a0808 25%,#8b0000 55%,#c41230 100%)`, display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 20px 16px", position: "relative", zIndex: 2, overflow: "hidden" }}>
        {/* Giant 囍 watermark */}
        <div style={{ position: "absolute", fontFamily: MS, fontSize: 260, color: "rgba(212,175,55,.055)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", lineHeight: 1, zIndex: 0 }}>囍</div>

        {/* Music bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.05)", backdropFilter: "blur(14px)", border: "1px solid rgba(212,175,55,.22)", borderRadius: 40, padding: "6px 14px 6px 6px", width: "100%", maxWidth: 310, position: "relative", zIndex: 2 }}>
          <div className="cw-vinyl" style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: "conic-gradient(#1a0202 0deg,#4a1010 40deg,#1a0202 80deg,#4a1010 120deg,#1a0202 160deg,#4a1010 200deg,#1a0202 240deg,#4a1010 280deg,#1a0202 320deg,#4a1010 360deg)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 11, borderRadius: "50%", background: `radial-gradient(circle,${C.gold} 30%,#8a6010 100%)` }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.gold2, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>一生一世 — {eventName || "Emily & Alex"}</div>
            <div style={{ fontSize: 9, color: "rgba(245,208,96,.4)", marginTop: 1, fontFamily: CG }}>Wedding Playlist ♪</div>
            <div style={{ height: 2, background: "rgba(212,175,55,.15)", borderRadius: 2, marginTop: 5, overflow: "hidden" }}>
              <div className="cw-mpfill" />
            </div>
          </div>
          <span style={{ color: "rgba(245,208,96,.45)", fontSize: 15 }}>♡</span>
        </div>

        {/* 囍 header */}
        <div style={{ textAlign: "center", position: "relative", zIndex: 2, margin: "10px 0 14px" }}>
          <span style={{ fontFamily: MS, fontSize: 44, color: C.gold2, lineHeight: 1, display: "block", textShadow: "0 0 24px rgba(212,175,55,.35)" }}>囍</span>
          <span style={{ fontFamily: CG, fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(245,208,96,.5)", display: "block", marginTop: 2 }}>Our Wedding</span>
        </div>

        {/* Photo slideshow — pill shaped */}
        <div style={{ width: 260, aspectRatio: "3/4", borderRadius: "130px 130px 20px 20px", overflow: "hidden", position: "relative", border: "2px solid rgba(212,175,55,.3)", boxShadow: "0 8px 48px rgba(0,0,0,.55)", zIndex: 2, margin: "0 auto 16px" }}>
          {[
            { bg: "linear-gradient(135deg,#7a1010 0%,#c41230 55%,#8b0000 100%)", cls: "cw-kb", label: "couple photo 1" },
            { bg: coverPhotoUrl ? `url(${coverPhotoUrl}) center/cover` : "linear-gradient(135deg,#4a0808 0%,#8b1515 45%,#c41230 100%)", cls: "cw-kb2", label: "couple photo 2" },
            { bg: "linear-gradient(135deg,#9b1515 0%,#6b0000 55%,#3a0505 100%)", cls: "cw-kb3", label: "couple photo 3" },
          ].map((slide, i) => (
            <div key={i} className="cw-slide" style={{ position: "absolute", inset: 0, opacity: 0 }}>
              <div className={slide.cls} style={{ width: "100%", height: "100%", background: slide.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {!coverPhotoUrl && <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(245,208,96,.2)" }}>{slide.label}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Names */}
        <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
          <div style={{ fontFamily: MS, fontSize: 22, color: C.gold2 }}>
            {brideName || "陈雅仪"} ❤ {groomName || "李俊明"}
          </div>
          <div style={{ fontFamily: CG, fontSize: 12, color: "rgba(245,208,96,.5)", letterSpacing: "0.12em", margin: "2px 0" }}>
            {eventName || "Emily & Alex"}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginTop: 10, padding: "7px 22px", borderTop: "1px solid rgba(212,175,55,.28)", borderBottom: "1px solid rgba(212,175,55,.28)" }}>
            <span style={{ fontFamily: CG, fontSize: 15, letterSpacing: "0.2em", color: "rgba(245,208,96,.82)" }}>{dateShort}</span>
          </div>
        </div>
      </section>

      {/* INVITATION */}
      <section id="cw-inv" style={{ padding: "30px 22px", background: "#fff", color: "#1a0505", position: "relative", zIndex: 2 }}>
        <div style={{ fontFamily: CG, fontStyle: "italic", fontSize: 22, color: C.red, textAlign: "center", marginBottom: 4 }}>Wedding Invitation</div>
        <div style={{ fontFamily: MS, fontSize: 18, color: C.red, textAlign: "center", marginBottom: 16 }}>喜帖</div>
        <div style={{ textAlign: "center", color: C.gold, fontSize: 12, letterSpacing: 4, margin: "10px 0" }}>✦ ✦ ✦</div>

        <div style={{ textAlign: "center", marginBottom: 12, marginTop: 18 }}>
          {hostNames && (
            <>
              <div style={{ fontFamily: NS, fontSize: 11, color: "#8a5050" }}>双方家长敬邀</div>
              <div style={{ fontFamily: CG, fontSize: 13, color: "#5a2020", marginTop: 4 }}>{hostNames}</div>
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,.3)" }} />
          <span style={{ fontSize: 12, color: C.gold }}>❧</span>
          <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,.3)" }} />
        </div>

        <div style={{ fontFamily: MS, fontSize: 30, color: C.red, textAlign: "center", lineHeight: 1.1, margin: "16px 0 2px" }}>
          {brideName || "陈雅仪"}
        </div>
        <div style={{ textAlign: "center", fontFamily: CG, fontSize: 12, color: "#9a7070", marginBottom: 4 }}>
          {eventName?.split("&")?.[0]?.trim() || "Emily"}
        </div>
        <div style={{ textAlign: "center", fontSize: 20, color: C.gold, margin: "2px 0" }}>❤</div>
        <div style={{ fontFamily: MS, fontSize: 30, color: C.red, textAlign: "center", lineHeight: 1.1, margin: "4px 0 2px" }}>
          {groomName || "李俊明"}
        </div>
        <div style={{ textAlign: "center", fontFamily: CG, fontSize: 12, color: "#9a7070", marginBottom: 20 }}>
          {eventName?.split("&")?.[1]?.trim() || "Alex"}
        </div>

        {/* Bride / Groom tabs */}
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #e0c0c0" }}>
          {(["bride", "groom"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ flex: 1, padding: 10, textAlign: "center", cursor: "pointer", fontFamily: NS, fontSize: 12, border: "none", background: activeTab === tab ? C.red : "#fff", color: activeTab === tab ? C.gold2 : C.red }}
            >
              {tab === "bride" ? `${brideName || "陈雅仪"} · Bride` : `${groomName || "李俊明"} · Groom`}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#fdf5f5", borderRadius: 10, padding: 14, marginTop: 12 }}>
          <div style={{ width: 66, height: 66, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "2px solid rgba(139,0,0,.25)", background: activeTab === "bride" ? "linear-gradient(135deg,#fce4ec,#f8bbd0)" : "linear-gradient(135deg,#e8eaf6,#c5cae9)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 9 }}>
            {activeTab === "bride" ? "bride" : "groom"}
          </div>
          <div>
            <div style={{ fontFamily: MS, fontSize: 20, color: C.red }}>{activeTab === "bride" ? (brideName || "陈雅仪") : (groomName || "李俊明")}</div>
            <div style={{ fontSize: 10, color: C.red3, marginTop: 2 }}>{activeTab === "bride" ? "新娘 · Bride" : "新郎 · Groom"}</div>
            {activeTab === "bride" && brideParent && (
              <div style={{ fontSize: 11, color: "#5a3030", marginTop: 7, fontFamily: NS, lineHeight: 1.5 }}>{brideParent}</div>
            )}
            {activeTab === "groom" && groomParent && (
              <div style={{ fontSize: 11, color: "#5a3030", marginTop: 7, fontFamily: NS, lineHeight: 1.5 }}>{groomParent}</div>
            )}
          </div>
        </div>
      </section>

      {/* VERSE */}
      <section style={{ padding: "30px 22px", background: C.red2, color: C.cream, position: "relative", zIndex: 2 }}>
        <div style={{ background: "rgba(212,175,55,.08)", border: "1px solid rgba(212,175,55,.2)", borderRadius: 14, padding: 22, textAlign: "center" }}>
          <span style={{ fontFamily: MS, fontSize: 36, color: C.gold2, display: "block", marginBottom: 12 }}>言</span>
          <div style={{ fontFamily: NS, fontSize: 13, lineHeight: 2.1, color: C.cream2 }}>
            爱情，是两颗心的默契<br />是相守一生的承诺<br />是永远在彼此身边的温暖
            <br /><em style={{ fontSize: 12, color: "rgba(245,208,96,.5)" }}>— 一生一世</em>
          </div>
        </div>
      </section>

      {/* DATE & COUNTDOWN */}
      <section id="cw-date" style={{ padding: "30px 22px", background: "#fff", color: "#1a0505", position: "relative", zIndex: 2 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: MS, fontSize: 12, color: "#9a7070", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>The Big Day</div>
          <div style={{ fontFamily: CG, fontSize: 40, fontWeight: 400, color: C.red, letterSpacing: "0.04em", lineHeight: 1 }}>{dateShort || "-- / -- / ----"}</div>
          <div style={{ fontFamily: NS, fontSize: 12, color: "#7a5050", marginTop: 6 }}>
            {eventTime || "7:00 PM"}{venue ? ` · ${venue}` : ""}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 14 }}>
          {[
            { val: countdown.d, label: "天 Days" },
            { val: countdown.h, label: "时 Hours" },
            { val: countdown.m, label: "分 Mins" },
            { val: countdown.s, label: "秒 Secs" },
          ].map(box => (
            <div key={box.label} style={{ background: "#fdf5f5", borderRadius: 10, padding: "12px 4px", textAlign: "center", border: "1px solid #f0dada" }}>
              <div style={{ fontFamily: CG, fontSize: 34, fontWeight: 600, color: C.red, lineHeight: 1 }}>{box.val}</div>
              <div style={{ fontSize: 9, color: "#9a7070", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3, fontFamily: NS }}>{box.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* GALLERY */}
      {galleryUrls && galleryUrls.length > 0 && (
        <section style={{ padding: "30px 22px 0", background: "#130202", position: "relative", zIndex: 2 }}>
          <div style={{ fontFamily: MS, fontSize: 20, color: C.gold2, textAlign: "center", marginBottom: 16 }}>相册 Gallery</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 22, WebkitOverflowScrolling: "touch" }}>
            {galleryUrls.map((url, i) => (
              <div key={i} style={{ flexShrink: 0, width: 155, height: 210, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(139,0,0,.2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CALENDAR */}
      {cal && (
        <section style={{ padding: "30px 22px", background: "#130202", color: C.cream, position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,.3)" }} />
            <span style={{ fontSize: 12, color: C.gold }}>婚礼日期</span>
            <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,.3)" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontFamily: MS, fontSize: 20, color: C.gold2 }}>{zhMonths[cal.month]} {cal.year}</span>
              <span style={{ fontFamily: CG, fontSize: 12, color: "rgba(245,208,96,.45)" }}>结婚纪念日 ❤</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
              {zhDays.map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 9, color: "rgba(245,208,96,.4)", padding: "4px 0", fontFamily: NS }}>{d}</div>
              ))}
              {Array.from({ length: cal.firstDay }, (_, i) => (
                <div key={`e${i}`} style={{ opacity: 0.2 }} />
              ))}
              {Array.from({ length: cal.daysInMonth }, (_, i) => {
                const day = i + 1
                const isHighlight = day === cal.day
                return (
                  <div key={day} style={{ textAlign: "center", padding: "6px 2px", fontSize: 12, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1", margin: "auto", background: isHighlight ? C.gold : "transparent", color: isHighlight ? "#130202" : "rgba(245,208,96,.6)", fontWeight: isHighlight ? 700 : 400, position: "relative" }}>
                    {isHighlight && <span style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", fontSize: 10, color: C.gold2 }}>❤</span>}
                    {day}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* LOCATION */}
      <section id="cw-loc" style={{ padding: "30px 22px", background: "#fff", color: "#1a0505", position: "relative", zIndex: 2 }}>
        <div style={{ fontFamily: MS, fontSize: 20, color: C.red, textAlign: "center", marginBottom: 16 }}>婚礼地址</div>
        <div style={{ background: "#fdf5f5", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: MS, fontSize: 18, color: C.red, marginBottom: 4 }}>{venue || "Venue"}</div>
          <div style={{ fontSize: 12, color: "#7a5050", lineHeight: 1.55 }}>{venueAddress}</div>
        </div>
        <div style={{ width: "100%", height: 85, borderRadius: 8, border: "1px solid #e0d0d0", background: "#f5eded", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, fontSize: 10, color: "#9a7070", fontFamily: "monospace" }}>
          map view
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { const q = encodeURIComponent(`${venue ?? ""} ${venueAddress ?? ""}`); window.open(`https://maps.google.com/maps?q=${q}`) }} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: NS, fontSize: 12, fontWeight: 700, background: "#4285F4", color: "#fff" }}>
            📍 Google Maps
          </button>
          <button onClick={() => { const q = encodeURIComponent(`${venue ?? ""} ${venueAddress ?? ""}`); window.open(`https://waze.com/ul?q=${q}`) }} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: NS, fontSize: 12, fontWeight: 700, background: "#00BAFF", color: "#fff" }}>
            🚗 Waze
          </button>
        </div>
      </section>

      {/* RSVP */}
      {rsvpEnabled && (
        <section id="cw-rsvp" style={{ padding: "30px 22px", background: C.red2, color: C.cream, position: "relative", zIndex: 2 }}>
          <div style={{ fontFamily: MS, fontSize: 20, color: C.gold2, textAlign: "center", marginBottom: 16 }}>出席回复 RSVP</div>
          <div style={{ textAlign: "center", color: C.gold, fontSize: 12, letterSpacing: 4, marginBottom: 16 }}>✦ ✦ ✦</div>

          {rsvpDone ? (
            <div style={{ textAlign: "center", padding: "36px 0" }}>
              <div style={{ fontFamily: MS, fontSize: 56, color: C.gold2 }}>囍</div>
              <div style={{ fontFamily: CG, fontStyle: "italic", fontSize: 19, color: C.gold2, marginTop: 8 }}>Thank you!</div>
              <div style={{ fontSize: 12, color: "rgba(245,208,96,.5)", marginTop: 4 }}>We look forward to celebrating with you.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16 }}>
              <input value={rsvpName} onChange={e => setRsvpName(e.target.value)} placeholder="名字 / Your Name *" style={riInput} />
              <input value={rsvpContact} onChange={e => setRsvpContact(e.target.value)} placeholder="联系方式 / Contact No. *" style={riInput} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAttending(true)} style={{ flex: 1, height: 44, border: "1.5px solid rgba(212,175,55,.28)", borderRadius: 9, background: attending === true ? C.gold : "transparent", color: attending === true ? C.dark : "rgba(245,208,96,.7)", cursor: "pointer", fontFamily: NS, fontSize: 12 }}>
                  ✓ 出席 Hadir
                </button>
                <button onClick={() => setAttending(false)} style={{ flex: 1, height: 44, border: "1.5px solid rgba(212,175,55,.28)", borderRadius: 9, background: attending === false ? C.gold : "transparent", color: attending === false ? C.dark : "rgba(245,208,96,.7)", cursor: "pointer", fontFamily: NS, fontSize: 12 }}>
                  ✕ 无法出席
                </button>
              </div>
              {attending && (
                <input type="number" value={rsvpPax} onChange={e => setRsvpPax(parseInt(e.target.value) || 1)} min={1} max={10} placeholder="人数 / No. of Pax" style={riInput} />
              )}
              {rsvpDeadline && (
                <div style={{ fontSize: 11, color: "rgba(245,208,96,.38)", textAlign: "center" }}>
                  RSVP by {new Date(rsvpDeadline).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              )}
              {rsvpError && <p role="alert" style={{ margin: 0, color: "#ffd1c7", fontSize: 12, textAlign: "center" }}>{rsvpError}</p>}
              <button onClick={submitRSVP} style={{ height: 50, background: C.gold, color: C.dark, border: "none", borderRadius: 10, cursor: "pointer", fontFamily: NS, fontSize: 14, fontWeight: 700 }}>
                提交回复 Submit RSVP
              </button>
            </div>
          )}
        </section>
      )}

      {/* FOOTER */}
      <section style={{ textAlign: "center", padding: "44px 20px", background: "linear-gradient(170deg,#130202 0%,#3a0808 100%)", position: "relative", zIndex: 2 }}>
        <span style={{ fontFamily: MS, fontSize: 64, color: C.gold2, opacity: 0.88, display: "block" }}>囍</span>
        <div style={{ fontFamily: CG, fontStyle: "italic", fontSize: 20, color: "rgba(245,208,96,.65)", margin: "8px 0" }}>Thank You · 谢谢</div>
        <div style={{ fontFamily: MS, fontSize: 24, color: C.gold2 }}>{brideName || "Emily"} ❤ {groomName || "Alex"}</div>
        <div style={{ fontFamily: CG, fontSize: 11, color: "rgba(245,208,96,.25)", marginTop: 10, letterSpacing: "0.1em" }}>
          {eventName || "Our Wedding"} · {dateShort}
        </div>
        <div style={{ fontFamily: CG, fontSize: 11, color: "rgba(245,208,96,.2)", marginTop: 6 }}>Made with kamy jemput</div>
      </section>

      {/* BOTTOM NAV */}
      <nav style={{ position: "sticky", bottom: 0, zIndex: 30, padding: "8px 12px 10px", background: "linear-gradient(to top,rgba(19,2,2,.97) 70%,rgba(19,2,2,0))" }}>
        <div style={{ display: "flex", justifyContent: "space-around", background: "rgba(25,4,4,.96)", border: "1px solid rgba(212,175,55,.2)", borderRadius: 40, padding: 7, backdropFilter: "blur(12px)" }}>
          {[
            { id: "cw-cover", icon: "🏠" },
            { id: "cw-date", icon: "📅" },
            { id: "cw-loc", icon: "📍" },
            { id: "cw-rsvp", icon: "✉️" },
          ].map(item => (
            <button key={item.id} onClick={() => scrollTo(item.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 12px", borderRadius: 22, border: "none", cursor: "pointer", background: "transparent", color: "rgba(212,175,55,.45)", fontSize: 19, lineHeight: 1 }}>
              {item.icon}
            </button>
          ))}
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 58, left: "50%", transform: "translateX(-50%)", background: "rgba(212,175,55,.92)", color: "#1a0505", padding: "8px 18px", borderRadius: 20, fontSize: 12, fontWeight: 700, zIndex: 200, whiteSpace: "nowrap", fontFamily: NS }}>
          {toast}
        </div>
      )}
    </div>
  )
}
