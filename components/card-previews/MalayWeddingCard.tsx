"use client"

import { useState } from "react"
import type { LegacyCardData, RSVPResponse } from "@/lib/types"

interface MalayWeddingProps extends LegacyCardData {
  cardId?: string
  rsvpResponses?: RSVPResponse[]
}

const C = {
  rose: "#f0e6e8",
  sage: "#7a9e7e",
  sage2: "#5f8263",
  gold: "#c9984a",
  gold2: "#a87838",
  gold3: "#e8c878",
  dark: "#3d2c1e",
  mid: "#6a4f3a",
  light: "#9a7a68",
  cream: "#fdf6f0",
}

const PF = "var(--font-playfair), 'Playfair Display', Georgia, serif"
const JK = "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif"

function FloralStrip() {
  return (
    <div style={{ background: C.sage, padding: "10px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      {["🌸", "🌿", "🌺", "🌿", "🌸", "🌿", "🌺"].map((e, i) => (
        <span key={i} className="mw-fc" style={{ fontSize: 15 }}>{e}</span>
      ))}
    </div>
  )
}

function SectionDivider() {
  return <div style={{ height: 1, background: "linear-gradient(to right,transparent,rgba(201,152,74,.3),transparent)", margin: "0 24px" }} />
}

function GoldHeader({ title }: { title: string }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 24px 0" }}>
      <div style={{ fontFamily: PF, fontSize: 15, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500 }}>
        {title}
      </div>
      <div style={{ color: C.gold, fontSize: 13, opacity: 0.5, letterSpacing: 4, margin: "6px 0 0" }}>✦</div>
    </div>
  )
}

export function MalayWeddingCard({
  eventName, eventDate, eventTime, venue, venueAddress, hostNames,
  coverPhotoUrl, additionalMessage, rsvpEnabled, rsvpDeadline,
  brideName, groomName, program, galleryUrls, contacts,
  cardId, rsvpResponses = [],
}: MalayWeddingProps) {
  const [toast, setToast] = useState("")
  const [attending, setAttending] = useState<boolean | null>(null)
  const [rsvpDone, setRsvpDone] = useState(false)
  const [rsvpName, setRsvpName] = useState("")
  const [rsvpContact, setRsvpContact] = useState("")
  const [rsvpPax, setRsvpPax] = useState(1)
  const [rsvpMsg, setRsvpMsg] = useState("")
  const [rsvpError, setRsvpError] = useState("")

  const bInit = (brideName || eventName?.split("&")?.[0]?.trim() || "F")[0].toUpperCase()
  const gInit = (groomName || eventName?.split("&")?.[1]?.trim() || "A")[0].toUpperCase()

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("ms-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : ""
  const dateShort = eventDate
    ? (() => { const d = new Date(eventDate); return `${d.getDate()} · ${d.getMonth() + 1} · ${d.getFullYear()}` })()
    : ""

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 2200)
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  async function submitRSVP() {
    setRsvpError("")
    if (!rsvpName || !rsvpContact || attending === null) {
      showToast("Sila lengkapkan semua maklumat")
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

  const inp: React.CSSProperties = {
    height: 44, border: "1px solid rgba(201,152,74,.3)", borderRadius: 8,
    padding: "0 14px", fontFamily: JK, fontSize: 13,
    background: "rgba(255,255,255,.8)", color: C.dark, outline: "none", width: "100%",
  }

  return (
    <div style={{ fontFamily: JK, background: C.rose, color: C.dark, maxWidth: 480, margin: "0 auto", overflowX: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes mw-sway{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-3px) rotate(5deg)}}
        @keyframes mw-crop{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.06) translate(-2%,1%)}}
        .mw-fc{display:inline-block;animation:mw-sway 3s ease-in-out infinite}
        .mw-fc:nth-child(2){animation-delay:.4s}.mw-fc:nth-child(3){animation-delay:.8s}
        .mw-fc:nth-child(4){animation-delay:1.2s}.mw-fc:nth-child(5){animation-delay:1.6s}
        .mw-fc:nth-child(6){animation-delay:.2s}.mw-fc:nth-child(7){animation-delay:.6s}
        .mw-crop{animation:mw-crop 14s ease-in-out infinite alternate}
      ` }} />

      {/* Floral top border */}
      <div style={{ width: "100%", lineHeight: 0 }}>
        <svg viewBox="0 0 480 60" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%" }}>
          <rect width="480" height="60" fill="#7a9e7e" />
          <ellipse cx="40" cy="55" rx="28" ry="20" fill="#5f8263" opacity=".6" />
          <ellipse cx="80" cy="50" rx="22" ry="16" fill="#5f8263" opacity=".5" />
          <ellipse cx="120" cy="55" rx="26" ry="18" fill="#5f8263" opacity=".7" />
          <ellipse cx="160" cy="52" rx="20" ry="14" fill="#5f8263" opacity=".55" />
          <ellipse cx="200" cy="56" rx="24" ry="16" fill="#5f8263" opacity=".6" />
          <ellipse cx="240" cy="50" rx="28" ry="20" fill="#5f8263" opacity=".5" />
          <ellipse cx="280" cy="54" rx="22" ry="15" fill="#5f8263" opacity=".65" />
          <ellipse cx="320" cy="52" rx="26" ry="18" fill="#5f8263" opacity=".55" />
          <ellipse cx="360" cy="56" rx="20" ry="14" fill="#5f8263" opacity=".6" />
          <ellipse cx="400" cy="50" rx="24" ry="16" fill="#5f8263" opacity=".5" />
          <ellipse cx="440" cy="54" rx="28" ry="20" fill="#5f8263" opacity=".65" />
          <circle cx="30" cy="40" r="5" fill="#f48fb1" opacity=".7" />
          <circle cx="55" cy="36" r="4" fill="#ff8a80" opacity=".6" />
          <circle cx="90" cy="42" r="6" fill="#f06292" opacity=".65" />
          <circle cx="130" cy="38" r="4" fill="#f48fb1" opacity=".55" />
          <circle cx="170" cy="43" r="5" fill="#ce93d8" opacity=".6" />
          <circle cx="210" cy="37" r="6" fill="#f48fb1" opacity=".65" />
          <circle cx="250" cy="42" r="4" fill="#ff8a80" opacity=".55" />
          <circle cx="290" cy="38" r="5" fill="#f06292" opacity=".6" />
          <circle cx="330" cy="43" r="6" fill="#f48fb1" opacity=".65" />
          <circle cx="370" cy="37" r="4" fill="#ce93d8" opacity=".55" />
          <circle cx="410" cy="42" r="5" fill="#ff8a80" opacity=".6" />
          <circle cx="450" cy="38" r="6" fill="#f48fb1" opacity=".65" />
          <circle cx="45" cy="32" r="3" fill="white" opacity=".4" />
          <circle cx="108" cy="30" r="2.5" fill="white" opacity=".35" />
          <circle cx="195" cy="30" r="3" fill="white" opacity=".4" />
          <circle cx="265" cy="33" r="2.5" fill="white" opacity=".35" />
          <circle cx="350" cy="30" r="3" fill="white" opacity=".4" />
          <circle cx="435" cy="32" r="2.5" fill="white" opacity=".35" />
          <path d="M20 60 Q30 40 40 30" stroke="#4a6e4e" strokeWidth="2" fill="none" opacity=".5" />
          <path d="M70 60 Q85 45 95 28" stroke="#4a6e4e" strokeWidth="2" fill="none" opacity=".45" />
          <path d="M150 60 Q160 42 175 25" stroke="#4a6e4e" strokeWidth="2" fill="none" opacity=".5" />
          <path d="M230 60 Q242 44 255 26" stroke="#4a6e4e" strokeWidth="2" fill="none" opacity=".45" />
          <path d="M310 60 Q322 43 338 25" stroke="#4a6e4e" strokeWidth="2" fill="none" opacity=".5" />
          <path d="M390 60 Q403 44 418 27" stroke="#4a6e4e" strokeWidth="2" fill="none" opacity=".45" />
        </svg>
      </div>

      {/* Cover */}
      <section id="mw-cover" style={{ background: C.cream, padding: "36px 28px 32px", textAlign: "center" }}>
        <div style={{ fontFamily: JK, fontSize: 10, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: C.sage, marginBottom: 10 }}>
          Majlis Perkahwinan
        </div>

        {/* Monogram frame */}
        <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, border: "1.5px solid rgba(201,152,74,.35)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", inset: 6, border: "1px solid rgba(201,152,74,.2)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", inset: -8, border: "1px dashed rgba(201,152,74,.2)", borderRadius: "50%" }} />
          {[
            { top: -4, left: 16, rotate: "-30deg" },
            { top: -4, right: 16, rotate: "30deg" },
            { bottom: -4, left: 16, rotate: "30deg" },
            { bottom: -4, right: 16, rotate: "-30deg" },
          ].map((pos, i) => (
            <span key={i} style={{ position: "absolute", fontSize: 14, color: "rgba(201,152,74,.5)", lineHeight: 1, transform: `rotate(${pos.rotate})`, ...pos }}>
              ✿
            </span>
          ))}
          <div style={{ fontFamily: PF, fontSize: 68, fontWeight: 700, color: C.gold, lineHeight: 1, letterSpacing: -4, position: "relative", zIndex: 1, textShadow: "0 2px 8px rgba(201,152,74,.2)" }}>
            {bInit}{gInit}
          </div>
        </div>

        <div style={{ fontFamily: PF, fontSize: 22, fontWeight: 500, color: C.gold, letterSpacing: "0.04em", margin: "6px 0" }}>
          {eventName || "Nama Pasangan"}
        </div>
        <div style={{ fontFamily: JK, fontSize: 13, color: C.light, letterSpacing: "0.1em", marginTop: 4 }}>
          {dateShort}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(201,152,74,.3)" }} />
          <span style={{ color: C.gold, fontSize: 12, opacity: 0.6 }}>✦ ✦ ✦</span>
          <div style={{ flex: 1, height: 1, background: "rgba(201,152,74,.3)" }} />
        </div>
      </section>

      <FloralStrip />

      {/* Bismillah quote */}
      <section style={{ background: C.rose, padding: "28px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 16, color: C.light, marginBottom: 8, direction: "rtl", fontFamily: "serif" }}>
          بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
        </div>
        <p style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: C.mid, lineHeight: 1.75 }}>
          &ldquo;Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu isteri-isteri dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya.&rdquo;
        </p>
        <div style={{ fontFamily: JK, fontSize: 11, color: C.sage2, marginTop: 6, fontWeight: 600, letterSpacing: "0.05em" }}>
          — Quran (30:21)
        </div>
      </section>

      {/* Couple photo */}
      <div style={{ width: "100%", overflow: "hidden" }}>
        <div
          className="mw-crop"
          style={{
            width: "100%", height: 260,
            background: coverPhotoUrl ? `url(${coverPhotoUrl}) center/cover no-repeat` : "linear-gradient(160deg,#d4c8b8 0%,#b8a898 40%,#a09080 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {!coverPhotoUrl && <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(90,70,50,.3)" }}>Foto Pasangan</span>}
        </div>
      </div>

      <FloralStrip />

      {/* Main content */}
      <div id="mw-details" style={{ background: C.cream }}>

        {/* Invitation text */}
        <div style={{ textAlign: "center", padding: "28px 24px 0" }}>
          <div style={{ fontFamily: JK, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.sage, marginBottom: 6 }}>
            Dengan penuh kegembiraan
          </div>
          <div style={{ color: C.gold, fontSize: 13, opacity: 0.5, letterSpacing: 4 }}>✦ ✦ ✦</div>
        </div>
        <div style={{ padding: "16px 28px 24px", textAlign: "center" }}>
          {hostNames && (
            <div style={{ fontFamily: PF, fontSize: 14, fontWeight: 500, color: C.dark, marginBottom: 10, lineHeight: 1.5 }}>
              {hostNames}
            </div>
          )}
          <div style={{ fontFamily: JK, fontSize: 12, color: C.light, lineHeight: 1.7, marginBottom: 16 }}>
            Dengan penuh kegembiraan, seluruh keluarga menjemput<br />
            Dato&apos; | Datin | Tuan | Puan | Encik | Cik<br />
            serta keluarga hadir ke majlis perkahwinan kami
          </div>
          <div style={{ fontFamily: PF, fontSize: 26, fontWeight: 500, color: C.gold, margin: "4px 0" }}>
            {eventName || "Nama Pasangan"}
          </div>
          {additionalMessage && (
            <p style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: C.mid, marginTop: 12, lineHeight: 1.7 }}>
              &ldquo;{additionalMessage}&rdquo;
            </p>
          )}
        </div>

        <SectionDivider />

        {/* Butiran Majlis */}
        <GoldHeader title="Butiran Majlis" />
        <div style={{ padding: "14px 24px 20px" }}>
          {[
            { label: "Tarikh", value: formattedDate },
            { label: "Tempat", value: venue, sub: venueAddress },
            ...(eventTime ? [{ label: "Masa", value: eventTime }] : []),
          ].map((row, i, arr) => (
            <div key={row.label}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: JK, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.sage, marginBottom: 4 }}>{row.label}</div>
                <div style={{ fontFamily: PF, fontSize: 16, color: C.dark, fontWeight: 500, lineHeight: 1.2 }}>{row.value || "—"}</div>
                {row.sub && <div style={{ fontFamily: JK, fontSize: 12, color: C.mid, marginTop: 2 }}>{row.sub}</div>}
              </div>
              {i < arr.length - 1 && <div style={{ height: 1, background: "rgba(201,152,74,.18)", margin: "0 0 14px" }} />}
            </div>
          ))}
        </div>

        {/* Program */}
        {program && program.length > 0 && (
          <>
            <SectionDivider />
            <GoldHeader title="Aturdacara Majlis" />
            <div style={{ padding: "14px 24px 20px" }}>
              {program.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "8px 0", borderBottom: i < program.length - 1 ? "1px solid rgba(201,152,74,.12)" : "none" }}>
                  <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: C.gold2, minWidth: 90, flexShrink: 0 }}>{item.time}</span>
                  <span style={{ fontFamily: JK, fontSize: 13, color: C.mid }}>{item.event}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Gallery */}
        {galleryUrls && galleryUrls.length > 0 && (
          <>
            <SectionDivider />
            <GoldHeader title="Galeri" />
            <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "14px 24px 20px", WebkitOverflowScrolling: "touch" }}>
              {galleryUrls.map((url, i) => (
                <div key={i} style={{ flexShrink: 0, width: 140, height: 180, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(201,152,74,.2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Galeri ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          </>
        )}

        <SectionDivider />

        {/* Lokasi */}
        <GoldHeader title="Lokasi" />
        <div id="mw-lokasi" style={{ padding: "14px 24px 24px" }}>
          {venue && <div style={{ fontFamily: PF, fontSize: 18, fontWeight: 500, color: C.dark, marginBottom: 4 }}>{venue}</div>}
          {venueAddress && <div style={{ fontFamily: JK, fontSize: 12, color: C.light, lineHeight: 1.5, marginBottom: 14 }}>{venueAddress}</div>}
          <div style={{ width: "100%", height: 80, borderRadius: 10, border: "1px solid rgba(201,152,74,.2)", background: "#ede8e0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(90,70,50,.3)" }}>Paparan Peta</span>
          </div>
          <button
            onClick={() => { const q = encodeURIComponent(`${venue ?? ""} ${venueAddress ?? ""}`); window.open(`https://waze.com/ul?q=${q}`) }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 44, background: "#00BAFF", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: JK, fontSize: 13, fontWeight: 700, marginBottom: 8 }}
          >
            🚗&nbsp; Buka dengan Waze
          </button>
          <button
            onClick={() => { const q = encodeURIComponent(`${venue ?? ""} ${venueAddress ?? ""}`); window.open(`https://maps.google.com/maps?q=${q}`) }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 40, background: "transparent", color: C.sage2, border: "1px solid rgba(95,130,99,.35)", borderRadius: 10, cursor: "pointer", fontFamily: JK, fontSize: 12, fontWeight: 600 }}
          >
            📍 Google Maps
          </button>
          {eventDate && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={() => { const q = encodeURIComponent(eventName ?? ""); const d = eventDate.replace(/-/g, ""); window.open(`https://www.google.com/calendar/render?action=TEMPLATE&text=${q}&dates=${d}/${d}`) }}
                style={{ flex: 1, height: 36, background: "transparent", border: "1px solid rgba(201,152,74,.3)", borderRadius: 8, cursor: "pointer", fontFamily: JK, fontSize: 11, fontWeight: 600, color: C.gold2 }}
              >
                📅 Google Calendar
              </button>
              <button
                onClick={() => showToast("Membuka Apple Calendar…")}
                style={{ flex: 1, height: 36, background: "transparent", border: "1px solid rgba(201,152,74,.3)", borderRadius: 8, cursor: "pointer", fontFamily: JK, fontSize: 11, fontWeight: 600, color: C.gold2 }}
              >
                📅 Apple Calendar
              </button>
            </div>
          )}
        </div>

        {/* Contacts */}
        {contacts && contacts.length > 0 && (
          <>
            <SectionDivider />
            <GoldHeader title="Hubungi" />
            <div id="mw-contacts" style={{ padding: "14px 24px 24px" }}>
              <div style={{ fontFamily: JK, fontSize: 12, color: C.light, textAlign: "center", marginBottom: 14 }}>
                Bagi sebarang pertanyaan, sila hubungi:
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {contacts.slice(0, 2).map((ct, i) => (
                  <button
                    key={i}
                    onClick={() => { showToast(`Menghubungi ${ct.name}…`); window.open(`tel:${ct.phone}`) }}
                    style={{
                      flex: 1, minWidth: "45%", height: 48, border: "none", borderRadius: 10, cursor: "pointer",
                      fontFamily: JK, fontSize: 13, fontWeight: 700, color: "#fff",
                      background: i === 0 ? "linear-gradient(135deg,#d4a0b0,#c48898)" : "linear-gradient(135deg,#c9984a,#a87838)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    📞 {ct.name} · {ct.phone}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* RSVP */}
        {rsvpEnabled && (
          <>
            <SectionDivider />
            <GoldHeader title="Maklumbalas" />
            <div id="mw-rsvp" style={{ padding: "14px 24px 28px" }}>
              {rsvpDeadline && (
                <div style={{ textAlign: "center", marginBottom: 18 }}>
                  <div style={{ fontFamily: JK, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.sage, marginBottom: 4 }}>
                    Sila balas kehadiran sebelum
                  </div>
                  <div style={{ fontFamily: PF, fontSize: 20, fontWeight: 500, color: C.gold }}>
                    {new Date(rsvpDeadline).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
              )}

              {rsvpDone ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <span style={{ fontSize: 44, display: "block", marginBottom: 10 }}>🌺</span>
                  <div style={{ fontFamily: PF, fontSize: 22, color: C.gold, marginBottom: 4 }}>Terima Kasih!</div>
                  <div style={{ fontFamily: JK, fontSize: 13, color: C.light }}>
                    Maklumbalas anda telah direkodkan.<br />Kami menantikan kehadiran anda.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input value={rsvpName} onChange={e => setRsvpName(e.target.value)} placeholder="Nama Penuh *" style={inp} />
                  <input value={rsvpContact} onChange={e => setRsvpContact(e.target.value)} placeholder="Nombor Telefon *" style={inp} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setAttending(true)} style={{ flex: 1, height: 44, border: "1.5px solid rgba(201,152,74,.3)", borderRadius: 9, background: attending === true ? C.sage2 : "rgba(255,255,255,.7)", color: attending === true ? "#fff" : C.mid, cursor: "pointer", fontFamily: JK, fontSize: 12, fontWeight: 600 }}>
                      ✓ Hadir
                    </button>
                    <button onClick={() => setAttending(false)} style={{ flex: 1, height: 44, border: "1.5px solid rgba(201,152,74,.3)", borderRadius: 9, background: attending === false ? "#d4b8bc" : "rgba(255,255,255,.7)", color: attending === false ? "#fff" : C.mid, cursor: "pointer", fontFamily: JK, fontSize: 12, fontWeight: 600 }}>
                      ✕ Tidak Hadir
                    </button>
                  </div>
                  {attending && (
                    <input type="number" value={rsvpPax} onChange={e => setRsvpPax(parseInt(e.target.value) || 1)} min={1} max={10} placeholder="Bilangan tetamu" style={inp} />
                  )}
                  <textarea value={rsvpMsg} onChange={e => setRsvpMsg(e.target.value)} placeholder={`Ucapan untuk ${eventName || "pengantin"} (pilihan)`} style={{ ...inp, height: 80, padding: "12px 14px", resize: "none", lineHeight: "1.5" }} />
                  {rsvpError && <p role="alert" style={{ margin: 0, color: "#a33d4d", fontSize: 12 }}>{rsvpError}</p>}
                  <button onClick={submitRSVP} style={{ height: 50, background: C.gold, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: JK, fontSize: 14, fontWeight: 700, letterSpacing: "0.04em" }}>
                    Hantar Maklumbalas →
                  </button>
                  <div style={{ textAlign: "center", fontSize: 11, color: C.light }}>Terima kasih kerana sudi menjawab 🌸</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Floral bottom */}
      <FloralStrip />
      <div style={{ width: "100%", lineHeight: 0, transform: "rotate(180deg)" }}>
        <svg viewBox="0 0 480 40" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%" }}>
          <rect width="480" height="40" fill="#7a9e7e" />
          <ellipse cx="40" cy="10" rx="28" ry="16" fill="#5f8263" opacity=".55" />
          <ellipse cx="120" cy="8" rx="24" ry="14" fill="#5f8263" opacity=".6" />
          <ellipse cx="200" cy="10" rx="26" ry="16" fill="#5f8263" opacity=".5" />
          <ellipse cx="280" cy="8" rx="22" ry="14" fill="#5f8263" opacity=".6" />
          <ellipse cx="360" cy="10" rx="24" ry="15" fill="#5f8263" opacity=".55" />
          <ellipse cx="440" cy="8" rx="26" ry="14" fill="#5f8263" opacity=".5" />
          <circle cx="40" cy="4" r="5" fill="#f48fb1" opacity=".65" />
          <circle cx="120" cy="3" r="4" fill="#ff8a80" opacity=".6" />
          <circle cx="200" cy="5" r="6" fill="#f48fb1" opacity=".65" />
          <circle cx="280" cy="3" r="4" fill="#ce93d8" opacity=".55" />
          <circle cx="360" cy="4" r="5" fill="#ff8a80" opacity=".6" />
          <circle cx="440" cy="3" r="6" fill="#f48fb1" opacity=".65" />
        </svg>
      </div>

      {/* Footer */}
      <section style={{ textAlign: "center", padding: "40px 24px", background: C.sage, color: "#fff" }}>
        <span style={{ fontSize: 32, marginBottom: 8, display: "block" }}>🌸</span>
        <div style={{ fontFamily: PF, fontStyle: "italic", fontSize: 20, color: "rgba(255,255,255,.85)", marginBottom: 4 }}>Terima Kasih Kerana Hadir</div>
        <div style={{ fontFamily: PF, fontSize: 26, fontWeight: 500, color: C.gold3, marginBottom: 8 }}>{eventName || "Pasangan Pengantin"}</div>
        {dateShort && (
          <div style={{ fontFamily: JK, fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "0.15em" }}>
            {dateShort}{venue ? ` · ${venue.toUpperCase()}` : ""}
          </div>
        )}
        <div style={{ fontFamily: JK, fontSize: 10, color: "rgba(255,255,255,.25)", letterSpacing: "0.1em", marginTop: 6 }}>Made with kamy jemput</div>
      </section>

      {/* Sticky bottom nav */}
      <nav style={{ position: "sticky", bottom: 0, zIndex: 30, padding: "8px 12px 10px", background: "linear-gradient(to top,rgba(240,230,232,.98) 60%,rgba(240,230,232,0))" }}>
        <div style={{ display: "flex", justifyContent: "space-around", background: "rgba(255,255,255,.95)", border: "1px solid rgba(201,152,74,.2)", borderRadius: 40, padding: 7, boxShadow: "0 2px 16px rgba(61,44,30,.1)" }}>
          {[
            { id: "mw-cover", label: "🏠" },
            { id: "mw-details", label: "📋" },
            { id: "mw-lokasi", label: "📍" },
            { id: "mw-contacts", label: "📞" },
            { id: "mw-rsvp", label: "✉️" },
          ].map(item => (
            <button key={item.id} onClick={() => scrollTo(item.id)} style={{ padding: "6px 12px", borderRadius: 22, border: "none", cursor: "pointer", background: "transparent", color: C.light, fontSize: 18, lineHeight: 1 }}>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 58, left: "50%", transform: "translateX(-50%)", background: "rgba(61,44,30,.9)", color: C.cream, padding: "8px 18px", borderRadius: 20, fontSize: 12, fontWeight: 600, zIndex: 200, whiteSpace: "nowrap", fontFamily: JK, backdropFilter: "blur(8px)" }}>
          {toast}
        </div>
      )}
    </div>
  )
}
