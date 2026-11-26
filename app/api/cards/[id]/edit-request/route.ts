import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REQUEST_REASON_ERROR = "Masukkan sebab antara 1 hingga 500 bait tanpa ruang di hujung."

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
  if (!UUID_RE.test(id)) return response({ error: "Jemputan tidak ditemui." }, 404)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return response({ error: "Permintaan tidak sah." }, 400)
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response({ error: "Permintaan tidak sah." }, 400)
  }

  const { reason, requestId } = body as {
    reason?: unknown
    requestId?: unknown
  }
  if (
    typeof reason !== "string" ||
    reason.length === 0 ||
    reason.trim() !== reason ||
    new TextEncoder().encode(reason).length > 500
  ) {
    return response({ error: REQUEST_REASON_ERROR }, 400)
  }
  if (typeof requestId !== "string" || !UUID_RE.test(requestId)) {
    return response({ error: "ID permintaan tidak sah." }, 400)
  }

  const { data: result, error } = await supabaseAdmin.rpc(
    "submit_card_edit_request",
    {
      p_card_id: id,
      p_owner_id: user.id,
      p_reason: reason,
      p_request_id: requestId,
    },
  )

  if (error) {
    const message = error.message
    if (message.includes("CARD_NOT_FOUND") || message.includes("FORBIDDEN")) {
      // Keep ownership checks indistinguishable from a missing invitation.
      return response({ error: "Jemputan tidak ditemui." }, 404)
    }
    if (message.includes("REASON_INVALID") || message.includes("REQUEST_ID_REQUIRED")) {
      return response({ error: REQUEST_REASON_ERROR }, 400)
    }
    if (message.includes("REQUEST_REPLAY_MISMATCH")) {
      return response({ error: "ID permintaan ini telah digunakan dengan sebab lain." }, 409)
    }
    if (message.includes("REQUEST_ALREADY_PENDING")) {
      return response({
        error: "Satu permintaan untuk jemputan ini sedang menunggu semakan.",
        code: "REQUEST_ALREADY_PENDING",
      }, 409)
    }
    if (
      message.includes("REQUEST_NOT_ELIGIBLE") ||
      message.includes("CARD_UNAVAILABLE") ||
      message.includes("TEMPLATE_MISMATCH")
    ) {
      return response({
        error: "Jemputan ini tidak lagi tersedia untuk permintaan suntingan.",
        code: "REQUEST_NOT_ELIGIBLE",
      }, 409)
    }
    console.error("Customer edit request failed:", id, message)
    return response({ error: "Permintaan suntingan tidak dapat dihantar." }, 500)
  }

  revalidatePath("/dashboard")
  return response({ ok: true, request: result })
}
