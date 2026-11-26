// One-off dev seeder: inserts mock RSVPs (with ucapan messages) for a card
// identified by slug. Hits Supabase REST with the service-role key so it
// bypasses RLS. Safe to re-run — but it appends, it does not clear.
//
// Usage:
//   node scripts/seed-mock-rsvps.mjs <slug> [count]
//   node scripts/seed-mock-rsvps.mjs 1hUvknVB 30

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const envPath = resolve(process.cwd(), ".env.local")
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "")
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const slug = process.argv[2]
const count = Number(process.argv[3] || 30)
if (!slug) {
  console.error("Usage: node scripts/seed-mock-rsvps.mjs <slug> [count]")
  process.exit(1)
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
}

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${res.statusText} — ${body}`)
  }
  return res.status === 204 ? null : res.json()
}

const cards = await rest(
  `/cards?slug=eq.${encodeURIComponent(slug)}&select=id,is_published,current_publication_id`
)
if (!cards.length || !cards[0].current_publication_id) {
  console.error(`No card with slug=${slug}`)
  process.exit(1)
}
const card = cards[0]
console.log(`Found card ${card.id} (published=${card.is_published})`)

const names = [
  "Aisyah Rahman", "Hafiz Ismail", "Nurul Huda", "Aiman Hakimi",
  "Siti Sarah", "Farhan Aziz", "Adriana Yusof", "Zulkarnain Mohd",
  "Maisarah Lutfi", "Iskandar Zulkifli", "Aleeya Damia", "Rayyan Akmal",
  "Nadhirah Zaki", "Danial Hakim", "Sofea Iman", "Khairul Anwar",
  "Balqis Maisarah", "Aqil Hadi", "Hidayah Suhaimi", "Imran Faiz",
  "Wan Aisyah", "Syafiq Hasan", "Liyana Aziz", "Hazim Idris",
  "Aina Sofiya", "Faris Iskandar", "Nur Alia", "Haziq Ridzuan",
  "Aniq Daniel", "Sarah Kamarudin", "Tariq Mansor", "Hana Zubair",
  "Aqilah Husna", "Zafran Akmal", "Mariam Halim", "Luqman Hakim",
]

const wishes = [
  "Tahniah! Semoga bahagia ke akhir hayat 💕",
  "Barakallahu lakuma — selamat pengantin baru!",
  "Selamat pengantin baru! Moga bahagia hingga ke jannah 🌸",
  "Tahniah! Semoga rumah tangga sentiasa diberkati Allah 🤍",
  "Congrats! Wishing you both a lifetime of love and laughter ✨",
  "Selamat menempuh alam baru. Sakinah, mawaddah, warahmah ❤️",
  "Tahniah brother! Lama tunggu hari ini. So happy for you both 🎊",
  "Moga ditakdirkan zuriat yang soleh & solehah. Aamiin 🌺",
  "May Allah bless your union always. Tahniah! 💐",
  "So happy for you two! Enjoy every moment of this beautiful day 💕",
  "Tahniah Aisyah & family! Doakan jodoh dunia akhirat 🌹",
  "Selamat pengantin baru! Jangan lupa kawan-kawan lama 😄",
  "Couldn't be happier for you both. Tahniah! 🎉",
  "Semoga sentiasa bahagia & dimurahkan rezeki. Aamiin",
  "Tahniah! Cantik sangat tema kahwin korang. So in love 🥰",
  "Wishing you a marriage filled with sabar, syukur, and love ✨",
  "Tahniah dik! Akak doakan yang terbaik untuk korang berdua 💕",
  "Selamat pengantin baru — moga jadi pasangan yang berkat dunia akhirat 🤍",
  "May your love story be long and beautiful. Tahniah! 🌸",
  "Tahniah! Sorry tak dapat hadir, tapi doa sentiasa bersama korang 💐",
  "So excited for you guys! Congratulations 🎊",
  "Moga rumah tangga sentiasa harmoni & dirahmati Allah 🌺",
  "Tahniah! Semoga jadi pasangan yang serasi hingga ke syurga 💕",
  "Selamat pengantin baru. Doakan murah rezeki & dikurniakan cahaya mata 🤍",
  "Best wishes for a lifetime of happiness together ✨",
  "Tahniah! Tak sangka cepat je masa berlalu. So proud of you 💐",
  "Selamat melayari bahtera rumah tangga. Moga sentiasa bahagia 🌹",
  "Congratulations on your big day! 🎉",
  "Doakan dipermudahkan segala urusan & rumah tangga yang sakinah 💕",
  "Tahniah! Awak berdua nampak sangat bahagia. Moga kekal selamanya ✨",
  "Selamat pengantin baru! Jemput datang rumah lepas ni 😄",
  "Tahniah dan moga diberkati Allah dalam setiap langkah 🤍",
  "May your union be blessed with love, peace, and joy 🌸",
  "Tahniah! Cantik gila majlis korang. Doakan yang terbaik 💕",
  "Selamat pengantin baru! Semoga bahagia dunia & akhirat 🌺",
  "So happy seeing you both today. Tahniah! 🎊",
]

const rows = []
const now = Date.now()
for (let i = 0; i < count; i++) {
  const name = names[i % names.length]
  const msg = wishes[i % wishes.length]
  const attending = Math.random() > 0.15
  // spread createdAt over the past few hours so order looks natural
  const createdAt = new Date(now - i * 1000 * 60 * (3 + Math.random() * 7)).toISOString()
  rows.push({
    card_id: card.id,
    publication_id: card.current_publication_id,
    guest_name: name,
    guest_contact: null,
    attending,
    pax: attending ? 1 + Math.floor(Math.random() * 3) : 1,
    message: msg,
    created_at: createdAt,
  })
}

const result = await rest(`/rsvp_responses`, {
  method: "POST",
  headers: { Prefer: "return=representation" },
  body: JSON.stringify(rows),
})

console.log(`Inserted ${result.length} mock RSVPs for slug=${slug}`)
