// One-off dev seeder: upserts the `sakura-story` template row via the Supabase
// REST API with the service-role key. Mirrors migration
// 013_seed_sakura_story_template.sql exactly — use this when the remote
// migration history is out of sync and a full `supabase db push` is unsafe
// (see docs note in DESIGN_SAKURA_STORY.md).
//
//   node scripts/seed-sakura-story.mjs
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
  id: "sakura-story",
  name: "Sakura Story",
  category: "wedding",
  price_myr: 12900,
  is_active: true,
  type: "wedding_general",
  theme: {
    palette: "sage_ivory",
    preset: "sakura_blush",
    colors: {
      bg: "#fffafb",
      text: "#4a3a40",
      accent: "#e8637f",
      gold: "#c9a23c",
      muted: "#7ab3c8",
      border: "rgba(232,99,127,0.22)",
      card: "#ffffff",
      divider: "✿",
      opening: "You are invited!",
    },
    fonts: { display: "--font-cormorant", body: "--font-jakarta", script: "--font-dancing" },
    animation: "fade",
    background: { kind: "solid", value: "#fffafb" },
  },
  sections: [
    { type: "landing", variant: "sakura_depth", enabled: true, order: 0, data: { headline: "Alex & Mei", subhead: "Together with their families", tagline: "Wedding Invitation", coverPhotoUrl: "", eventDate: "" } },
    // Photo breather right after the hero — gallery is repeatable per card
    { type: "gallery", variant: "designer", enabled: true, order: 1, data: {
      title: "",
      intro: "",
      blocks: [{ layout: "single", design: "arch_botanic", photos: [""], caption: "You Are Invited!" }],
    } },
    { type: "welcome", variant: "card_centered", enabled: true, order: 2, data: { greeting: "You Are Invited!", body: "Mr & Mrs Chen and Mr & Mrs Lee joyfully invite you to celebrate the wedding of their children." } },
    { type: "love_story", variant: "chapters", enabled: true, order: 3, data: {
      title: "Loving you,",
      intro: "is my favourite thing to do every single day",
      moments: [
        { label: "How We Met", text: 'He saw her. She saw him.\nTheir hearts said "oh, it\'s you."', photoUrl: "" },
        { label: "We Are Married", text: 'They said "just friends."\nThe universe laughed.\nHere we are.', photoUrl: "" },
      ],
      signature: "Alex & Mei",
    } },
    // Second gallery instance after the story chapter
    { type: "gallery", variant: "designer", enabled: true, order: 4, data: {
      title: "Our Moments",
      intro: "happiness is within reach",
      blocks: [
        { layout: "carousel", design: "postcard", photos: ["", "", ""], caption: "" },
        { layout: "duo", design: "overlap_prints", photos: ["", ""], caption: "We are married" },
      ],
    } },
    { type: "quote", variant: "centered", enabled: true, order: 5, data: { text: 'The best moment in life is when you become "us".', attribution: "" } },
    { type: "event_info", variant: "card_stack", enabled: true, order: 6, data: { eventName: "Wedding Dinner", date: "", time: "18:30", venue: "JW Marriott Hotel Kuala Lumpur", address: "183, Jalan Bukit Bintang, 55100 Kuala Lumpur" } },
    { type: "calendar", variant: "month_grid", enabled: true, order: 7, data: { titleOverride: "Save the Date", eventName: "Wedding Dinner", startsAt: "" } },
    { type: "countdown", variant: "digital", enabled: true, order: 8, data: { label: "Counting Down", targetDate: "" } },
    { type: "program", variant: "timeline", enabled: true, order: 9, data: { items: [
      { time: "9:30 AM", event: "Ceremony" },
      { time: "12:30 PM", event: "Luncheon" },
      { time: "6:30 PM", event: "Dinner" },
    ] } },
    { type: "dress_code", variant: "swatch", enabled: true, order: 10, data: { theme: "Smart Casual / Formal", note: "Avoid all black", swatchHex: "#e8637f" } },
    { type: "map", variant: "button_row", enabled: true, order: 11, data: { address: "183, Jalan Bukit Bintang, 55100 Kuala Lumpur", wazeUrl: "", gmapsUrl: "", grabUrl: "" } },
    { type: "contact", variant: "list", enabled: true, order: 12, data: { items: [
      { name: "Alex", phone: "+60 12-345 6789", role: "Groom" },
      { name: "Mei", phone: "+60 11-234 5678", role: "Bride" },
    ] } },
    { type: "rsvp", variant: "romance_envelope", enabled: true, order: 13, data: { deadline: "", askPax: true, askDietary: false } },
    { type: "thank_you", variant: "card", enabled: true, order: 14, data: { message: "This life has only one journey, and that journey is you. Thank you for celebrating with us." } },
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
