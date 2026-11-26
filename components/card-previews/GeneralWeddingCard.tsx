"use client"

import { useState } from "react"
import type { LegacyCardData, RSVPResponse } from "@/lib/types"

interface GeneralWeddingProps extends LegacyCardData {
  cardId?: string
  rsvpResponses?: RSVPResponse[]
}

const C = {
  ivory: "#f8f4ed",
  ivory2: "#f2ede4",
  ivory3: "#ece5d8",
  gold: "#c4a882",
  gold2: "#a8895c",
  gold3: "#d4b896",
  dark: "#1a1208",
  mid: "#5a4a38",
  light: "#9a8878",
  border: "rgba(196,168,130,.3)",
}

const GV = "var(--font-great-vibes), 'Great Vibes', cursive"
const PF = "var(--font-playfair), 'Playfair Display', Georgia, serif"
const DM = "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif"

function buildCalendar(eventDate: string) {
  if (!eventDate) return null
  const d = new Date(eventDate)
  const year = d.getFullYear()
  const month = d.getMonth()
  const day = d.getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = d.toLocaleDateString("en-MY", { month: "long", year: "numeric" })
  return { year, month, day, firstDay, daysInMonth, monthName }
}

export function GeneralWeddingCard({
  eventName, eventDate, eventTime, venue, venueAddress, hostNames,
  coverPhotoUrl, additionalMessage, rsvpEnabled, rsvpDeadline,
  brideName, groomName, program, galleryUrls, contacts,
  cardId, rsvpResponses = [],
}: GeneralWeddingProps) {
  const [toast, setToast] = useState("")
  const [attending, setAttending] = useState<boolean | null>(null)
  const [rsvpDone, setRsvpDone] = useState(false)
  const [rsvpName, setRsvpName] = useState("")
  const [rsvpContact, setRsvpContact] = useState("")
  const [rsvpPax, setRsvpPax] = useState<string>("")
  const [rsvpMsg, setRsvpMsg] = useState("")
  const [rsvpError, setRsvpError] = useState("")

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 2200)
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  const cal = buildCalendar(eventDate)
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : ""

  const dateShort = eventDate
    ? (() => { const d = new Date(eventDate); return `${String(d.getDate()).padStart(2, "0")} · ${String(d.getMonth() + 1).padStart(2, "0")} · ${d.getFullYear()}` })()
    : ""

  const bride = brideName || eventName?.split("&")?.[1]?.trim() || "Agnes"
  const groom = groomName || eventName?.split("&")?.[0]?.trim() || "Alex"
  const brideInitial = bride[0]?.toUpperCase() || "A"
  const groomInitial = groom[0]?.toUpperCase() || "A"

  async function submitRSVP() {
    setRsvpError("")
    if (!rsvpName || !rsvpContact || attending === null) {
      showToast("Please fill in all required fields")
      return
    }
    if (cardId) {
      try {
        const res = await fetch(`/api/rsvp/${cardId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestName: rsvpName, guestContact: rsvpContact, attending, pax: attending ? parseInt(rsvpPax) || 1 : 1, message: rsvpMsg }),
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
    height: 46, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "0 16px", fontFamily: DM, fontSize: 13,
    background: "#fff", color: C.dark, outline: "none", width: "100%",
  }

  return (
    <div style={{ fontFamily: DM, background: C.ivory, color: C.dark, maxWidth: 480, margin: "0 auto", overflowX: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gw-hkb{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.07) translate(-2%,2%)}}
        @keyframes gw-bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(5px)}}
        .gw-hkb{animation:gw-hkb 18s ease-in-out infinite alternate}
        .gw-bounce{animation:gw-bounce 2.4s ease-in-out infinite}
      ` }} />

      {/* HERO */}
      <section id="gw-hero" style={{ position: "relative", minHeight: "100svh", background: C.dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", overflow: "hidden", padding: "0 0 36px" }}>
        {/* Ken-burns background */}
        <div className="gw-hkb" style={{ position: "absolute", inset: 0 }}>
          <div style={{
            width: "100%", height: "100%",
            background: coverPhotoUrl
              ? `url(${coverPhotoUrl}) center/cover no-repeat`
              : "linear-gradient(160deg,#0d0b08 0%,#1e1810 30%,#2a2018 60%,#1a1410 100%)",
            position: "relative",
          }}>
            {/* Architectural silhouette when no photo */}
            {!coverPhotoUrl && (
              <svg style={{ position: "absolute", bottom: "30%", left: "50%", transform: "translateX(-50%)", opacity: 0.08, width: 320 }} viewBox="0 0 320 200" fill="none">
                <path d="M0 200 L0 120 L40 120 L40 80 L60 60 L80 80 L80 120 L100 120 L100 60 L110 40 L120 20 L130 40 L140 60 L140 120 L160 120 L160 60 L170 40 L180 20 L190 40 L200 60 L200 120 L220 120 L220 80 L240 60 L260 80 L260 120 L280 120 L280 80 L320 80 L320 200 Z" fill="rgba(255,255,255,0.06)" />
                <line x1="160" y1="10" x2="160" y2="0" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                <circle cx="160" cy="10" r="4" fill="rgba(196,168,130,0.3)" />
              </svg>
            )}
          </div>
        </div>
        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(26,18,8,.2) 0%,rgba(26,18,8,.5) 50%,rgba(26,18,8,.9) 100%)" }} />

        <div style={{ position: "relative", zIndex: 2, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "0 24px" }}>
          {/* Tag */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid rgba(196,168,130,.4)", color: "rgba(196,168,130,.7)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, fontFamily: DM, marginBottom: 20 }}>
            In Witness Together · {eventDate ? new Date(eventDate).getFullYear() : ""}
          </div>

          {/* Monogram */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: GV, fontSize: 88, lineHeight: 1, color: "#fff", textShadow: "0 2px 30px rgba(196,168,130,.25)", letterSpacing: -4 }}>
              {groomInitial}
              <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 22, color: "rgba(196,168,130,.7)", verticalAlign: "super", margin: "0 -4px" }}>&amp;</span>
              {brideInitial}
            </div>
          </div>

          <div style={{ color: "rgba(196,168,130,.65)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: DM, marginBottom: 16 }}>
            You are cordially invited to the wedding of
          </div>

          {/* Date pill */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, border: "1px solid rgba(196,168,130,.35)", padding: "8px 22px", borderRadius: 40, background: "rgba(196,168,130,.08)", backdropFilter: "blur(8px)" }}>
            <span style={{ fontFamily: PF, fontSize: 13, color: "rgba(196,168,130,.9)", letterSpacing: "0.12em" }}>{dateShort || "-- · -- · ----"}</span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="gw-bounce" style={{ position: "absolute", bottom: 16, left: "50%", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 1, height: 28, background: "linear-gradient(to bottom,rgba(196,168,130,.5),transparent)" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(196,168,130,.35)", textTransform: "uppercase", fontFamily: DM }}>Scroll</span>
        </div>
      </section>

      {/* NAMES */}
      <section id="gw-names" style={{ background: C.ivory, padding: "52px 28px 40px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: GV, fontSize: 68, color: C.dark, lineHeight: 1.05, display: "block" }}>{groom}</span>
        <span style={{ fontFamily: DM, fontSize: 10, color: C.gold2, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 3, display: "block" }}>Groom</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 36, color: C.gold }}>&amp;</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
        <span style={{ fontFamily: GV, fontSize: 68, color: C.dark, lineHeight: 1.05, display: "block" }}>{bride}</span>
        <span style={{ fontFamily: DM, fontSize: 10, color: C.gold2, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 3, display: "block" }}>Bride</span>
        {hostNames && (
          <div style={{ marginTop: 20, fontFamily: DM, fontSize: 12, color: C.light, lineHeight: 1.6 }}>
            Together with our families<br />
            <span style={{ color: C.mid, fontWeight: 600 }}>{hostNames}</span>
          </div>
        )}
      </section>

      {/* QUOTE */}
      <section style={{ background: C.ivory2, padding: "40px 28px", textAlign: "center", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: PF, fontSize: 56, color: C.gold3, lineHeight: 0.5, display: "block", marginBottom: 12 }}>&ldquo;</span>
        <p style={{ fontFamily: PF, fontStyle: "italic", fontSize: 15, color: C.mid, lineHeight: 1.85, maxWidth: 320, margin: "0 auto" }}>
          {additionalMessage || "Every love story is beautiful,\nbut ours is my favourite.\nAlways have, always hope,\nalways promises."}
        </p>
        <div style={{ fontFamily: DM, fontSize: 11, color: C.gold2, marginTop: 14, letterSpacing: "0.1em" }}>
          — A love note
        </div>
        <div style={{ width: 40, height: 1, background: C.gold, margin: "20px auto 0" }} />
      </section>

      {/* WEDDING DETAILS */}
      <section id="gw-details" style={{ background: "#fff", padding: "40px 24px" }}>
        <h2 style={{ fontFamily: PF, fontSize: 26, color: C.dark, textAlign: "center", marginBottom: 6 }}>Wedding Details</h2>
        <div style={{ width: 40, height: 1, background: C.gold, margin: "0 auto 8px" }} />
        <p style={{ fontFamily: DM, fontSize: 11, color: C.light, textAlign: "center", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 28 }}>
          {formattedDate}
        </p>

        {/* Calendar */}
        {cal && (
          <div style={{ background: C.ivory2, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: PF, fontSize: 16, color: C.dark }}>{cal.monthName}</span>
              <span style={{ fontFamily: DM, fontSize: 12, color: C.light }}>Wedding Month</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
              {days.map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 9, color: C.light, padding: "4px 0", fontFamily: DM, letterSpacing: "0.05em" }}>{d}</div>
              ))}
              {Array.from({ length: cal.firstDay }, (_, i) => <div key={`e${i}`} style={{ opacity: 0.2 }} />)}
              {Array.from({ length: cal.daysInMonth }, (_, i) => {
                const day = i + 1
                const isHighlight = day === cal.day
                return (
                  <div key={day} style={{ textAlign: "center", padding: "7px 2px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1", borderRadius: "50%", margin: "auto", fontFamily: DM, background: isHighlight ? C.gold2 : "transparent", color: isHighlight ? "#fff" : C.mid, fontWeight: isHighlight ? 600 : 400 }}>
                    {day}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Time */}
        <div style={{ background: C.ivory2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>🕐</div>
          <div>
            <div style={{ fontFamily: DM, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: C.gold2, marginBottom: 4, fontWeight: 600 }}>Time</div>
            <div style={{ fontFamily: PF, fontSize: 15, color: C.dark, fontWeight: 500 }}>{eventTime || "7:00 PM"}</div>
          </div>
        </div>

        {/* Venue */}
        <div style={{ background: C.ivory2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>📍</div>
          <div>
            <div style={{ fontFamily: DM, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: C.gold2, marginBottom: 4, fontWeight: 600 }}>Venue</div>
            <div style={{ fontFamily: PF, fontSize: 15, color: C.dark, fontWeight: 500 }}>{venue || "—"}</div>
            {venueAddress && <div style={{ fontFamily: DM, fontSize: 12, color: C.light, marginTop: 3, lineHeight: 1.45 }}>{venueAddress}</div>}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ background: C.ivory2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>🗺</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: DM, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: C.gold2, marginBottom: 8, fontWeight: 600 }}>Navigation</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { const q = encodeURIComponent(`${venue ?? ""} ${venueAddress ?? ""}`); window.open(`https://maps.google.com/maps?q=${q}`) }} style={{ flex: 1, height: 34, background: "#4285F4", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontFamily: DM, fontSize: 11, fontWeight: 600 }}>
                Google Maps
              </button>
              <button onClick={() => { const q = encodeURIComponent(`${venue ?? ""} ${venueAddress ?? ""}`); window.open(`https://waze.com/ul?q=${q}`) }} style={{ flex: 1, height: 34, background: "#00BAFF", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontFamily: DM, fontSize: 11, fontWeight: 600 }}>
                Waze
              </button>
            </div>
          </div>
        </div>

        {/* Programme / Timeline */}
        {program && program.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontFamily: PF, fontStyle: "italic", fontSize: 18, color: C.dark, marginBottom: 14, textAlign: "center" }}>Programme</div>
            {program.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "10px 0", borderBottom: i < program.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontFamily: PF, fontSize: 13, color: C.gold2, minWidth: 72, fontStyle: "italic" }}>{item.time}</span>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold3, flexShrink: 0, marginTop: 5 }} />
                <span style={{ fontFamily: DM, fontSize: 13, color: C.mid }}>{item.event}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* COVER PHOTO / Bride portrait */}
      {coverPhotoUrl && (
        <div style={{ width: "100%", height: 260, overflow: "hidden" }}>
          <div className="gw-hkb" style={{ width: "100%", height: "100%", background: `url(${coverPhotoUrl}) center/cover no-repeat` }} />
        </div>
      )}

      {/* RSVP */}
      {rsvpEnabled && (
        <section id="gw-rsvp" style={{ background: C.ivory2, padding: "40px 24px" }}>
          <h2 style={{ fontFamily: GV, fontSize: 48, color: C.dark, textAlign: "center", marginBottom: 6 }}>Join Our Celebration</h2>
          <div style={{ width: 40, height: 1, background: C.gold, margin: "0 auto 12px" }} />
          {rsvpDeadline && (
            <p style={{ textAlign: "center", fontFamily: DM, fontSize: 12, color: C.light, letterSpacing: "0.08em", marginBottom: 6 }}>
              RSVP by {new Date(rsvpDeadline).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          <p style={{ textAlign: "center", fontFamily: PF, fontStyle: "italic", fontSize: 13, color: C.gold2, marginBottom: 24 }}>
            We would love you to be there
          </p>

          {rsvpDone ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <span style={{ fontFamily: GV, fontSize: 64, color: C.gold2, display: "block" }}>Thank You</span>
              <p style={{ fontFamily: PF, fontStyle: "italic", fontSize: 16, color: C.mid, marginTop: 8 }}>We&apos;re so glad you can make it.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input value={rsvpName} onChange={e => setRsvpName(e.target.value)} placeholder="Your Name *" style={inp} />
              <input value={rsvpContact} onChange={e => setRsvpContact(e.target.value)} placeholder="Phone / WhatsApp *" style={inp} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAttending(true)} style={{ flex: 1, height: 44, border: `1.5px solid ${C.border}`, borderRadius: 9, background: attending === true ? C.gold2 : "#fff", color: attending === true ? "#fff" : C.mid, cursor: "pointer", fontFamily: DM, fontSize: 12, fontWeight: 600 }}>
                  ✓ Will Attend
                </button>
                <button onClick={() => setAttending(false)} style={{ flex: 1, height: 44, border: `1.5px solid ${C.border}`, borderRadius: 9, background: attending === false ? C.gold2 : "#fff", color: attending === false ? "#fff" : C.mid, cursor: "pointer", fontFamily: DM, fontSize: 12, fontWeight: 600 }}>
                  ✕ Unable to Attend
                </button>
              </div>
              {attending && (
                <select value={rsvpPax} onChange={e => setRsvpPax(e.target.value)} style={{ ...inp, height: 46, appearance: "none", cursor: "pointer" }}>
                  <option value="">Number of guests (including yourself)</option>
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>)}
                </select>
              )}
              <textarea value={rsvpMsg} onChange={e => setRsvpMsg(e.target.value)} placeholder={`Leave a message for ${eventName || "the couple"} (optional)`} style={{ ...inp, height: 80, padding: "12px 16px", resize: "none", lineHeight: "1.5" }} />
              {rsvpError && <p role="alert" style={{ margin: 0, color: "#a33d4d", fontSize: 12, textAlign: "center" }}>{rsvpError}</p>}
              <button onClick={submitRSVP} style={{ height: 50, background: C.dark, color: C.ivory, border: "none", borderRadius: 10, cursor: "pointer", fontFamily: PF, fontSize: 15, letterSpacing: "0.05em" }}>
                Confirm RSVP →
              </button>
            </div>
          )}
        </section>
      )}

      {/* OUR STORY */}
      <section id="gw-story" style={{ padding: "40px 24px", background: "#fff" }}>
        <h2 style={{ fontFamily: PF, fontSize: 26, color: C.dark, textAlign: "center", marginBottom: 6 }}>Our Story</h2>
        <div style={{ width: 40, height: 1, background: C.gold, margin: "0 auto 16px" }} />
        <div style={{ textAlign: "center", color: C.gold3, fontSize: 14, letterSpacing: 6, marginBottom: 16 }}>✦</div>
        {galleryUrls && galleryUrls.length > 0 ? (
          <div style={{ width: "100%", height: 200, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={galleryUrls[0]} alt="Our story" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ width: "100%", height: 200, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            <div className="gw-hkb" style={{ width: "100%", height: "100%", background: `linear-gradient(135deg,${C.ivory3},${C.ivory2},${C.gold3}22)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 10, color: "rgba(164,140,110,.4)" }}>
              our story photo
            </div>
          </div>
        )}
        <p style={{ fontFamily: PF, fontStyle: "italic", fontSize: 14, color: C.mid, lineHeight: 1.8, textAlign: "center" }}>
          We met by chance, stayed by choice.<br />
          Two people, one story — written in the margins of ordinary days,<br />
          now celebrated in extraordinary ways.
        </p>
      </section>

      {/* CONTACTS */}
      {contacts && contacts.length > 0 && (
        <section id="gw-contacts" style={{ padding: "32px 24px 40px", background: C.ivory2 }}>
          <h2 style={{ fontFamily: PF, fontSize: 26, color: C.dark, textAlign: "center", marginBottom: 6 }}>Any Questions?</h2>
          <div style={{ width: 40, height: 1, background: C.gold, margin: "0 auto 10px" }} />
          <p style={{ textAlign: "center", fontFamily: DM, fontSize: 12, color: C.light, marginBottom: 20 }}>Feel free to reach out to us</p>
          <div style={{ display: "flex", gap: 12 }}>
            {contacts.slice(0, 2).map((ct, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 16px", flex: 1 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${C.border}`, overflow: "hidden", marginBottom: 10, background: C.ivory2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: C.light, fontFamily: "monospace" }}>
                  {ct.role || "contact"}
                </div>
                <span style={{ fontFamily: GV, fontSize: 32, color: C.dark }}>{ct.name}</span>
                <span style={{ fontFamily: DM, fontSize: 10, color: C.gold2, letterSpacing: "0.15em", textTransform: "uppercase", margin: "2px 0 10px" }}>{ct.role}</span>
                <button
                  onClick={() => { showToast(`Calling ${ct.name}…`); window.open(`tel:${ct.phone}`) }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", height: 36, background: C.ivory2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontFamily: DM, fontSize: 12, fontWeight: 600, color: C.mid }}
                >
                  📞 {ct.phone}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <section style={{ textAlign: "center", padding: "44px 24px", background: C.dark }}>
        <span style={{ fontFamily: GV, fontSize: 52, color: C.gold3, display: "block" }}>{eventName || `${groom} & ${bride}`}</span>
        <div style={{ fontFamily: PF, fontStyle: "italic", fontSize: 16, color: "rgba(196,168,130,.6)", margin: "8px 0" }}>Thank You for Coming</div>
        <div style={{ fontFamily: DM, fontSize: 11, color: "rgba(196,168,130,.3)", letterSpacing: "0.15em" }}>
          {dateShort}{venue ? ` · ${venue.toUpperCase()}` : ""}
        </div>
        <div style={{ fontFamily: DM, fontSize: 11, color: "rgba(196,168,130,.2)", marginTop: 8 }}>Made with kamy jemput</div>
      </section>

      {/* BOTTOM NAV */}
      <nav style={{ position: "sticky", bottom: 0, zIndex: 30, padding: "8px 14px 10px", background: `linear-gradient(to top,rgba(248,244,237,.98) 60%,rgba(248,244,237,0))` }}>
        <div style={{ display: "flex", justifyContent: "space-around", background: "rgba(255,255,255,.95)", border: `1px solid ${C.border}`, borderRadius: 40, padding: 7, boxShadow: "0 2px 16px rgba(0,0,0,.08)" }}>
          {[
            { id: "gw-hero", icon: "🏠" },
            { id: "gw-details", icon: "📅" },
            { id: "gw-rsvp", icon: "✉️" },
            { id: "gw-story", icon: "❤️" },
            { id: "gw-contacts", icon: "📞" },
          ].map(item => (
            <button key={item.id} onClick={() => scrollTo(item.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 12px", borderRadius: 22, border: "none", cursor: "pointer", background: "transparent", color: C.light, fontSize: 18, lineHeight: 1 }}>
              {item.icon}
            </button>
          ))}
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 58, left: "50%", transform: "translateX(-50%)", background: "rgba(26,18,8,.9)", color: C.ivory, padding: "8px 18px", borderRadius: 20, fontSize: 12, fontWeight: 600, zIndex: 200, whiteSpace: "nowrap", fontFamily: DM, backdropFilter: "blur(8px)" }}>
          {toast}
        </div>
      )}
    </div>
  )
}
