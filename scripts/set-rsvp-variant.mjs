// Dev helper: swap the RSVP variant (and matching palette/fonts) on a card
// so you can refresh the public /i/<slug> URL and preview each design.
//
// Usage:
//   node scripts/set-rsvp-variant.mjs <slug> <variant>
//   node scripts/set-rsvp-variant.mjs 1hUvknVB walimah
//   node scripts/set-rsvp-variant.mjs 1hUvknVB romance_envelope
//   node scripts/set-rsvp-variant.mjs 1hUvknVB double_happiness
//   node scripts/set-rsvp-variant.mjs 1hUvknVB confetti_pop
//   node scripts/set-rsvp-variant.mjs 1hUvknVB boardroom_badge
//   node scripts/set-rsvp-variant.mjs 1hUvknVB reset      # back to walimah/amber_rose

import { readFileSync } from "node:fs"
const env = readFileSync("/home/mikhaily/dev/kamy/kamy-jemput/.env.local", "utf8")
for (const l of env.split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "")
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }

const slug = process.argv[2]
const variant = process.argv[3] || "walimah"
if (!slug) {
  console.error("usage: node scripts/set-rsvp-variant.mjs <slug> <variant>")
  process.exit(1)
}

// Each variant ships with its natural palette + font pairing so the
// preview shows the design in the context it was tuned for.
const PROFILES = {
  walimah:          { palette: "amber_rose",    fonts: { display: "--font-playfair",  body: "--font-jakarta", script: "--font-great-vibes" } },
  romance_envelope: { palette: "sage_ivory",    fonts: { display: "--font-cormorant", body: "--font-jakarta", script: "--font-great-vibes" } },
  double_happiness: { palette: "red_gold",      fonts: { display: "--font-cormorant", body: "--font-jakarta", script: "--font-great-vibes" } },
  confetti_pop:     { palette: "amber_rose",    fonts: { display: "--font-cormorant", body: "--font-jakarta", script: "--font-great-vibes" } },
  boardroom_badge:  { palette: "minimal_ink",   fonts: { display: "--font-cormorant", body: "--font-jakarta" } },
  reset:            { palette: "amber_rose",    fonts: { display: "--font-playfair",  body: "--font-jakarta", script: "--font-great-vibes" }, _as: "walimah" },
}

const p = PROFILES[variant]
if (!p) {
  console.error(`unknown variant "${variant}". one of: ${Object.keys(PROFILES).join(", ")}`)
  process.exit(1)
}
const actualVariant = p._as || variant

const get = await fetch(`${URL_BASE}/rest/v1/cards?slug=eq.${slug}&select=custom_data`, { headers: H })
const rows = await get.json()
if (!rows.length) { console.error(`no card with slug=${slug}`); process.exit(1) }
const cd = rows[0].custom_data
cd.theme.palette = p.palette
cd.theme.fonts = p.fonts
cd.sections = cd.sections.map((s) => (s.type === "rsvp" ? { ...s, variant: actualVariant } : s))

const u = await fetch(`${URL_BASE}/rest/v1/cards?slug=eq.${slug}`, {
  method: "PATCH",
  headers: { ...H, Prefer: "return=minimal" },
  body: JSON.stringify({ custom_data: cd }),
})
if (!u.ok) { console.error(`patch failed: ${u.status}`); process.exit(1) }

console.log(`✓ ${slug} → variant=${actualVariant} palette=${p.palette}`)
console.log(`  refresh: http://localhost:3000/i/${slug}`)
