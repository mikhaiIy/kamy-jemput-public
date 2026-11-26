// ---------------------------------------------------------------------------
// Payment-support contacts
// ---------------------------------------------------------------------------
//
// This module is deliberately free of server and framework imports. The same
// normalization rules protect the administrator form, customer projections,
// and the links rendered by PaymentSupportMessage.

export const SUPPORT_EMAIL_MAX_LENGTH = 254
export const SUPPORT_WHATSAPP_MIN_NATIONAL_DIGITS = 8
export const SUPPORT_WHATSAPP_MAX_NATIONAL_DIGITS = 10
export const SUPPORT_REASON_MAX_LENGTH = 500

export const PAYMENT_SUPPORT_FALLBACK_MESSAGE =
  "Ada masalah dengan bayaran ini. Sila cuba lagi atau pilih Bayar dengan Stripe."

export type PaymentSupportContact = {
  email: string | null
  whatsapp: string | null
  version?: number
}

export type SupportContactValidationReason =
  | "not_string"
  | "invalid_whitespace"
  | "too_long"
  | "invalid_syntax"
  | "invalid_prefix"
  | "invalid_characters"
  | "invalid_length"

export type SupportContactValidation =
  | { ok: true; value: string | null }
  | { ok: false; reason: SupportContactValidationReason; message: string }

function invalid(
  reason: SupportContactValidationReason,
  message: string,
): SupportContactValidation {
  return { ok: false, reason, message }
}

/**
 * Validate one operational support email. Surrounding spaces are trimmed;
 * internal whitespace/control characters and comma-separated addresses are
 * rejected. The stored result is always lower-case.
 */
export function validateSupportEmail(raw: unknown): SupportContactValidation {
  if (raw === null || raw === undefined) return { ok: true, value: null }
  if (typeof raw !== "string") {
    return invalid("not_string", "Masukkan satu alamat e-mel yang sah.")
  }

  // A control character at either edge must not disappear through trim().
  // Ordinary spaces around the address remain allowed and are trimmed below.
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(raw)) {
    return invalid("invalid_whitespace", "Masukkan satu alamat e-mel yang sah.")
  }
  const value = raw.trim()
  if (!value) return { ok: true, value: null }
  if (value.length > SUPPORT_EMAIL_MAX_LENGTH) {
    return invalid("too_long", "Alamat e-mel tidak boleh melebihi 254 aksara.")
  }
  // This is intentionally a single-address syntax check. It allows normal
  // plus-addressing and common RFC local-part punctuation while excluding
  // display names, comments, commas, controls, and whitespace.
  if (
    /[\s\u0000-\u001f\u007f-\u009f]/u.test(value) ||
    value.includes(",") ||
    value.includes("..") ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(
      value,
    )
  ) {
    return invalid("invalid_syntax", "Masukkan satu alamat e-mel yang sah.")
  }

  const [localPart] = value.split("@")
  if (
    !localPart ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".")
  ) {
    return invalid("invalid_syntax", "Masukkan satu alamat e-mel yang sah.")
  }
  return { ok: true, value: value.toLowerCase() }
}

/**
 * Normalize a Malaysian +60 contact for WhatsApp. Formatting spaces,
 * hyphens, and round brackets are removed. The result must contain 8–10
 * national digits after +60, with no trunk zero; this accepts structurally
 * valid Malaysian geographic and mobile shapes without claiming ownership or
 * current WhatsApp registration.
 */
export function validateSupportWhatsApp(raw: unknown): SupportContactValidation {
  if (raw === null || raw === undefined) return { ok: true, value: null }
  if (typeof raw !== "string") {
    return invalid("not_string", "Masukkan nombor WhatsApp Malaysia bermula dengan +60.")
  }

  // Do not let trim() silently turn a pasted tab or line break into a valid
  // contact. Only ordinary spaces are formatting accepted by this field.
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(raw)) {
    return invalid("invalid_characters", "Gunakan hanya angka, ruang, tanda sempang dan kurungan.")
  }
  const value = raw.trim()
  if (!value) return { ok: true, value: null }
  if (!/^[0-9 ()\[\]+-]+$/.test(value)) {
    return invalid("invalid_characters", "Gunakan hanya angka, ruang, tanda sempang dan kurungan.")
  }

  // Formatting is removed before the country-code check so common forms such
  // as `(+60) 12-345 6789` normalize to the same stored/link value.
  const normalized = value.replace(/[ ()\[\]-]/g, "")
  if (!normalized.startsWith("+60")) {
    return invalid("invalid_prefix", "Nombor WhatsApp mesti bermula dengan +60.")
  }
  const national = normalized.slice(3)
  if (
    !/^\+60[1-9][0-9]{7,9}$/.test(normalized) ||
    national.length < SUPPORT_WHATSAPP_MIN_NATIONAL_DIGITS ||
    national.length > SUPPORT_WHATSAPP_MAX_NATIONAL_DIGITS
  ) {
    return invalid(
      "invalid_length",
      "Nombor WhatsApp mesti mempunyai 8 hingga 10 angka selepas +60 dan tiada angka 0 selepas kod negara.",
    )
  }
  return { ok: true, value: normalized }
}

export function normalizeSupportEmail(raw: unknown): string | null {
  const result = validateSupportEmail(raw)
  if (!result.ok) throw new Error(result.message)
  return result.value
}

export function normalizeSupportWhatsApp(raw: unknown): string | null {
  const result = validateSupportWhatsApp(raw)
  if (!result.ok) throw new Error(result.message)
  return result.value
}

/** Sanitize a persisted row before any customer-facing rendering. */
export function parsePaymentSupportContact(value: unknown): PaymentSupportContact {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {}
  const emailResult = validateSupportEmail(record.email)
  const whatsappResult = validateSupportWhatsApp(record.whatsapp)
  const version =
    typeof record.version === "number" && Number.isSafeInteger(record.version) && record.version >= 0
      ? record.version
      : undefined
  return {
    email: emailResult.ok ? emailResult.value : null,
    whatsapp: whatsappResult.ok ? whatsappResult.value : null,
    ...(version === undefined ? {} : { version }),
  }
}

export const EMPTY_PAYMENT_SUPPORT_CONTACT: PaymentSupportContact = {
  email: null,
  whatsapp: null,
}

export type PaymentSupportChannel = {
  kind: "email" | "whatsapp"
  value: string
  href: string
}

export type PaymentSupportMessage = {
  text: string
  fallback: boolean
  email: PaymentSupportChannel | null
  whatsapp: PaymentSupportChannel | null
}

/** Build the exact customer copy and safe, normalized contact links. */
export function buildPaymentSupportMessage(
  contact: PaymentSupportContact | null | undefined,
): PaymentSupportMessage {
  const safe = parsePaymentSupportContact(contact)
  const email = safe.email
    ? {
        kind: "email" as const,
        value: safe.email,
        href: `mailto:${encodeURIComponent(safe.email)}`,
      }
    : null
  const whatsapp = safe.whatsapp
    ? {
        kind: "whatsapp" as const,
        value: safe.whatsapp,
        href: `https://wa.me/${safe.whatsapp.slice(1)}`,
      }
    : null

  if (email && whatsapp) {
    return {
      text: `Ada masalah dengan bayaran ini. Sila hubungi ${email.value} atau WhatsApp ${whatsapp.value}.`,
      fallback: false,
      email,
      whatsapp,
    }
  }
  if (email) {
    return {
      text: `Ada masalah dengan bayaran ini. Sila hubungi ${email.value}.`,
      fallback: false,
      email,
      whatsapp: null,
    }
  }
  if (whatsapp) {
    return {
      text: `Ada masalah dengan bayaran ini. Sila WhatsApp ${whatsapp.value}.`,
      fallback: false,
      email: null,
      whatsapp,
    }
  }
  return {
    text: PAYMENT_SUPPORT_FALLBACK_MESSAGE,
    fallback: true,
    email: null,
    whatsapp: null,
  }
}
