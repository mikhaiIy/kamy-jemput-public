/**
 * Map common Supabase Auth error messages to user-friendly Bahasa Malaysia
 * copy so customers don't see raw English library output. Unknown messages
 * fall through unchanged so we still surface novel errors instead of
 * swallowing them.
 */
export function friendlyAuthError(message: string | undefined | null): string {
  if (!message) return "Sesuatu tidak kena. Sila cuba lagi."
  const m = message.toLowerCase()
  if (m.includes("invalid login credentials")) {
    return "E-mel atau kata laluan tidak sah."
  }
  if (m.includes("email not confirmed")) {
    return "E-mel anda belum disahkan. Sila semak inbox untuk pautan pengesahan."
  }
  if (m.includes("user already registered") || m.includes("already exists")) {
    return "E-mel ini sudah berdaftar. Sila log masuk."
  }
  if (m.includes("password should be at least") || m.includes("password is too short")) {
    return "Kata laluan terlalu pendek (minimum 8 aksara)."
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Terlalu banyak cubaan. Sila tunggu sebentar dan cuba lagi."
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Sambungan rangkaian terputus. Sila cuba lagi."
  }
  return message
}
