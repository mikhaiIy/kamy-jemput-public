import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Authenticate
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ownership check
  const { data: card, error: cardError } = await supabaseAdmin
    .from("cards")
    .select("id, user_id")
    .eq("id", id)
    .single()

  if (cardError || !card || card.user_id !== user.id) {
    return Response.json({ error: "Card not found" }, { status: 404 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return Response.json({ error: "Invalid draft body" }, { status: 400 })
  }

  const body = rawBody as {
    draft?: unknown
    expectedDraftVersion?: unknown
    draftVersion?: unknown
  }

  if (!body.draft || typeof body.draft !== "object" || Array.isArray(body.draft)) {
    return Response.json({ error: "Missing draft body" }, { status: 400 })
  }

  // Accept the descriptive legacy field name while requiring every client to
  // carry the version returned by its last successful save. Falling back to a
  // freshly-read version would let an old tab overwrite a newer save.
  const requestedVersion = body.expectedDraftVersion ?? body.draftVersion
  if (
    typeof requestedVersion !== "number" ||
    !Number.isSafeInteger(requestedVersion) ||
    requestedVersion < 1
  ) {
    return Response.json({ error: "Invalid draft version" }, { status: 400 })
  }

  // The write is conditional on the related order still being editable and on
  // the exact saved version, so payment/publication cannot race a late draft
  // write. Manual payment review does not lock this invitation-editing flow;
  // payment records remain protected by their own RPCs and append-only guards.
  const { data: saved, error } = await supabaseAdmin.rpc(
    "save_card_draft",
    {
      p_card_id: id,
      p_owner: user.id,
      p_draft: body.draft,
      p_expected_draft_version: requestedVersion,
    }
  )

  if (error) {
    if (error.message.includes("DRAFT_VERSION_CONFLICT")) {
      return Response.json(
        { error: "Draf telah berubah. Muat semula sebelum menyimpan semula." },
        { status: 409 }
      )
    }
    if (error.message.includes("CARD_NOT_EDITABLE")) {
      return Response.json(
        { error: "Kad ini tidak lagi boleh disunting." },
        { status: 409 }
      )
    }
    if (error.message.includes("RETIRED")) {
      return Response.json(
        { error: "Jemputan ini telah dihentikan kekal dan tidak boleh dibuka semula.", code: "RETIRED" },
        { status: 409 },
      )
    }
    if (error.message.includes("EDIT_WINDOW_EXPIRED")) {
      return Response.json(
        {
          error: "Tetingkap suntingan telah tamat. Hubungi pentadbir untuk membukanya semula.",
          code: "EDIT_WINDOW_EXPIRED",
        },
        { status: 409 },
      )
    }
    if (error.message.includes("CARD_UNAVAILABLE")) {
      return Response.json(
        { error: "Jemputan ini dinyahterbitkan oleh pentadbir.", code: "CARD_UNAVAILABLE" },
        { status: 409 },
      )
    }
    if (error.message.includes("EDIT_WINDOW_CORRUPT")) {
      return Response.json(
        { error: "Tetingkap suntingan tidak sah. Hubungi sokongan.", code: "EDIT_WINDOW_CORRUPT" },
        { status: 409 },
      )
    }
    if (error.message.includes("TEMPLATE_MISMATCH")) {
      return Response.json({ error: "Template kad tidak boleh ditukar." }, { status: 400 })
    }
    console.error("Draft save failed:", id, error.message)
    return Response.json({ error: "Failed to save draft" }, { status: 500 })
  }

  const savedResult = saved as {
    saved?: boolean
    draftVersion?: number
    lastActivityAt?: string | null
    mode?: "draft" | "revision"
    windowId?: string
    expiresAt?: string
  } | null
  if (!savedResult || savedResult.saved !== true) {
    return Response.json(
      { error: "Card is no longer editable — payment has been processed" },
      { status: 409 }
    )
  }

  return Response.json({
    ok: true,
    draftVersion: savedResult.draftVersion ?? null,
    lastActivityAt: savedResult.lastActivityAt ?? null,
    mode: savedResult.mode ?? "draft",
    windowId: savedResult.windowId ?? null,
    expiresAt: savedResult.expiresAt ?? null,
  })
}
