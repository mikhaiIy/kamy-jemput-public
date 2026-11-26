// Cycles every new RSVP variant, opens the form, picks "attending",
// then screenshots — so the user sees the polished expanded state per variant.
import { readFileSync } from "node:fs"
import { spawn } from "node:child_process"
import WebSocket from "ws"

const env = readFileSync("/home/mikhaily/dev/kamy/kamy-jemput/.env.local", "utf8")
for (const l of env.split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "")
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }
const SLUG = process.argv[2] || "1hUvknVB"
const OUT_DIR = process.argv[3] || "/tmp"

const get = await fetch(`${URL_BASE}/rest/v1/cards?slug=eq.${SLUG}&select=custom_data`, { headers: H })
const original = (await get.json())[0].custom_data

const VARIANTS = [
  { variant: "walimah",          palette: "amber_rose",   fonts: { display: "--font-playfair",  body: "--font-jakarta", script: "--font-great-vibes" } },
  { variant: "romance_envelope", palette: "sage_ivory",   fonts: { display: "--font-cormorant", body: "--font-jakarta", script: "--font-great-vibes" } },
  { variant: "double_happiness", palette: "red_gold",     fonts: { display: "--font-cormorant", body: "--font-jakarta", script: "--font-great-vibes" } },
  { variant: "confetti_pop",     palette: "amber_rose",   fonts: { display: "--font-cormorant", body: "--font-jakarta", script: "--font-great-vibes" } },
  { variant: "boardroom_badge",  palette: "minimal_ink",  fonts: { display: "--font-cormorant", body: "--font-jakarta" } },
]

async function patch(custom_data) {
  const u = await fetch(`${URL_BASE}/rest/v1/cards?slug=eq.${SLUG}`, {
    method: "PATCH", headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ custom_data }),
  })
  if (!u.ok) throw new Error(`patch failed: ${u.status}`)
}

// Reusable single chromium with multiple page targets
const port = 9533
const chromium = spawn("chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`,
  "--window-size=420,900",
  "about:blank",
], { stdio: "ignore" })
let endpoint
for (let i = 0; i < 50; i++) {
  await new Promise(r => setTimeout(r, 200))
  try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) { endpoint = (await r.json()).webSocketDebuggerUrl; break } } catch {}
}

async function rpc(ws, method, params = {}) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1e9)
    const h = (d) => { const m = JSON.parse(d.toString()); if (m.id === id) { ws.off("message", h); resolve(m.result) } }
    ws.on("message", h)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function newTab() {
  const br = new WebSocket(endpoint)
  await new Promise(r => br.once("open", r))
  const { targetId } = await rpc(br, "Target.createTarget", { url: "about:blank" })
  br.close()
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const ws = new WebSocket(list.find(t => t.id === targetId).webSocketDebuggerUrl)
  await new Promise(r => ws.once("open", r))
  await rpc(ws, "Page.enable")
  await rpc(ws, "Emulation.setDeviceMetricsOverride", { width: 420, height: 900, deviceScaleFactor: 1, mobile: true })
  return { ws, targetId }
}

async function closeTab(ws, targetId) {
  ws.close()
  try { await fetch(`http://127.0.0.1:${port}/json/close/${targetId}`) } catch {}
}

try {
  for (const v of VARIANTS) {
    const cd = structuredClone(original)
    cd.theme.palette = v.palette
    cd.theme.fonts = v.fonts
    cd.sections = cd.sections.map((s) => (s.type === "rsvp" ? { ...s, variant: v.variant } : s))
    await patch(cd)
    await new Promise(r => setTimeout(r, 500))

    const { ws, targetId } = await newTab()
    await rpc(ws, "Page.navigate", { url: `http://localhost:3000/i/${SLUG}` })
    await new Promise(resolve => {
      const h = (d) => { const m = JSON.parse(d.toString()); if (m.method === "Page.loadEventFired") { ws.off("message", h); resolve() } }
      ws.on("message", h)
    })
    await new Promise(r => setTimeout(r, 1800))

    // Variant-specific interaction
    const script = v.variant === "romance_envelope"
      ? `(() => {
          const open = document.querySelector("button[aria-label='Open RSVP']");
          if (!open) return "no-open";
          open.scrollIntoView({ block: "start" });
          open.click();
          return "opened";
        })()`
      : `(() => {
          const forms = document.querySelectorAll('form');
          const form = forms[forms.length - 1];
          if (!form) return "no-form";
          form.scrollIntoView({ block: "start" });
          const btn = form.querySelector('button[type="button"]');
          btn && btn.click();
          return "clicked";
        })()`
    await rpc(ws, "Runtime.evaluate", { expression: script, returnByValue: true })
    await new Promise(r => setTimeout(r, 700))

    if (v.variant === "romance_envelope") {
      // Now click the "Joyfully Accept" button inside the now-visible form
      await rpc(ws, "Runtime.evaluate", {
        expression: `(() => {
          const forms = document.querySelectorAll('form');
          const form = forms[forms.length - 1];
          if (!form) return "no-form";
          form.scrollIntoView({ block: "start" });
          const btn = form.querySelector('button[type="button"]');
          btn && btn.click();
        })()`,
        returnByValue: true,
      })
      await new Promise(r => setTimeout(r, 700))
    }

    const { layoutViewport } = await rpc(ws, "Page.getLayoutMetrics")
    const shot = await rpc(ws, "Page.captureScreenshot", {
      format: "png", captureBeyondViewport: true,
      clip: { x: 0, y: Math.max(0, layoutViewport.pageY - 80), width: 420, height: 1500, scale: 1 },
    })
    const { writeFileSync } = await import("node:fs")
    const out = `${OUT_DIR}/rsvp-${v.variant}-expanded.png`
    writeFileSync(out, Buffer.from(shot.data, "base64"))
    console.log(`wrote ${out}`)

    await closeTab(ws, targetId)
  }
} finally {
  await patch(original)
  console.log("restored original card data")
  chromium.kill()
  process.exit(0)
}
