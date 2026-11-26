import { customAlphabet } from "nanoid"

// URL-safe alphabet, 8 chars → 64^8 = 281 trillion combinations
const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  8
)

export function generateSlug(): string {
  return nanoid()
}
