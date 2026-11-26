import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REASON_ERROR = "Masukkan sebab antara 1 hingga 500 bait tanpa ruang di hujung."

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return response({ error: "Sila log masuk dahulu." }, 401)
  if (!UUID_RE.test(id)) return response({ error: "Permintaan tidak ditemui." }, 404)

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "admin") return response({ error: "Akses pentadbir diperlukan." }, 403)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return response({ error: "Permintaan tidak sah." }, 400)
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response({ error: "Permintaan tidak sah." }, 400)
  }
  const { decision, reason, decisionRequestId } = body as {
    decision?: unknown
    reason?: unknown
    decisionRequestId?: unknown
  }
  if (decision !== "approve" && decision !== "reject") {
    return response({ error: "Keputusan tidak sah." }, 400)
  }
  if (typeof decisionRequestId !== "string" || !UUID_RE.test(decisionRequestId)) {
    return response({ error: "ID keputusan tidak sah." }, 400)
  }
  if (
    decision === "reject" &&
    (typeof reason !== "string" ||
      reason.length === 0 ||
      reason.trim() !== reason ||
      new TextEncoder().encode(reason).length > 500)
  ) {
    return response({ error: REASON_ERROR }, 400)
  }
  if (
    decision === "approve" &&
    reason !== undefined &&
    reason !== null &&
    (typeof reason !== "string" ||
      reason.trim() !== reason ||
      new TextEncoder().encode(reason).length > 500)
  ) {
    return response({ error: REASON_ERROR }, 400)
  }

  const { data: result, error } = await supabaseAdmin.rpc(
    "review_card_edit_request",
    {
      p_request_id: id,
      p_admin_id: user.id,
      p_decision: decision,
      p_decision_reason: decision === "reject" ? reason : null,
      p_decision_request_id: decisionRequestId,
    },
  )

  if (error) {
    const message = error.message
    if (message.includes("REQUEST_NOT_FOUND") || message.includes("CARD_NOT_FOUND")) {
      return response({ error: "Permintaan tidak ditemui." }, 404)
    }
    if (message.includes("FORBIDDEN")) return response({ error: "Akses pentadbir diperlukan." }, 403)
    if (
      message.includes("REASON_INVALID") ||
      message.includes("DECISION_INVALID") ||
      message.includes("DECISION_REQUEST_ID_REQUIRED")
    ) {
      return response({ error: message.includes("REASON") ? REASON_ERROR : "Keputusan tidak sah." }, 400)
    }
    if (message.includes("REQUEST_ALREADY_DECIDED") || message.includes("REQUEST_DECISION_CONFLICT")) {
      return response({
        error: "Permintaan ini telah diputuskan oleh pentadbir lain.",
        code: "REQUEST_ALREADY_DECIDED",
      }, 409)
    }
    console.error("Customer edit request review failed:", id, message)
    return response({ error: "Keputusan permintaan tidak dapat disimpan." }, 500)
  }

  const { data: requestRow } = await supabaseAdmin
    .from("card_edit_requests")
    .select("card_id")
    .eq("id", id)
    .maybeSingle()
  if (requestRow?.card_id) {
    const { data: card } = await supabaseAdmin
      .from("cards")
      .select("slug")
      .eq("id", requestRow.card_id)
      .maybeSingle()
    revalidatePath(`/admin/cards/${requestRow.card_id}`)
    if (card?.slug) revalidatePath(`/i/${card.slug}`)
  }
  revalidatePath("/admin")
  revalidatePath("/admin/edit-requests")
  revalidatePath("/dashboard")
  return response({ ok: true, request: result })
}
