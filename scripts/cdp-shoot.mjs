// Drives chromium via CDP to capture a full-page screenshot of the
// /i/<slug> page after the layout settles.
import { spawn } from "node:child_process"
import { writeFileSync } from "node:fs"
import WebSocket from "ws"

const URL = process.argv[2]
const OUT = process.argv[3] || "/tmp/shot.png"
if (!URL) { console.error("usage: cdp-shoot.mjs <url> <out.png>"); process.exit(1) }

const port = 9333 + Math.floor(Math.random() * 100)
const chromium = spawn("chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${port}`,
  "--window-size=420,900",
  "about:blank",
], { stdio: "ignore" })

// Wait for devtools endpoint
let endpoint
for (let i = 0; i < 50; i++) {
  await new Promise(r => setTimeout(r, 200))
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/version`)
    if (r.ok) { endpoint = (await r.json()).webSocketDebuggerUrl; break }
  } catch {}
}
if (!endpoint) { console.error("chromium devtools didn't come up"); chromium.kill(); process.exit(1) }

// Open a new target/tab
async function rpc(ws, method, params = {}) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1e9)
    const handler = (data) => {
      const msg = JSON.parse(data.toString())
      if (msg.id === id) { ws.off("message", handler); resolve(msg.result) }
    }
    ws.on("message", handler)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

const br = new WebSocket(endpoint)
await new Promise(r => br.once("open", r))
const { targetId } = await rpc(br, "Target.createTarget", { url: "about:blank" })
await rpc(br, "Target.attachToTarget", { targetId, flatten: true })
br.close()

// Connect directly to the target's wsURL
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const tgt = targets.find(t => t.id === targetId)
const ws = new WebSocket(tgt.webSocketDebuggerUrl)
await new Promise(r => ws.once("open", r))

await rpc(ws, "Page.enable")
await rpc(ws, "Page.navigate", { url: URL })
// Wait for load
await new Promise(resolve => {
  const h = (data) => {
    const m = JSON.parse(data.toString())
    if (m.method === "Page.loadEventFired") { ws.off("message", h); resolve() }
  }
  ws.on("message", h)
})
// Set a mobile viewport first so the page reflows
await rpc(ws, "Emulation.setDeviceMetricsOverride", {
  width: 420, height: 900, deviceScaleFactor: 1, mobile: true,
})
await new Promise(r => setTimeout(r, 1800))

// Scroll an RSVP-related element into view. Tries each comma-separated
// CSS selector in SHOOT_MARKER (default "form") until one is found.
const marker = process.env.SHOOT_MARKER || "form,button[aria-label='Open RSVP']"
await rpc(ws, "Runtime.evaluate", {
  expression: `
    (() => {
      const selectors = ${JSON.stringify(marker)}.split(",").map(s => s.trim()).filter(Boolean);
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length) {
          const el = els[els.length - 1];
          const r = el.getBoundingClientRect();
          const y = r.top + window.scrollY - 80;
          window.scrollTo(0, y);
          return { sel, y };
        }
      }
      return -1;
    })()
  `,
  returnByValue: true,
})
await new Promise(r => setTimeout(r, 500))

const clipHeight = Number(process.env.SHOOT_HEIGHT || 1400)
const { layoutViewport } = await rpc(ws, "Page.getLayoutMetrics")
// Lift the crop a bit so we catch the section title above the form
const startY = Math.max(0, layoutViewport.pageY - 200)

const shot = await rpc(ws, "Page.captureScreenshot", {
  format: "png", captureBeyondViewport: true,
  clip: { x: 0, y: startY, width: 420, height: clipHeight, scale: 1 },
})
writeFileSync(OUT, Buffer.from(shot.data, "base64"))
console.log(`wrote ${OUT} (420x${clipHeight} @ y=${startY})`)

ws.close()
chromium.kill()
process.exit(0)
