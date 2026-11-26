import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const sig = request.headers.get("stripe-signature")
    if (!sig) return Response.json({ error: "Missing stripe-signature" }, { status: 400 })
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET is not set")
      return Response.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    let rawBody: string
    try {
      rawBody = await request.text()
    } catch {
      return Response.json({ error: "Could not read body" }, { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return Response.json({ error: "Invalid signature" }, { status: 400 })
    }

    if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
      return Response.json({ received: true })
    }

    const session = event.data.object
    if (session.payment_status !== "paid") {
      return Response.json({ received: true })
    }

    // The durable Session binding is authority. Metadata only proves the event
    // agrees with that binding and cannot redirect a payment to another order.
    const { data: boundOrder, error: boundOrderError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle()
    if (boundOrderError || !boundOrder) {
      console.error("No persisted order for paid Checkout Session:", session.id)
      // A persisted-session mismatch is an integrity fault, not an invalid
      // Stripe signature. Return retryable 5xx so Stripe retries while the
      // durable reservation/session binding is investigated or recovered.
      return Response.json({ error: "Unmatched checkout session" }, { status: 500 })
    }
    if (session.metadata?.orderId !== boundOrder.id) {
      console.error("Checkout metadata does not match persisted session:", session.id)
      // Metadata is only a consistency check; a mismatch must remain
      // retryable and must never acknowledge a possibly misbound payment.
      return Response.json({ error: "Checkout session metadata mismatch" }, { status: 500 })
    }

    // This transaction records the first payment method and opens one private
    // paid draft. A later Stripe event cannot replace a DuitNow winner, and a
    // payment event never publishes or sends a public invitation link.
    const { error: rpcError } = await supabaseAdmin.rpc(
      "complete_order_payment",
      {
        p_order_id: boundOrder.id,
        p_method: "stripe",
        p_reference: session.id,
        p_draft_snapshot: null,
      }
    )
    if (rpcError) {
      console.error("Payment completion failed:", boundOrder.id, rpcError.message)
      return Response.json({ error: "Failed to complete payment" }, { status: 500 })
    }

    return Response.json({ received: true })
  } catch (err) {
    console.error("Unhandled webhook error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
