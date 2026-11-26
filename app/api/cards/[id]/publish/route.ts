import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  isPaidDraftPublicationAcknowledgement,
  PAID_DRAFT_PUBLICATION_ACKNOWLEDGEMENT,
} from "@/lib/publication"
import { sendOrderConfirmedEmail } from "@/lib/resend"

export const dynamic = "force-dynamic"

type PublishResult = {
  published?: boolean
  replayed?: boolean
  revision?: boolean
  state?: "published" | "unavailable"
  slug?: string
  eventName?: string
  draftVersion?: number
  publishedAt?: string | null
  publicationId?: string
  revisionNumber?: number
}

/**
 * Owner-only first publication of a paid draft. Payment confirmation never
 * calls this route. The database re-checks owner, payment, template, state,
 * acknowledgement and draft version while holding the order then card locks.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { data: card, error: cardError } = await supabaseAdmin
    .from("cards")
    .select("id, user_id, draft_version, published_at")
    .eq("id", id)
    .maybeSingle()
  if (cardError) {
    console.error("Publication card lookup failed:", id, cardError.message)
    return Response.json({ error: "Publication failed" }, { status: 500 })
  }
  if (!card || card.user_id !== user.id) {
    return Response.json({ error: "Card not found" }, { status: 404 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return Response.json({ error: "Invalid publication body" }, { status: 400 })
  }
  const body = rawBody as {
    acknowledged?: unknown
    acknowledgement?: unknown
    expectedDraftVersion?: unknown
    draftVersion?: unknown
    editWindowId?: unknown
  }

  if (
    body.acknowledged !== true ||
    !isPaidDraftPublicationAcknowledgement(body.acknowledgement)
  ) {
    return Response.json(
      { error: PAID_DRAFT_PUBLICATION_ACKNOWLEDGEMENT },
      { status: 400 }
    )
  }

  const hasEditWindowIntent = Object.prototype.hasOwnProperty.call(body, "editWindowId")
  if (
    hasEditWindowIntent &&
    (typeof body.editWindowId !== "string" || !body.editWindowId)
  ) {
    return Response.json({ error: "Invalid edit window" }, { status: 400 })
  }
  // Operation intent is carried by the request shape, not inferred from the
  // historical published_at flag. A lost first-publication response retries
  // publish_paid_draft without an editWindowId; a revision retry carries the
  // exact window id. The database validates the original version/pointer and
  // rejects a stale first request after a later window/publication.
  const isRevisionPublication = hasEditWindowIntent

  const rawVersion = body.expectedDraftVersion ?? body.draftVersion
  if (
    typeof rawVersion !== "number" ||
    !Number.isSafeInteger(rawVersion) ||
    rawVersion < 1
  ) {
    return Response.json({ error: "Invalid draft version" }, { status: 400 })
  }

  const { data, error } = isRevisionPublication
    ? await supabaseAdmin.rpc("publish_card_revision", {
        p_card_id: id,
        p_owner: user.id,
        p_edit_window_id: body.editWindowId,
        p_acknowledgement: body.acknowledgement,
        p_expected_draft_version: rawVersion,
      })
    : await supabaseAdmin.rpc("publish_paid_draft", {
        p_card_id: id,
        p_owner: user.id,
        p_acknowledgement: body.acknowledgement,
        p_expected_draft_version: rawVersion,
      })
  if (error) {
    const message = error.message
    if (message.includes("ACKNOWLEDGEMENT_REQUIRED")) {
      return Response.json(
        { error: PAID_DRAFT_PUBLICATION_ACKNOWLEDGEMENT },
        { status: 400 }
      )
    }
    if (message.includes("CARD_NOT_FOUND")) {
      return Response.json({ error: "Card not found" }, { status: 404 })
    }
    if (message.includes("FORBIDDEN")) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (message.includes("RETIRED")) {
      return Response.json(
        { error: "Jemputan ini telah dihentikan kekal dan tidak boleh diterbitkan semula.", code: "RETIRED" },
        { status: 409 },
      )
    }
    if (message.includes("CONTROLLED_REPLACEMENT_CUTOVER_REQUIRED")) {
      return Response.json(
        { error: "Penggantian pentadbir hanya boleh diterbitkan melalui potong ganti pentadbir.", code: "CONTROLLED_REPLACEMENT_CUTOVER_REQUIRED" },
        { status: 409 },
      )
    }
    if (
      message.includes("ORDER_NOT_PAID") ||
      message.includes("CARD_NOT_PROMOTABLE") ||
      message.includes("DRAFT_VERSION_CONFLICT") ||
      message.includes("TEMPLATE_MISMATCH") ||
      message.includes("CARD_NOT_FIRST_PUBLICATION")
    ) {
      return Response.json(
        { error: "Kad tidak boleh diterbitkan dalam keadaan semasa. Muat semula dan cuba lagi." },
        { status: 409 }
      )
    }
    if (
      message.includes("EDIT_WINDOW_EXPIRED") ||
      message.includes("EDIT_WINDOW_NOT_ACTIVE") ||
      message.includes("EDIT_WINDOW_SUPERSEDED") ||
      message.includes("EDIT_WINDOW_CORRUPT") ||
      message.includes("CARD_UNAVAILABLE") ||
      message.includes("CURRENT_PUBLICATION_MISSING")
    ) {
      return Response.json(
        {
          error: "Tetingkap suntingan tidak lagi boleh menerbitkan perubahan.",
          code:
            message.match(/EDIT_WINDOW_[A-Z_]+|CARD_UNAVAILABLE|CURRENT_PUBLICATION_MISSING/)?.[0] ??
            "EDIT_WINDOW_NOT_ACTIVE",
        },
        { status: 409 },
      )
    }
    console.error("Paid-draft publication failed:", id, message)
    return Response.json({ error: "Publication failed" }, { status: 500 })
  }

  const result = data as PublishResult | null
  if (!result || result.published !== true) {
    if (result?.state === "unavailable") {
      return Response.json(
        { error: "Jemputan ini dinyahterbitkan oleh pentadbir dan tidak boleh diterbitkan." },
        { status: 409 }
      )
    }
    return Response.json({ error: "Kad tidak boleh diterbitkan dalam keadaan semasa." }, { status: 409 })
  }

  // Email is deliberately after the committed first publication. A replay
  // never sends a second notification or reconstructs a public link.
  if (!result.replayed && result.revision !== true && result.slug && user.email) {
    try {
      await sendOrderConfirmedEmail({
        to: user.email,
        cardSlug: result.slug,
        eventName: result.eventName ?? "your event",
      })
    } catch (emailError) {
      console.error("Failed to send publication email:", emailError)
    }
  }

  return Response.json({
    ok: true,
    published: true,
    replayed: result.replayed === true,
    revision: result.revision === true,
    state: "published",
    cardSlug: result.slug ?? null,
    draftVersion: result.draftVersion ?? card.draft_version,
    publishedAt: result.publishedAt ?? null,
  })
}
