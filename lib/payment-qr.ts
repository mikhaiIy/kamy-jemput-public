import { createHash } from "node:crypto"
import sharp from "sharp"

/** Merchant artwork only. Fully decode and strip metadata before making it readable. */
export async function normalizePaymentQr(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024)
    throw new Error("Saiz maksimum imej ialah 5 MB.")
  try {
    const image = sharp(bytes, {
      limitInputPixels: 16000000,
      animated: false,
      failOn: "warning",
    })
    const metadata = await image.metadata()
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format))
      throw new Error()
    const png = await image.rotate().png().toBuffer()
    if (png.length > 5 * 1024 * 1024) throw new Error()
    return { png, key: createHash("sha256").update(png).digest("hex") + ".png" }
  } catch {
    throw new Error(
      "Imej tidak dapat dibaca. Gunakan JPG, PNG atau WebP yang sah, maksimum 16 juta piksel.",
    )
  }
}
