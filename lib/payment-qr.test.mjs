import test from "node:test"
import assert from "node:assert/strict"
import sharp from "sharp"
import { normalizePaymentQr } from "./payment-qr.ts"

test("merchant QR images are decoded from bytes and normalized to stable PNG objects", async () => {
  for (const format of ["png", "jpeg", "webp"]) {
    const input = await sharp({ create: { width: 32, height: 32, channels: 3, background: "white" } }).toFormat(format).toBuffer()
    const output = await normalizePaymentQr(input)
    assert.equal((await sharp(output.png).metadata()).format, "png")
    assert.match(output.key, /^[a-f0-9]{64}\.png$/)
    assert.equal((await normalizePaymentQr(input)).key, output.key)
  }
})
test("QR upload rejects SVG, PDF, corrupt images, empty and oversized input", async () => {
  for (const input of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'), Buffer.from('%PDF-1.7\n%%EOF'), Buffer.from('not an image'), Buffer.alloc(0), Buffer.alloc(5 * 1024 * 1024 + 1)]) {
    await assert.rejects(normalizePaymentQr(input))
  }
  const png = await sharp({create:{width:20,height:20,channels:3,background:'white'}}).png().toBuffer()
  await assert.rejects(normalizePaymentQr(png.subarray(0, png.length / 2)))
})
test("QR upload refuses images above the decoded pixel limit", async () => {
  const png = await sharp({create:{width:4001,height:4000,channels:3,background:'white'}}).png().toBuffer()
  assert(png.length < 5 * 1024 * 1024)
  await assert.rejects(normalizePaymentQr(png))
})
