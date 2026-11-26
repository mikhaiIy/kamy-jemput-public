import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Recorded administrator availability controls. Accepts validated disable /
 * restore commands (not an arbitrary visibility boolean) and executes them
 * through the transactional `set_card_availability` RPC, which appends to the
 * audit table and flips visibility atomically. Rejected: malformed commands,
 * missing/blank disable reasons, unpaid activation, Publishing activation, and
 * invalid transitions. There is deliberately no customer endpoint.
 */

type PublishCommand =
  | { command: "disable"; reason: string }
  | { command: "restore" }

function parseCommand(body: unknown): { ok: true; cmd: PublishCommand } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" }
  }
  const { command, reason } = body as { command?: unknown; reason?: unknown }

  if (command === "disable") {
    if (typeof reason !== "string" || reason.trim() === "") {
      return { ok: false, error: "A nonblank reason is required to disable an invitation" }
    }
    return { ok: true, cmd: { command: "disable", reason } }
  }

  if (command === "restore") {
    return { ok: true, cmd: { command: "restore" } }
  }

  return { ok: false, error: 'command must be "disable" (with reason) or "restore"' }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  // Verify admin
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  let parsed: { ok: true; cmd: PublishCommand } | { ok: false; error: string }
  try {
    parsed = parseCommand(await request.json())
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 })
  }

  // Transactional recorded transition: locks the card/order, verifies payment
  // and preconditions, appends the audit row, and flips visibility atomically.
  const { data: result, error } = await supabaseAdmin.rpc("set_card_availability", {
    p_card_id: id,
    p_admin_id: user.id,
    p_action: parsed.cmd.command === "disable" ? "disabled" : "restored",
    p_reason:
      parsed.cmd.command === "disable" ? parsed.cmd.reason.trim() : null,
  })

  if (error) {
    const message = error.message
    if (message.includes("CARD_NOT_FOUND")) {
      return Response.json({ error: "Card not found" }, { status: 404 })
    }
    if (message.includes("REASON_REQUIRED")) {
      return Response.json(
        { error: "Sebab diperlukan untuk menyahterbitkan jemputan." },
        { status: 400 }
      )
    }
    if (message.includes("INVALID_ACTION")) {
      return Response.json({ error: "Unknown availability command" }, { status: 400 })
    }
    if (message.includes("RETIRED")) {
      return Response.json(
        { error: "Jemputan ini telah dihentikan kekal dan tidak boleh dipulihkan.", code: "RETIRED" },
        { status: 409 },
      )
    }
    if (message.includes("REPLACEMENT_PENDING")) {
      return Response.json(
        { error: "Penggantian sedang disediakan dan ketersediaan tidak boleh diubah sekarang.", code: "REPLACEMENT_PENDING" },
        { status: 409 },
      )
    }
    if (
      message.includes("UNPAID") ||
      message.includes("NOT_PUBLISHED") ||
      message.includes("ALREADY_PUBLISHED") ||
      message.includes("NOT_DISABLED") ||
      message.includes("EDIT_WINDOW_CORRUPT") ||
      message.includes("CURRENT_PUBLICATION_MISSING")
    ) {
      // Unpaid / Publishing activation attempts and invalid transitions.
      return Response.json(
        { error: "Availability control not allowed in the invitation's current state" },
        { status: 409 }
      )
    }
    console.error("Availability transition failed:", id, message)
    return Response.json({ error: message }, { status: 500 })
  }

  revalidatePath("/admin/cards")
  revalidatePath(`/admin/cards/${id}`)
  revalidatePath("/admin/orders")
  revalidatePath("/dashboard")

  return Response.json({
    success: true,
    isPublished: result?.is_published ?? null,
    action: result?.action ?? null,
  })
}
