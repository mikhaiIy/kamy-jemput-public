// One-off dev seeder: upserts the `celestial-story` template row via the
// Supabase REST API with the service-role key. Mirrors migration
// 014_seed_celestial_story_template.sql exactly — use this when the remote
// migration history is out of sync and a full `supabase db push` is unsafe
// (see docs/DESIGN_CELESTIAL_STORY.md).
//
//   node scripts/seed-celestial-story.mjs
import { readFileSync } from "node:fs"

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
)

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE || !KEY) throw new Error("Missing Supabase env vars in .env.local")

const row = {
  id: "celestial-story",
  name: "Celestial Story",
  category: "wedding",
  price_myr: 13900,
  is_active: true,
  type: "wedding_general",
  theme: {
    palette: "plum_gold",
    preset: "midnight_celestial",
    colors: {
      bg: "#101528",
      text: "#eae4d6",
      accent: "#e8c97e",
      gold: "#c9a96a",
      muted: "#8d97b8",
      border: "rgba(232,201,126,0.22)",
      card: "#171f3a",
      divider: "✦",
      opening: "Written in the stars",
    },
    fonts: { display: "--font-cormorant", body: "--font-jakarta", script: "--font-great-vibes" },
    animation: "fade",
    background: { kind: "solid", value: "#101528" },
  },
  sections: [
    // Dusk · the sky is sealed; the guest taps to light the stars
    { type: "landing", variant: "celestial_gate", enabled: true, order: 0, data: { headline: "Zara & Iskandar", subhead: "Together with their families", tagline: "Written in the Stars", coverPhotoUrl: "", eventDate: "" } },
    // Nightfall · the invitation
    { type: "welcome", variant: "card_centered", enabled: true, order: 1, data: { greeting: "Di Bawah Satu Langit", body: "With hearts as full as the moon, Encik Hakim & Puan Sofia and Encik Rahman & Puan Zainab invite you to an evening beneath the stars — the wedding of their children." } },
    { type: "quote", variant: "centered", enabled: true, order: 2, data: { text: "Every love story is written in the stars — ours is my favourite constellation.", attribution: "" } },
    // Midnight · their constellation
    { type: "love_story", variant: "constellation", enabled: true, order: 3, data: {
      title: "Buruj Kita",
      intro: "the constellation of us",
      moments: [
        { label: "The First Light", text: "Two strangers under the same sky.\nOne look, and the night was never dark again.", photoUrl: "" },
        { label: "Orbits Aligned", text: "Different paths, one gravity.\nEvery turn kept pulling us closer.", photoUrl: "" },
        { label: "One Sky, Forever", text: "He asked beneath a sky full of stars.\nShe said yes before the next one fell.", photoUrl: "" },
      ],
      signature: "Zara & Iskandar",
    } },
    { type: "gallery", variant: "designer", enabled: true, order: 4, data: {
      title: "Stardust",
      intro: "our night, in pictures",
      blocks: [
        { layout: "carousel", design: "gallery_wall", photos: ["", "", ""], caption: "" },
        { layout: "duo", design: "corner_tabs", photos: ["", ""], caption: "stardust & laughter" },
      ],
    } },
    // The night itself · details
    { type: "event_info", variant: "card_stack", enabled: true, order: 5, data: { eventName: "Majlis Resepsi", date: "", time: "20:00", venue: "The Glasshouse at Seputeh", address: "Jalan Bukit Seputeh, 58000 Kuala Lumpur" } },
    { type: "countdown", variant: "lunar_phases", enabled: true, order: 6, data: { label: "Menanti Bulan Penuh", targetDate: "" } },
    { type: "calendar", variant: "month_grid", enabled: true, order: 7, data: { titleOverride: "Save Our Date", eventName: "Majlis Resepsi", startsAt: "" } },
    { type: "program", variant: "timeline", enabled: true, order: 8, data: { items: [
      { time: "7:30 PM", event: "Guest Arrival" },
      { time: "8:00 PM", event: "Dinner Under the Stars" },
      { time: "9:30 PM", event: "First Dance" },
      { time: "10:30 PM", event: "Sky Lanterns & Farewell" },
    ] } },
    { type: "dress_code", variant: "swatch", enabled: true, order: 9, data: { theme: "Midnight Formal", note: "Deep blues, blacks & a touch of gold", swatchHex: "#16204a" } },
    { type: "map", variant: "button_row", enabled: true, order: 10, data: { address: "Jalan Bukit Seputeh, 58000 Kuala Lumpur", wazeUrl: "", gmapsUrl: "", grabUrl: "" } },
    { type: "contact", variant: "list", enabled: true, order: 11, data: { items: [
      { name: "Iskandar", phone: "+60 12-345 6789", role: "Groom" },
      { name: "Zara", phone: "+60 11-234 5678", role: "Bride" },
    ] } },
    // Before dawn · answer the sky (inheritTheme keeps the RSVP in the night palette)
    { type: "rsvp", variant: "romance_envelope", enabled: true, order: 12, data: { deadline: "", askPax: true, askDietary: false, inheritTheme: true } },
    { type: "guestbook", variant: "wishes_wall", enabled: true, order: 13, data: { allowPublic: true, title: "Lampu-Lampu Langit", prompt: "Leave a little light in our sky — a wish for the couple." } },
    // First light · thank you
    { type: "thank_you", variant: "card", enabled: true, order: 14, data: { message: "From dusk to dawn, our brightest night is the one we share with you. Terima kasih kerana menjadi bintang di langit kami." } },
  ],
}

const res = await fetch(`${URL_BASE}/rest/v1/templates?on_conflict=id`, {
  method: "POST",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify([row]),
})

const body = await res.text()
if (!res.ok) {
  console.error("Upsert failed:", res.status, body)
  process.exit(1)
}
const saved = JSON.parse(body)[0]
console.log("Upserted template:", saved.id, "| active:", saved.is_active, "| sections:", saved.sections.length)
