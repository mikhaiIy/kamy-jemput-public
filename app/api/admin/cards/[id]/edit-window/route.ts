import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { reason, requestId } = body as { reason?: unknown; requestId?: unknown }
  if (
    typeof reason !== "string" ||
    reason.trim() !== reason ||
    reason.trim().length === 0 ||
    new TextEncoder().encode(reason).length > 500
  ) {
    return Response.json({ error: "A bounded reason is required" }, { status: 400 })
  }
  if (typeof requestId !== "string" || !UUID_RE.test(requestId)) {
    return Response.json({ error: "A valid request id is required" }, { status: 400 })
  }

  const { data: result, error } = await supabaseAdmin.rpc("open_card_edit_window", {
    p_card_id: id,
    p_admin_id: user.id,
    p_reason: reason,
    p_request_id: requestId,
  })
  if (error) {
    const message = error.message
    if (message.includes("CARD_NOT_FOUND")) return Response.json({ error: "Card not found" }, { status: 404 })
    if (message.includes("FORBIDDEN")) return Response.json({ error: "Forbidden" }, { status: 403 })
    if (message.includes("RETIRED")) {
      return Response.json({ error: "This invitation has been retired and cannot be reopened", code: "RETIRED" }, { status: 409 })
    }
    if (message.includes("REPLACEMENT_PENDING")) {
      return Response.json({ error: "A replacement is already being prepared", code: "REPLACEMENT_PENDING" }, { status: 409 })
    }
    if (message.includes("EDIT_WINDOW_ACTIVE")) {
      return Response.json({ error: "An edit window is already active", code: "EDIT_WINDOW_ACTIVE" }, { status: 409 })
    }
    if (message.includes("CARD_UNAVAILABLE") || message.includes("CARD_NOT_PUBLISHED")) {
      return Response.json(
        {
          error: "The invitation is not available for an edit window",
          code: message.includes("CARD_UNAVAILABLE") ? "CARD_UNAVAILABLE" : "CARD_NOT_PUBLISHED",
        },
        { status: 409 },
      )
    }
    if (message.includes("REASON_INVALID")) return Response.json({ error: "A bounded reason is required" }, { status: 400 })
    if (message.includes("EDIT_WINDOW_CORRUPT") || message.includes("CURRENT_PUBLICATION_MISSING")) {
      return Response.json({ error: "The invitation has an invalid publication pointer", code: "EDIT_WINDOW_CORRUPT" }, { status: 409 })
    }
    console.error("Edit window grant failed:", id, message)
    return Response.json({ error: "Edit window could not be opened" }, { status: 500 })
  }

  const window = result as { windowId?: string; expiresAt?: string; replayed?: boolean } | null
  const { data: card } = await supabaseAdmin.from("cards").select("slug").eq("id", id).maybeSingle()
  revalidatePath(`/admin/cards/${id}`)
  revalidatePath("/admin/orders")
  revalidatePath("/admin/cards")
  if (card?.slug) revalidatePath(`/i/${card.slug}`)

  return Response.json(
    {
      ok: true,
      replayed: window?.replayed === true,
      windowId: window?.windowId ?? null,
      expiresAt: window?.expiresAt ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
