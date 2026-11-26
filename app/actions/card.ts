"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { stripe } from "@/lib/stripe"
import { revalidatePath } from "next/cache"

/**
 * Owner deletion, permitted only while the card is atomically Editing (order
 * still unpaid). The transactional RPC verifies ownership and payment state,
 * deletes the pending order (cascading to the card row so no orphan order can
 * later be checked out), and reports whether the deletion was allowed. All
 * paid states are rejected — there is no customer post-payment delete.
 */
export async function deleteCardAction(cardId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // A durable reservation may represent a Stripe create response that timed
  // out. Never delete that pair until Stripe confirms its bound Session is no
  // longer payable; an unbound reservation deliberately remains protected.
  const { data: card } = await supabaseAdmin
    .from("cards")
    .select("order_id, orders(checkout_reservation_token, stripe_session_id)")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!card) return { error: "Kad tidak ditemui" }
  const order = card.orders
    ? (Array.isArray(card.orders) ? card.orders[0] : card.orders)
    : null

  if (order?.checkout_reservation_token) {
    if (!order.stripe_session_id) {
      return { error: "Pembayaran sedang disahkan. Cuba semula kemudian sebelum memadamkan jemputan." }
    }

    try {
      let session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
      if (session.status === "open") {
        session = await stripe.checkout.sessions.expire(order.stripe_session_id)
      }
      if (session.status !== "expired") {
        return { error: "Sesi pembayaran masih aktif dan jemputan tidak boleh dipadamkan." }
      }
    } catch {
      return { error: "Sesi pembayaran tidak dapat disahkan. Jemputan kekal dilindungi; cuba semula kemudian." }
    }

    const { data: released, error: releaseError } = await supabaseAdmin.rpc(
      "release_checkout_reservation",
      {
        p_order_id: card.order_id,
        p_owner: user.id,
        p_reservation_token: order.checkout_reservation_token,
        p_stripe_session_id: order.stripe_session_id,
      }
    )
    if (releaseError || released !== true) {
      return { error: "Sesi pembayaran berubah semasa disahkan. Cuba semula kemudian." }
    }
  }

  const { data: deleted, error } = await supabaseAdmin.rpc("delete_card_if_editing", {
    p_card_id: cardId,
    p_owner: user.id,
  })

  if (error) {
    if (error.message.includes("IMMUTABLE_PAYMENT_AUDIT_PROTECTED")) {
      return { error: "Jemputan ini tidak boleh dipadamkan kerana mempunyai rekod bayaran atau resit. Rekod ini perlu disimpan, termasuk jika bayaran ditolak." }
    }
    return { error: "Jemputan tidak dapat dipadamkan. Sila cuba lagi." }
  }
  if (deleted !== true) return { error: "Kad tidak boleh dipadamkan kerana pembayaran atau sesi pembayaran sedang aktif." }

  revalidatePath("/dashboard")
  return {}
}
