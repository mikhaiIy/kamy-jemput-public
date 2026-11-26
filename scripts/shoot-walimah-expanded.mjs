// Drive chromium: open the test card, scroll to RSVP, click "Hadir",
// wait for the form to fade in, then screenshot.
import { spawn } from "node:child_process"
import { writeFileSync } from "node:fs"
import WebSocket from "ws"

const port = 9433
const chromium = spawn("chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`,
  "--window-size=420,900",
  "about:blank",
], { stdio: "ignore" })

let endpoint
for (let i = 0; i < 50; i++) {
  await new Promise(r => setTimeout(r, 200))
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/version`)
    if (r.ok) { endpoint = (await r.json()).webSocketDebuggerUrl; break }
  } catch {}
}
async function rpc(ws, method, params = {}) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1e9)
    const h = (data) => {
      const m = JSON.parse(data.toString())
      if (m.id === id) { ws.off("message", h); resolve(m.result) }
    }
    ws.on("message", h)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

const br = new WebSocket(endpoint)
await new Promise(r => br.once("open", r))
const { targetId } = await rpc(br, "Target.createTarget", { url: "about:blank" })
br.close()

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const ws = new WebSocket(targets.find(t => t.id === targetId).webSocketDebuggerUrl)
await new Promise(r => ws.once("open", r))

await rpc(ws, "Page.enable")
await rpc(ws, "Emulation.setDeviceMetricsOverride", { width: 420, height: 900, deviceScaleFactor: 1, mobile: true })
await rpc(ws, "Page.navigate", { url: "http://localhost:3000/i/1hUvknVB" })
await new Promise(resolve => {
  const h = (d) => { const m = JSON.parse(d.toString()); if (m.method === "Page.loadEventFired") { ws.off("message", h); resolve() } }
  ws.on("message", h)
})
await new Promise(r => setTimeout(r, 2000))

// Scroll to RSVP form and click the first picker button (Hadir)
await rpc(ws, "Runtime.evaluate", {
  expression: `(() => {
    const forms = document.querySelectorAll('form');
    const form = forms[forms.length - 1];
    if (!form) return "no-form";
    form.scrollIntoView({ block: "start" });
    const btn = form.querySelector('button[type="button"]');
    btn && btn.click();
    return "clicked";
  })()`,
  returnByValue: true,
})
await new Promise(r => setTimeout(r, 700))

const { layoutViewport } = await rpc(ws, "Page.getLayoutMetrics")
const shot = await rpc(ws, "Page.captureScreenshot", {
  format: "png", captureBeyondViewport: true,
  clip: { x: 0, y: Math.max(0, layoutViewport.pageY - 100), width: 420, height: 1400, scale: 1 },
})
writeFileSync("/tmp/rsvp-walimah-expanded.png", Buffer.from(shot.data, "base64"))
console.log("wrote /tmp/rsvp-walimah-expanded.png")

ws.close(); chromium.kill(); process.exit(0)
