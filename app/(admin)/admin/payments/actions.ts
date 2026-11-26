"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  isUuid,
  inspectReceipt,
  MAX_RECEIPT_BYTES,
} from "@/lib/payment-receipts"
import { mapPaymentRpcError } from "@/lib/payments"

async function requireAdminUser(): Promise<
  { ok: true; userId: string } | { ok: false }
> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") return { ok: false }
  return { ok: true, userId: user.id }
}

function cleanReason(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 1000) : ""
}

function refreshPaymentSurfaces() {
  revalidatePath("/admin")
  revalidatePath("/admin/payments")
  revalidatePath("/dashboard", "layout")
}

export type ReviewResult = {
  id?: string
  error?: string
  message?: string
  outcome?: string
  received_sen?: number
  credited_sen?: number
  remaining_sen?: number
  excess_sen?: number
  won?: boolean
  replayed?: boolean
  duplicate?: boolean
}

/**
 * Store administrator-only evidence in a separate private bucket. The file
 * is inspected from bytes, and the returned path is an opaque server-created
 * reference; the review RPC checks its order prefix and private object before
 * recording it.
 */
export async function uploadReviewEvidenceAction(
  form: FormData,
): Promise<{ path?: string; error?: string }> {
  const auth = await requireAdminUser()
  if (!auth.ok) return { error: "Tidak dibenarkan." }
  const orderId = form.get("orderId")
  const file = form.get("file")
  if (!isUuid(orderId) || !(file instanceof File)) {
    return { error: "Fail bukti tidak sah." }
  }
  if (file.size < 1 || file.size > MAX_RECEIPT_BYTES) {
    return { error: "Fail mesti berukuran 1 bait hingga 5 MB." }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  let evidence
  try {
    evidence = inspectReceipt(bytes)
  } catch {
    return { error: "Fail bukti mesti PDF, JPEG, PNG atau WebP yang sah." }
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, entitlement_source")
    .eq("id", orderId)
    .maybeSingle()
  if (orderError || !order) return { error: "Pesanan tidak ditemui." }
  if (order.entitlement_source === "controlled_replacement") {
    return { error: "Penggantian diluluskan pentadbir tidak menerima bukti bayaran." }
  }

  const path = `review-evidence/${orderId}/${randomUUID()}/${evidence.sha256}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from("payment-review-evidence")
    .upload(path, bytes, {
      contentType: evidence.contentType,
      upsert: false,
    })
  if (uploadError) {
    return { error: "Bukti peribadi tidak dapat disimpan. Cuba semula." }
  }

  // Local Storage records MIME and size metadata. Store a SHA in metadata too
  // so the immutable review row can retain a complete evidence reference.
  // A second metadata update is deliberately avoided: the path contains the
  // hash and the RPC verifies object existence before recording the reference.
  return { path }
}

export async function reviewManualPaymentAction(input: {
  attemptId: string
  outcome: "confirmed" | "insufficient" | "rejected"
  receivedSen: number
  remainingSen: number | null
  reason: string
  evidenceObjectPath?: string | null
  expectedReviewId?: string | null
}): Promise<ReviewResult> {
  const auth = await requireAdminUser()
  if (!auth.ok) return { error: "Tidak dibenarkan." }
  if (
    !isUuid(input.attemptId) ||
    !["confirmed", "insufficient", "rejected"].includes(input.outcome) ||
    !Number.isSafeInteger(input.receivedSen) ||
    input.receivedSen < 0 ||
    input.receivedSen > 999999999 ||
    typeof input.reason !== "string" ||
    input.reason.length > 1000 ||
    (input.remainingSen !== null &&
      (!Number.isSafeInteger(input.remainingSen) || input.remainingSen < 0)) ||
    (input.expectedReviewId !== null &&
      input.expectedReviewId !== undefined &&
      !isUuid(input.expectedReviewId))
  ) {
    return { error: "Butiran semakan tidak sah." }
  }
  const reason = cleanReason(input.reason)
  if ((input.outcome === "rejected" || input.outcome === "insufficient") && !reason) {
    return { error: "Sebab wajib diisi untuk keputusan ini." }
  }
  if (input.outcome === "rejected" && input.receivedSen !== 0) {
    return { error: "Keputusan ditolak mesti merekodkan RM0.00 diterima." }
  }

  const evidenceObjectPath = input.evidenceObjectPath?.trim() || null
  const { data, error } = await supabaseAdmin.rpc("admin_review_manual_payment", {
    p_admin_id: auth.userId,
    p_attempt_id: input.attemptId,
    p_outcome: input.outcome,
    p_received_sen: input.receivedSen,
    p_remaining_sen: input.remainingSen,
    p_reason: reason,
    p_evidence_object_path: evidenceObjectPath,
    p_expected_review_id: input.expectedReviewId ?? null,
  })
  if (error) return { error: mapPaymentRpcError(error.message) }

  refreshPaymentSurfaces()
  const result = (data ?? {}) as Record<string, unknown>
  const outcome = typeof result.outcome === "string" ? result.outcome : input.outcome
  return {
    id: typeof result.id === "string" ? result.id : undefined,
    outcome,
    received_sen: Number(result.receivedSen ?? 0),
    credited_sen: Number(result.creditedSen ?? 0),
    remaining_sen: Number(result.remainingSen ?? 0),
    excess_sen: Number(result.excessSen ?? 0),
    won: result.won === true,
    replayed: result.replayed === true,
    duplicate: result.duplicate === true,
    message:
      result.replayed === true
        ? "Keputusan yang sama telah direkodkan sebelum ini."
        : result.won === true
          ? "Bayaran lengkap. Satu draf berbayar dibuka untuk pemilik; jemputan belum diterbitkan."
          : result.duplicate === true
            ? "Bayaran tambahan direkodkan untuk sokongan. Tiada draf berbayar tambahan."
            : outcome === "rejected"
              ? "Resit ditolak. Pemilik boleh menghantar resit yang dibetulkan."
              : `Keputusan direkodkan. Baki ${formatRinggit(Number(result.remainingSen ?? 0))}.`,
  }
}

function formatRinggit(sen: number): string {
  return `RM ${(sen / 100).toFixed(2)}`
}

/** Compatibility wrapper for the #69 receipt action signature. */
export async function reviewReceiptAction(
  receiptId: string,
  outcome: "confirmed" | "rejected",
  amountSen: number,
  reason: string,
): Promise<ReviewResult> {
  const auth = await requireAdminUser()
  if (!auth.ok) return { error: "Tidak dibenarkan." }
  if (!isUuid(receiptId)) return { error: "Resit tidak ditemui." }
  const { data: receipt, error: receiptError } = await supabaseAdmin
    .from("payment_receipts")
    .select("attempt_id")
    .eq("id", receiptId)
    .maybeSingle()
  if (receiptError || !receipt) return { error: "Resit tidak ditemui." }

  const { data, error } = await supabaseAdmin.rpc("review_manual_receipt", {
    p_admin: auth.userId,
    p_receipt: receiptId,
    p_outcome: outcome,
    p_amount: outcome === "rejected" ? 0 : amountSen,
    p_reason: cleanReason(reason),
  })
  if (error) return { error: mapPaymentRpcError(error.message) }
  refreshPaymentSurfaces()
  const result = (data ?? {}) as Record<string, unknown>
  return {
    id: typeof result.id === "string" ? result.id : undefined,
    outcome: typeof result.outcome === "string" ? result.outcome : outcome,
    received_sen: Number(result.receivedSen ?? 0),
    credited_sen: Number(result.creditedSen ?? 0),
    remaining_sen: Number(result.remainingSen ?? 0),
    excess_sen: Number(result.excessSen ?? 0),
    won: result.won === true,
    replayed: result.replayed === true,
    duplicate: result.duplicate === true,
    message:
      result.won === true
        ? "Bayaran lengkap. Satu draf berbayar dibuka; jemputan belum diterbitkan."
        : "Keputusan bayaran direkodkan.",
  }
}

/** Legacy history control. It can annotate an old row, but never publishes. */
export async function reviewDuitNowSubmissionAction(
  submissionId: string,
  outcome: "confirmed" | "rejected",
  note: string,
): Promise<ReviewResult> {
  const auth = await requireAdminUser()
  if (!auth.ok) return { error: "Tidak dibenarkan." }
  if (!isUuid(submissionId) || !["confirmed", "rejected"].includes(outcome)) {
    return { error: "Keputusan tidak sah." }
  }
  const { data, error } = await supabaseAdmin.rpc("admin_review_duitnow_submission", {
    p_admin_id: auth.userId,
    p_submission_id: submissionId,
    p_outcome: outcome,
    p_note: cleanReason(note),
  })
  if (error) return { error: mapPaymentRpcError(error.message) }
  refreshPaymentSurfaces()
  const result = (data ?? {}) as Record<string, unknown>
  return {
    won: false,
    message:
      outcome === "confirmed"
        ? "Rekod lama ditanda untuk sejarah. Resit peribadi masih diperlukan; jemputan belum diterbitkan."
        : "Rujukan lama ditolak dan sejarah dikekalkan.",
    replayed: result.replayed === true,
  }
}

export async function manageReceiptAction(
  receiptId: string,
  action: "quarantined" | "removing",
  category: string,
  reason: string,
) {
  const auth = await requireAdminUser()
  if (!auth.ok) return { error: "Tidak dibenarkan." }
  if (
    !isUuid(receiptId) ||
    !["quarantined", "removing"].includes(action) ||
    !["harmful-file", "legal", "operational"].includes(category) ||
    !cleanReason(reason)
  ) {
    return { error: "Kategori dan sebab wajib diisi." }
  }
  const args = {
    p_admin: auth.userId,
    p_receipt: receiptId,
    p_action: action,
    p_category: category,
    p_reason: cleanReason(reason),
  }
  const { data: path, error } = await supabaseAdmin.rpc("manage_payment_receipt", args)
  if (error || typeof path !== "string") {
    return { error: mapPaymentRpcError(error?.message) }
  }
  if (action === "removing") {
    const { error: removeError } = await supabaseAdmin.storage
      .from("payment-receipts")
      .remove([path])
    if (removeError) {
      return { error: "Akses disekat, tetapi pemadaman fail gagal. Cuba semula." }
    }
    const { error: finishError } = await supabaseAdmin.rpc("manage_payment_receipt", {
      ...args,
      p_action: "removed",
    })
    if (finishError) {
      return { error: "Fail dibuang; rekod penyiapan belum disahkan. Cuba semula." }
    }
  }
  refreshPaymentSurfaces()
  return { message: "Tindakan fail direkodkan. Sejarah bayaran dikekalkan." }
}
