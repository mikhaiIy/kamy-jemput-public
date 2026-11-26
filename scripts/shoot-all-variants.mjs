// Cycles through every new RSVP variant on the test card, captures a
// screenshot of just the RSVP section, then restores the original.
import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"

const env = readFileSync("/home/mikhaily/dev/kamy/kamy-jemput/.env.local", "utf8")
for (const l of env.split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "")
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }
const SLUG = process.argv[2] || "1hUvknVB"
const SHOTS_DIR = process.argv[3] || "/tmp"

const get = await fetch(`${URL_BASE}/rest/v1/cards?slug=eq.${SLUG}&select=custom_data`, { headers: H })
const original = (await get.json())[0].custom_data

const VARIANTS = [
  { variant: "walimah",          palette: "amber_rose",     fonts: { display: "--font-playfair",  body: "--font-jakarta", script: "--font-great-vibes" } },
  { variant: "romance_envelope", palette: "sage_ivory",     fonts: { display: "--font-cormorant", body: "--font-jakarta", script: "--font-great-vibes" } },
  { variant: "double_happiness", palette: "red_gold",       fonts: { display: "--font-cormorant", body: "--font-jakarta", script: "--font-great-vibes" } },
  { variant: "confetti_pop",     palette: "amber_rose",     fonts: { display: "--font-cormorant", body: "--font-jakarta", script: "--font-great-vibes" } },
  { variant: "boardroom_badge",  palette: "minimal_ink",    fonts: { display: "--font-cormorant", body: "--font-jakarta" } },
]

async function patch(custom_data) {
  const u = await fetch(`${URL_BASE}/rest/v1/cards?slug=${SLUG ? `eq.${SLUG}` : ""}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ custom_data }),
  })
  if (!u.ok) throw new Error(`patch failed: ${u.status} ${await u.text()}`)
}

try {
  for (const v of VARIANTS) {
    const cd = structuredClone(original)
    cd.theme.palette = v.palette
    cd.theme.fonts = v.fonts
    cd.sections = cd.sections.map((s) => (s.type === "rsvp" ? { ...s, variant: v.variant } : s))
    await patch(cd)
    // brief settle for Next dev
    await new Promise((r) => setTimeout(r, 500))

    const out = `${SHOTS_DIR}/rsvp-${v.variant}.png`
    const env2 = {
      ...process.env,
      SHOOT_MARKER: "form,button[aria-label='Open RSVP']",
      SHOOT_HEIGHT: "1200",
    }
    const r = spawnSync("node", ["scripts/cdp-shoot.mjs", `http://localhost:3000/i/${SLUG}`, out], {
      env: env2,
      stdio: "inherit",
    })
    if (r.status !== 0) console.error(`shoot failed for ${v.variant}`)
  }
} finally {
  // Always restore — otherwise a mid-loop crash leaves the test card in a
  // mutated state and the next dev session sees the wrong palette/variant.
  await patch(original)
  console.log("restored original card data")
}
