// One-off dev seeder: upserts the `cinema-story` template row via the
// Supabase REST API with the service-role key. Mirrors migration
// 015_seed_cinema_story_template.sql exactly — use this when the remote
// migration history is out of sync and a full `supabase db push` is unsafe
// (see docs/DESIGN_CINEMA_STORY.md).
//
//   node scripts/seed-cinema-story.mjs
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
  id: "cinema-story",
  name: "Cinema Story",
  category: "wedding",
  price_myr: 14900,
  is_active: true,
  type: "wedding_general",
  theme: {
    palette: "minimal_ink",
    preset: "editorial_cinema",
    colors: {
      bg: "#fafaf9",
      text: "#1a1a1a",
      accent: "#0d0d0d",
      gold: "#b8a070",
      muted: "#888880",
      border: "rgba(13,13,13,0.14)",
      card: "#f5f4f2",
      divider: "✳",
      opening: "A Wedding Production",
    },
    fonts: { display: "--font-bodoni", body: "--font-jakarta", script: "--font-bodoni" },
    animation: "fade",
    background: { kind: "solid", value: "#fafaf9" },
  },
  sections: [
    // Opening title card · the guest taps ▶ to start the screening
    { type: "landing", variant: "premiere_gate", enabled: true, order: 0, data: { headline: "Amira & Daniel", subhead: "Directed by Fate · Produced by Love", tagline: "Our Love Story", coverPhotoUrl: "", eventDate: "" } },
    // Episode 01 · A Joyful Invitation
    { type: "welcome", variant: "card_centered", enabled: true, order: 1, data: { greeting: "A Joyful Invitation", body: "Together with their families, Encik Farid & Puan Laila and Mr Tan & Mrs Mei, we joyfully invite you to the first screening of a lifelong feature — the wedding of Amira & Daniel." } },
    { type: "quote", variant: "centered", enabled: true, order: 2, data: { text: "Began with a moment, became a forever.", attribution: "" } },
    // Episode 02 · the series so far
    { type: "love_story", variant: "film_episodes", enabled: true, order: 3, data: {
      title: "The Series",
      intro: "three episodes, one forever",
      moments: [
        { label: "Where It All Began", text: "A crowded room, an empty seat beside her.\nI didn't know it then, but that was the moment everything changed.", photoUrl: "" },
        { label: "Falling Together", text: "Late-night calls that forgot to end.\nTwo scripts slowly becoming one story.", photoUrl: "" },
        { label: "Forever Starts Now", text: "No cliffhanger this time.\nHe asked. She said yes. Roll credits — and begin again.", photoUrl: "" },
      ],
      signature: "And I choose you, again and again, every single day.",
    } },
    { type: "gallery", variant: "designer", enabled: true, order: 4, data: {
      title: "Behind the Scenes",
      intro: "stills from the making of us",
      blocks: [
        { layout: "carousel", design: "filmstrip", photos: ["", "", ""], caption: "" },
        { layout: "duo", design: "album_pages", photos: ["", ""], caption: "the supporting cast" },
      ],
    } },
    // Episode 03 · the premiere details
    { type: "event_info", variant: "card_stack", enabled: true, order: 5, data: { eventName: "Majlis Resepsi", date: "", time: "19:30", venue: "The Majestic Hotel Kuala Lumpur", address: "5 Jalan Sultan Hishamuddin, 50000 Kuala Lumpur" } },
    { type: "countdown", variant: "film_leader", enabled: true, order: 6, data: { label: "Tayangan Perdana Dalam", targetDate: "" } },
    { type: "calendar", variant: "month_grid", enabled: true, order: 7, data: { titleOverride: "Save the Date", eventName: "Majlis Resepsi", startsAt: "" } },
    { type: "program", variant: "timeline", enabled: true, order: 8, data: { items: [
      { time: "7:00 PM", event: "Red Carpet Arrival" },
      { time: "7:30 PM", event: "Opening Scene — Dinner is Served" },
      { time: "9:00 PM", event: "The First Dance" },
      { time: "10:30 PM", event: "Closing Credits & Farewell" },
    ] } },
    { type: "dress_code", variant: "swatch", enabled: true, order: 9, data: { theme: "Black Tie Optional", note: "Ink, ivory & a touch of gold", swatchHex: "#0d0d0d" } },
    { type: "map", variant: "button_row", enabled: true, order: 10, data: { address: "5 Jalan Sultan Hishamuddin, 50000 Kuala Lumpur", wazeUrl: "", gmapsUrl: "", grabUrl: "" } },
    { type: "contact", variant: "list", enabled: true, order: 11, data: { items: [
      { name: "Daniel", phone: "+60 12-345 6789", role: "Groom" },
      { name: "Amira", phone: "+60 11-234 5678", role: "Bride" },
    ] } },
    // Episode 04 · reserve your seat (inheritTheme keeps the RSVP in ink & gold)
    { type: "rsvp", variant: "romance_envelope", enabled: true, order: 12, data: { deadline: "", askPax: true, askDietary: false, inheritTheme: true } },
    { type: "guestbook", variant: "wishes_wall", enabled: true, order: 13, data: { allowPublic: true, title: "The Reviews", prompt: "Leave a five-star review for the couple — your wishes are our favourite critics' quotes." } },
    // Post-credits · thank you
    { type: "thank_you", variant: "card", enabled: true, order: 14, data: { message: "To be continued… Terima kasih kerana menjadi sebahagian daripada episod pertama kami. This story only gets better with you in it." } },
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
