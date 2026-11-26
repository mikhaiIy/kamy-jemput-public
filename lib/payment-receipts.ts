import { createHash } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

export const RECEIPT_BUCKET = "payment-receipts"
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

// Inspect bytes, including framing/truncation checks. Client names and declared
// MIME types are never used to choose a Storage path or response Content-Type.
export function inspectReceipt(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_RECEIPT_BYTES)
    throw new Error("Fail mesti berukuran 1 bait hingga 5 MB.")
  const b = Buffer.from(bytes)
  let contentType: string | null = null
  if (b.subarray(0, 5).toString() === "%PDF-" && /%%EOF\s*$/.test(b.subarray(-1024).toString()))
    contentType = "application/pdf"
  if (
    b.length >= 24 &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    b.subarray(12, 16).toString() === "IHDR" &&
    b.subarray(-8, -4).toString() === "IEND"
  )
    contentType = "image/png"
  if (
    b.length >= 4 &&
    b[0] === 255 &&
    b[1] === 216 &&
    b[2] === 255 &&
    b[b.length - 2] === 255 &&
    b[b.length - 1] === 217
  )
    contentType = "image/jpeg"
  if (
    b.length >= 20 &&
    b.subarray(0, 4).toString() === "RIFF" &&
    b.readUInt32LE(4) === b.length - 8 &&
    b.subarray(8, 12).toString() === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(b.subarray(12, 16).toString())
  )
    contentType = "image/webp"
  if (!contentType) throw new Error("Fail tidak sah atau rosak. Gunakan PDF, JPEG, PNG atau WebP.")
  return { contentType, sizeBytes: b.length, sha256: createHash("sha256").update(b).digest("hex") }
}

export type ManualPaymentState = {
  attempt: {
    id: string
    method: "duitnow" | "tng"
    state: string
    prior_attempt_id?: string | null
    slot_snapshot: { payeeName: string; qrImageUrl: string; provider: string; instructions: string }
  } | null
  receipt: {
    id: string
    version: number
    content_type: string
    size_bytes: number
    transfer_reference: string
    created_at: string
    access: string
  } | null
  review: {
    outcome: string
    received_amount_sen: number
    credited_amount_sen: number
    remaining_amount_sen: number
    excess_amount_sen: number
    reason: string
  } | null
  receivedSen: number
  creditedSen: number
  remainingSen: number
  excessSen: number
  paidDraft: boolean
  orderStatus: string | null
}

export async function loadManualPayment(
  db: SupabaseClient,
  orderId: string,
  price: number,
): Promise<ManualPaymentState> {
  const { data, error } = await db.rpc("manual_payment_state", { p_order: orderId })
  if (error) throw new Error("Status resit tidak dapat dimuatkan.")
  if (!data || typeof data !== "object") throw new Error("Status resit tidak dapat dimuatkan.")
  const receivedSen = Number(data.receivedSen ?? 0)
  const creditedSen = Number(data.creditedSen ?? 0)
  return {
    ...data,
    receivedSen,
    creditedSen,
    remainingSen: Math.max(0, price - creditedSen),
    excessSen: Math.max(0, receivedSen - price),
    paidDraft: data.paidDraft === true,
    orderStatus: typeof data.orderStatus === "string" ? data.orderStatus : null,
  }
}

// All content is streamed through a fresh authorization check, without bearer
// signed URLs. Prior versions are never accessible to a customer, even by ID.
export async function readReceipt(
  db: SupabaseClient,
  userId: string,
  orderId: string,
  receiptId: string,
): Promise<Response> {
  const missing = () => Response.json({ error: "Resit tidak tersedia." }, { status: 404 })
  if (!isUuid(receiptId) || !isUuid(orderId)) return missing()
  const { data: profile, error: profileError } = await db
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle()
  if (profileError) return Response.json({ error: "Akses tidak dapat disahkan." }, { status: 503 })
  const { data: order, error: orderError } = await db
    .from("orders")
    .select("entitlement_source")
    .eq("id", orderId)
    .maybeSingle()
  if (orderError) return Response.json({ error: "Akses tidak dapat disahkan." }, { status: 503 })
  if (order?.entitlement_source === "controlled_replacement") return missing()
  const { data: receipt, error } = await db
    .from("payment_receipts")
    .select(
      "*, manual_payment_attempts!payment_receipts_attempt_id_fkey(order_id,user_id,current_receipt_id), payment_receipt_access(state)",
    )
    .eq("id", receiptId)
    .maybeSingle()
  if (error) return Response.json({ error: "Resit tidak dapat dimuatkan." }, { status: 503 })
  if (!receipt) return missing()
  const attempt = receipt.manual_payment_attempts
  if (
    attempt.order_id !== orderId ||
    (profile?.role !== "admin" &&
      (attempt.user_id !== userId || attempt.current_receipt_id !== receiptId))
  )
    return missing()
  if (profile?.role !== "admin") {
    const { data: current, error: currentError } = await db
      .from("manual_payment_attempts")
      .select("current_receipt_id")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (currentError)
      return Response.json({ error: "Akses tidak dapat disahkan." }, { status: 503 })
    if (current?.current_receipt_id !== receiptId) return missing()
  }
  if (receipt.payment_receipt_access?.state !== "available") return missing()
  const { data: file, error: downloadError } = await db.storage
    .from(RECEIPT_BUCKET)
    .download(receipt.object_path)
  if (downloadError || !file)
    return Response.json({ error: "Resit tidak dapat dimuat turun. Cuba semula." }, { status: 503 })
  return new Response(file, {
    headers: {
      "Content-Type": receipt.content_type,
      "Content-Disposition": `attachment; filename="receipt-${receipt.id}.${({ "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[receipt.content_type]}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  })
}

export async function uploadReceipt(
  db: SupabaseClient,
  owner: string,
  orderId: string,
  form: FormData,
) {
  const file = form.get("receipt")
  const receiptId = form.get("operationId")
  const method = form.get("method")
  const attempt = form.get("attemptId") || null
  const expected = form.get("expectedReceiptId") || null
  const reference = String(form.get("reference") ?? "").trim()
  if (!(file instanceof File))
    throw new Error("Sila muat naik satu resit sebelum menghantar bayaran.")
  if (
    !isUuid(receiptId) ||
    (attempt !== null && !isUuid(attempt)) ||
    (expected !== null && !isUuid(expected))
  )
    throw new Error("Permintaan resit tidak sah.")
  if (method !== "duitnow" && method !== "tng") throw new Error("Kaedah bayaran tidak sah.")
  if (reference && !/^[A-Za-z0-9][A-Za-z0-9 .,&+\-/():#@']{2,63}$/.test(reference))
    throw new Error("Rujukan pilihan mesti mengandungi 3–64 aksara yang sah.")
  // Ownership is checked before any Storage operation, and again in the RPC.
  const { data: order, error } = await db
    .from("orders")
    .select("user_id,status,manual_paid_draft,payment_method,entitlement_source")
    .eq("id", orderId)
    .maybeSingle()
  if (error) throw new Error("Pesanan tidak dapat dimuatkan. Cuba semula.")
  if (!order || order.user_id !== owner) throw new Error("Pesanan tidak ditemui.")
  if (order.entitlement_source === "controlled_replacement") {
    throw new Error("Penggantian diluluskan pentadbir tidak menerima resit atau bayaran baharu.")
  }
  if (file.size > MAX_RECEIPT_BYTES) throw new Error("Saiz maksimum resit ialah 5 MB.")
  const bytes = new Uint8Array(await file.arrayBuffer())
  const meta = inspectReceipt(bytes)
  const path = `${orderId}/${receiptId}/${meta.sha256}`
  const { data: previous, error: previousError } = await db
    .from("payment_receipts")
    .select(
      "id,sha256,object_path,attempt_id,transfer_reference,manual_payment_attempts!payment_receipts_attempt_id_fkey(method,slot_snapshot)",
    )
    .eq("id", receiptId)
    .maybeSingle()
  if (previousError) throw new Error("Status muat naik tidak dapat disahkan. Cuba semula.")
  if (previous) {
    const originalAttempt = Array.isArray(previous.manual_payment_attempts)
      ? previous.manual_payment_attempts[0]
      : previous.manual_payment_attempts
    if (
      !originalAttempt ||
      originalAttempt.method !== method ||
      (attempt === null &&
        method === "duitnow" &&
        originalAttempt.slot_snapshot.slotNumber !== Number(form.get("slotNumber"))) ||
      previous.object_path !== path ||
      previous.sha256 !== meta.sha256 ||
      previous.transfer_reference !== reference ||
      (attempt && previous.attempt_id !== attempt)
    )
      throw new Error("Permintaan berulang tidak sepadan dengan resit asal.")
    return { attemptId: previous.attempt_id, receiptId }
  }
  if (!attempt && method === "duitnow" && Number(form.get("slotNumber")) !== 1)
    throw new Error("Pilihan QR bank tidak sah.")
  // A confirmed payment may still receive a same-method replacement receipt
  // for the existing manual audit. This does not create another paid draft.
  const paidDraftUpload =
    order.status === "paid" &&
    order.manual_paid_draft === true &&
    order.payment_method === method
  if (order.status !== "pending" && !paidDraftUpload)
    throw new Error("Pesanan ini sudah tidak menerima resit baharu.")
  // Never overwrite. A retry verifies the previously stored bytes before
  // attaching metadata. Ambiguous Storage/DB failures keep the same operation ID.
  const bucket = db.storage.from(RECEIPT_BUCKET)
  const { error: storageError } = await bucket.upload(path, bytes, {
    contentType: meta.contentType,
    upsert: false,
  })
  if (storageError) {
    const { data: existing, error: readError } = await bucket.download(path)
    if (
      readError ||
      !existing ||
      createHash("sha256")
        .update(Buffer.from(await existing.arrayBuffer()))
        .digest("hex") !== meta.sha256
    )
      throw new Error("Muat naik gagal. Fail pilihan dikekalkan; sila cuba semula.")
  }
  const { data, error: attachError } = await db.rpc("submit_manual_receipt", {
    p_owner: owner,
    p_order_id: orderId,
    p_receipt_id: receiptId,
    p_attempt_id: attempt,
    p_expected_receipt: expected,
    p_method: method,
    p_slot: Number(form.get("slotNumber")) || null,
    p_reference: reference,
    p_path: path,
    p_type: meta.contentType,
    p_size: meta.sizeBytes,
    p_sha: meta.sha256,
  })
  if (attachError)
    throw new Error(
      "Resit belum dihantar. Semak status bayaran dan cuba semula; kaedah atau resit mungkin telah berubah.",
    )
  return { attemptId: data, receiptId }
}
