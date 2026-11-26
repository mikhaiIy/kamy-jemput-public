// ============================================================================
// Payments — shared DuitNow / Stripe contracts and display helpers
// ============================================================================
//
// The purchase surface has two fixed methods: Stripe Checkout (hosted card
// payment) and DuitNow manual transfer against one of exactly two
// administrator-managed slots. A DuitNow submission is never payment
// confirmation — an administrator manually confirms or rejects it, and the
// first valid completion wins the order.
//
// These validators are used at every HTTP/server-action boundary; the database
// RPCs remain the authoritative recheck.

import { getCardEventName, type CardData, type PaymentMethod } from "@/lib/types"
import type { ManualPaymentStatus } from "./manual-payment-message"

export { manualPaymentMessage, type ManualPaymentStatus } from "./manual-payment-message"

export type { CardData, PaymentMethod } from "@/lib/types"

// ---------- Slot numbers ---------------------------------------------------

/** The two durable slot rows. There will never be more than two. */
export type DuitNowSlotNumber = 1 | 2

/**
 * Strictly parse a customer/admin-supplied slot value. Accepts only the exact
 * valid values — `1`/`2` as numbers or the exact strings `"1"`/`"2"`. No
 * coercive prefixes, fractions, floats, or other numeric input ("01", "1.0",
 * "slot 1", " 2") are accepted.
 */
export function parseDuitNowSlot(value: unknown): DuitNowSlotNumber | null {
  if (value === 1 || value === 2) return value
  if (value === "1") return 1
  if (value === "2") return 2
  return null
}

// ---------- Transfer references ---------------------------------------------

const REFERENCE_MIN = 3
const REFERENCE_MAX = 64
/** Bounded printable reference: starts alphanumeric, no control characters. */
const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,&+\-/():#@']*$/

export type ReferenceValidation =
  | { ok: true; reference: string }
  | { ok: false; reason: "not_string" | "too_short" | "too_long" | "invalid_characters" }

export function validateTransferReference(raw: unknown): ReferenceValidation {
  if (typeof raw !== "string") return { ok: false, reason: "not_string" }
  const trimmed = raw.trim()
  if (trimmed.length < REFERENCE_MIN) return { ok: false, reason: "too_short" }
  if (trimmed.length > REFERENCE_MAX) return { ok: false, reason: "too_long" }
  if (!REFERENCE_PATTERN.test(trimmed)) return { ok: false, reason: "invalid_characters" }
  return { ok: true, reference: trimmed }
}

// ---------- Row views --------------------------------------------------------

/** One of the two administrator-managed slots (live, current configuration). */
export type DuitNowSlotView = {
  slotNumber: DuitNowSlotNumber
  version: number
  enabled: boolean
  label: string
  payeeName: string
  provider: string
  qrImageUrl: string
  instructions: string
  updatedAt: string | null
}

/**
 * The frozen displayed-slot configuration captured inside an immutable
 * submission. Customers who already submitted always see this snapshot,
 * never live slot data.
 */
export type FrozenSlotSnapshot = {
  slotNumber: number
  version: number
  label: string
  payeeName: string
  provider: string
  qrImageUrl: string
  instructions: string
}

/** An immutable customer transfer submission (customer-safe projection). */
export type TransferSubmissionView = {
  id: string
  orderId: string
  createdAt: string
  amountSen: number
  transferReference: string
  slot: FrozenSlotSnapshot
}

export type DuitNowReviewView = {
  id: string
  outcome: "confirmed" | "rejected"
  note: string
  createdAt: string
}

/** Submission plus its review, if one exists yet. */
export type DuitNowSubmissionState = {
  submission: TransferSubmissionView
  review: DuitNowReviewView | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`Invalid DuitNow ${field}`)
  return value
}

function toFrozenSlotSnapshot(value: unknown): FrozenSlotSnapshot {
  if (!isRecord(value)) throw new Error("Invalid DuitNow slot snapshot")
  const slotNumber = parseDuitNowSlot(value.slotNumber)
  const version = value.version
  if (slotNumber === null || typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new Error("Invalid DuitNow slot snapshot")
  }
  return {
    slotNumber,
    version,
    label: requiredString(value.label, "slot label"),
    payeeName: requiredString(value.payeeName, "payee"),
    provider: requiredString(value.provider, "provider"),
    qrImageUrl: requiredString(value.qrImageUrl, "QR URL"),
    instructions: requiredString(value.instructions, "instructions"),
  }
}

/** Convert and validate a database row before it is displayed as a live slot. */
export function toDuitNowSlotView(row: unknown): DuitNowSlotView {
  if (!isRecord(row)) throw new Error("Invalid DuitNow slot")
  const slotNumber = parseDuitNowSlot(row.slot_number)
  const version = row.version
  if (slotNumber === null || typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new Error("Invalid DuitNow slot")
  }
  if (typeof row.enabled !== "boolean") throw new Error("Invalid DuitNow slot")
  const updatedAt = row.updated_at
  if (updatedAt !== null && typeof updatedAt !== "string") throw new Error("Invalid DuitNow slot")
  const label = requiredString(row.label, "slot label")
  const payeeName = requiredString(row.payee_name, "payee")
  const provider = requiredString(row.provider, "provider")
  const qrImageUrl = requiredString(row.qr_image_url, "QR URL")
  const instructions = requiredString(row.instructions, "instructions")
  // A broken enabled row must never become a customer-selectable payment
  // method even if malformed data predates the slot-management RPC.
  if (row.enabled && (!payeeName.trim() || !provider.trim() || !qrImageUrl.trim())) {
    throw new Error("Incomplete enabled DuitNow slot")
  }
  return {
    slotNumber,
    version,
    enabled: row.enabled,
    label,
    payeeName,
    provider,
    qrImageUrl,
    instructions,
    updatedAt,
  }
}

/** Convert and validate the immutable customer-safe submission projection. */
export function toTransferSubmissionView(row: unknown): TransferSubmissionView {
  if (!isRecord(row)) throw new Error("Invalid DuitNow submission")
  const amountSen = typeof row.amount_sen === "number" ? row.amount_sen : Number.NaN
  const reference = validateTransferReference(row.transfer_reference)
  if (
    typeof row.id !== "string" ||
    typeof row.order_id !== "string" ||
    typeof row.created_at !== "string" ||
    !Number.isSafeInteger(amountSen) ||
    amountSen < 0 ||
    !reference.ok
  ) {
    throw new Error("Invalid DuitNow submission")
  }
  return {
    id: row.id,
    orderId: row.order_id,
    createdAt: row.created_at,
    amountSen,
    transferReference: reference.reference,
    slot: toFrozenSlotSnapshot(row.slot_snapshot),
  }
}

/** Convert and validate an immutable customer-safe review projection. */
export function toDuitNowReviewView(row: unknown): DuitNowReviewView {
  if (!isRecord(row)) throw new Error("Invalid DuitNow review")
  if (
    typeof row.id !== "string" ||
    (row.outcome !== "confirmed" && row.outcome !== "rejected") ||
    typeof row.note !== "string" ||
    typeof row.created_at !== "string"
  ) {
    throw new Error("Invalid DuitNow review")
  }
  return {
    id: row.id,
    outcome: row.outcome,
    note: row.note,
    createdAt: row.created_at,
  }
}

// ---------- Display labels / formatting -------------------------------------

export const PAYMENT_METHOD_LABEL_MS: Record<PaymentMethod, string> = {
  tng: "Touch ’n Go (pindahan manual)",
  stripe: "Kad kredit / debit (Stripe)",
  duitnow: "DuitNow (pindahan manual)",
}

export const REVIEW_OUTCOME_LABEL_MS: Record<"confirmed" | "rejected", string> = {
  confirmed: "Disahkan",
  rejected: "Ditolak",
}

/** Format an integer sen amount as a Malay MYR string, e.g. `RM 49.00`. */
export function formatMyrFromSen(sen: number): string {
  return `RM ${(sen / 100).toFixed(2)}`
}

/** Event name for any stored card payload (Section-v2 or legacy). */
export function fulfillmentEventName(data: CardData): string {
  return getCardEventName(data)
}

// ---------- RPC error mapping -----------------------------------------------

/**
 * Translate a database RPC error code into a safe customer-facing Malay
 * message. Unknown errors fall back to a generic retry message so internals
 * never leak to the client.
 */
export function isPaymentConflict(message: string | null | undefined): boolean {
  return /^(SLOT_|ORDER_|REFERENCE_|ALREADY_|CHECKOUT_|DUITNOW_|MANUAL_|RECEIPT_|ATTEMPT_|REVIEW_|AMOUNT_|REMAINING_|PRIVATE_|INSUFFICIENT_|DUPLICATE_|FULFILLMENT_|DRAFT_|CARD_|TEMPLATE_|ACKNOWLEDGEMENT_)/.test((message ?? "").trim())
}

export function mapPaymentRpcError(message: string | null | undefined): string {
  switch ((message ?? "").trim()) {
    case "MANUAL_PAYMENT_ACTIVE":
      return "Bayaran QR sedang disemak atau telah dibayar sebahagian. Selesaikan baki melalui kaedah QR yang sama."
    case "MANUAL_REVIEW_REQUIRED":
      return "Bayaran manual hanya boleh disahkan selepas semakan resit oleh pentadbir."
    case "SLOT_INVALID":
      return "Slot DuitNow tidak sah."
    case "SLOT_UNAVAILABLE":
      return "Slot DuitNow ini tidak tersedia buat masa ini."
    case "SLOT_INCOMPLETE":
      return "Slot ini belum dikonfigurasi sepenuhnya."
    case "ORDER_NOT_FOUND":
      return "Pesanan tidak ditemui."
    case "ORDER_CLOSED":
      return "Pesanan ini sudah tidak menunggu bayaran."
    case "CHECKOUT_RECONCILIATION_REQUIRED":
      return "Sesi Stripe masih perlu ditutup dengan selamat sebelum rujukan DuitNow dihantar. Sila cuba lagi."
    case "CHECKOUT_SESSION_NOT_FOUND":
      return "Sesi Stripe tidak dapat disahkan. Sila cuba lagi."
    case "DUITNOW_REVIEW_PENDING":
      return "Rujukan DuitNow sedang menunggu semakan manual. Stripe boleh dipilih selepas semakan selesai."
    case "ALREADY_SUBMITTED":
      return "Anda sudah menghantar rujukan dan ia masih menunggu semakan."
    case "ALREADY_REVIEWED":
      return "Rujukan ini telah disemak."
    case "SUBMISSION_NOT_FOUND":
      return "Rujukan tidak ditemui."
    case "OUTCOME_INVALID":
      return "Keputusan semakan tidak sah."
    case "AMOUNT_INVALID":
      return "Jumlah bayaran tidak sah."
    case "INSUFFICIENT_AMOUNT_INVALID":
      return "Jumlah ini tidak sepadan dengan keputusan Baki belum dibayar. Semak jumlah diterima dan baki semasa."
    case "REMAINING_MISMATCH":
      return "Baki telah berubah. Muat semula semakan dan cuba lagi."
    case "PRIVATE_EVIDENCE_REQUIRED":
      return "Bukti peribadi diperlukan dan mesti berada dalam storan selamat."
    case "ATTEMPT_NOT_FOUND":
      return "Cubaan bayaran tidak ditemui."
    case "RECEIPT_NOT_FOUND":
      return "Resit tidak ditemui."
    case "RECEIPT_CHANGED":
      return "Resit ini telah diganti atau berubah. Muat semula baris semakan."
    case "STALE_REVIEW":
      return "Keputusan pendua telah berubah. Muat semula sebelum membetulkannya."
    case "REVIEW_CONFLICT":
      return "Pembetulan yang sama telah direkodkan dengan butiran berbeza. Muat semula sejarah."
    case "ALREADY_REVIEWED":
      return "Resit ini telah disemak."
    case "ORDER_ALREADY_PAID":
      return "Pesanan telah dibayar dan tidak boleh menerima keputusan separa baharu."
    case "DUPLICATE_INVALID":
      return "Bayaran pendua hanya boleh direkodkan selepas bayaran penuh."
    case "FULFILLMENT_SNAPSHOT_MISSING":
      return "Draf pesanan tidak tersedia untuk dikunci dengan selamat."
    case "ORDER_PAID":
      return "Pesanan ini telah dibayar."
    case "REFERENCE_INVALID":
      return "Rujukan tidak sah. Sila masukkan rujukan pindahan yang betul."
    case "FORBIDDEN":
      return "Tidak dibenarkan."
    case "ACKNOWLEDGEMENT_REQUIRED":
      return "Sahkan bahawa jemputan ini akan menjadi awam dan baca sahaja sebelum menerbitkan."
    case "DRAFT_VERSION_REQUIRED":
    case "DRAFT_VERSION_INVALID":
      return "Versi draf tidak sah. Muat semula dan cuba lagi."
    case "DRAFT_VERSION_CONFLICT":
      return "Draf telah berubah. Muat semula sebelum menyimpan atau menerbitkan semula."
    case "DRAFT_INVALID":
      return "Kandungan draf tidak sah."
    case "CARD_NOT_EDITABLE":
      return "Kad ini tidak lagi boleh disunting."
    case "CARD_NOT_PROMOTABLE":
      return "Draf berbayar tidak tersedia untuk penerbitan. Sila cuba lagi."
    case "TEMPLATE_MISMATCH":
      return "Template kad tidak boleh ditukar."
    default:
      return "Permintaan tidak dapat diproses. Sila cuba lagi."
  }
}

/** The five queue filters used by the administrator review workspace. */
export const MANUAL_OUTCOMES = [
  "pending",
  "insufficient",
  "rejected",
  "confirmed",
  "duplicate",
] as const

export type ManualOutcome = (typeof MANUAL_OUTCOMES)[number]

/** Durable ids stay `duitnow`/`tng`; these are the approved product labels. */
export const MANUAL_METHOD_LABEL: Record<"duitnow" | "tng", string> = {
  duitnow: "Bank DuitNow",
  tng: "Touch ’n Go",
}

/** Parse RM without floating-point rounding or silent truncation. */
export function parseRmAmount(value: string): number | null {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value)) return null
  const [ringgit, sen = ""] = value.split(".")
  const amount = Number(ringgit) * 100 + Number(sen.padEnd(2, "0"))
  return amount <= 999999999 ? amount : null
}

/** Customer states that need the configured operational support channels. */
export function manualPaymentNeedsSupport(state: ManualPaymentStatus): boolean {
  return (
    state.outcome === "rejected" ||
    state.outcome === "insufficient" ||
    state.outcome === "duplicate" ||
    (state.outcome === "confirmed" && state.excessSen > 0)
  )
}
