import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { mapPaymentRpcError } from "@/lib/payments"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

type Reservation = {
  reservationToken: string
  stripeSessionId: string | null
  priceMyr: number
  templateId: string
}

function hasOrderId(value: unknown): value is { orderId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "orderId" in value &&
    typeof value.orderId === "string"
  )
}

function isReservation(value: unknown): value is Reservation {
  return (
    typeof value === "object" &&
    value !== null &&
    "reservationToken" in value &&
    typeof value.reservationToken === "string" &&
    "stripeSessionId" in value &&
    (typeof value.stripeSessionId === "string" || value.stripeSessionId === null) &&
    "priceMyr" in value &&
    typeof value.priceMyr === "number" &&
    "templateId" in value &&
    typeof value.templateId === "string"
  )
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!hasOrderId(body)) return Response.json({ error: "orderId is required" }, { status: 400 })
  const { orderId } = body

  // The locked RPC also rejects submitted receipts and confirmed partial QR
  // amounts. Stripe never collects a remaining manual-payment balance.
  // This transaction locks order then card and leaves a durable reservation
  // before any network call to Stripe. A timeout therefore remains recoverable
  // with the same Stripe idempotency key instead of permitting deletion.
  const { data, error: reserveError } = await supabaseAdmin.rpc("reserve_checkout", {
    p_order_id: orderId,
    p_owner: user.id,
  })
  if (reserveError || !data) {
    const message = reserveError?.message ?? ""
    const status = message.includes("ORDER_NOT_FOUND") ? 404 : 409
    return Response.json({ error: mapPaymentRpcError(message) }, { status })
  }

  if (!isReservation(data)) return Response.json({ error: "Checkout reservation is incomplete" }, { status: 500 })
  const reservation = data

  if (reservation.stripeSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(reservation.stripeSessionId)
      if (existing.status === "open" && existing.url) {
        return Response.json({ url: existing.url })
      }
      // An expired Session is known safe to release. The next request receives
      // a fresh reservation; no elapsed local timer decides this.
      if (existing.status === "expired") {
        const { data: released, error: releaseError } = await supabaseAdmin.rpc(
          "release_checkout_reservation",
          {
            p_order_id: orderId,
            p_owner: user.id,
            p_reservation_token: reservation.reservationToken,
            p_stripe_session_id: existing.id,
          }
        )
        if (releaseError || released !== true) {
          return Response.json({ error: "Sesi Stripe sedang disemak. Sila cuba lagi." }, { status: 409 })
        }
        return Response.json({ error: "Sesi Stripe telah tamat; cuba bayaran semula." }, { status: 409 })
      }
      return Response.json({ error: "Payment is awaiting confirmation" }, { status: 409 })
    } catch {
      return Response.json({ error: "Checkout session cannot be reconciled yet" }, { status: 503 })
    }
  }

  const { data: template } = await supabaseAdmin
    .from("templates")
    .select("name")
    .eq("id", reservation.templateId)
    .maybeSingle()

  try {
    // Stripe's default expiry is safely based on Stripe's create time. Do not
    // derive expires_at from the earlier reservation timestamp.
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        currency: "myr",
        line_items: [{
          price_data: {
            currency: "myr",
            unit_amount: reservation.priceMyr,
            product_data: {
              name: template?.name || "Digital Invitation Card",
              description: "Digital invitation card — hosted web page",
            },
          },
          quantity: 1,
        }],
        success_url: `${APP_URL}/dashboard/checkout/${orderId}?status=success`,
        cancel_url: `${APP_URL}/dashboard/checkout/${orderId}?status=cancel`,
        metadata: { orderId, userId: user.id },
        customer_email: user.email,
      },
      { idempotencyKey: `checkout-reservation-${reservation.reservationToken}` }
    )

    const { data: attached, error: attachError } = await supabaseAdmin.rpc(
      "attach_checkout_session",
      {
        p_order_id: orderId,
        p_owner: user.id,
        p_reservation_token: reservation.reservationToken,
        p_stripe_session_id: session.id,
        p_stripe_session_expires_at: new Date(session.expires_at * 1000).toISOString(),
      }
    )
    if (attachError || attached !== true || !session.url) {
      // Keep the reservation: a future retry reconciles the same idempotent
      // Stripe Session rather than creating a second charge opportunity.
      return Response.json({ error: "Checkout session is being reconciled" }, { status: 503 })
    }
    return Response.json({ url: session.url })
  } catch {
    // Keep an unbound reservation after any create ambiguity. It is deliberately
    // undeletable until the same idempotency key can be reconciled.
    return Response.json({ error: "Unable to create checkout session; retry payment" }, { status: 503 })
  }
}
