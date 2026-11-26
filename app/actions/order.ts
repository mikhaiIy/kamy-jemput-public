"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { generateSlug } from "@/lib/slugify"

function isDraftResult(value: unknown): value is { orderId: string; cardId: string; slug: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "orderId" in value &&
    typeof value.orderId === "string" &&
    "cardId" in value &&
    typeof value.cardId === "string" &&
    "slug" in value &&
    typeof value.slug === "string"
  )
}

/**
 * Section-v2 flow: create both an `orders` row AND an unpublished `cards` row
 * up front so the editor has a stable `cardId` for image uploads and
 * server-side draft auto-save. Payment success creates the private paid-draft
 * entitlement; the owner publication route later promotes the saved draft to
 * `is_published = true` after the explicit acknowledgement.
 */
export async function createDraftCardAction(
  templateId: string
): Promise<{ orderId: string; cardId: string; slug: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // The database locks the active Section-v2 preset and creates both rows in
  // one transaction, so an interrupted request cannot leave an orphan order.
  const { data, error } = await supabaseAdmin.rpc("create_draft_order_and_card", {
    p_template_id: templateId,
    p_owner: user.id,
    p_slug: generateSlug(),
  })

  if (error || !data) throw new Error("Unable to create an editable card from this template")
  if (!isDraftResult(data)) throw new Error("Draft creation returned an incomplete result")
  return data
}
