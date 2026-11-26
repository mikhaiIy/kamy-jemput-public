import { loadManualPayment, readReceipt, uploadReceipt } from "@/lib/payment-receipts"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { stripe } from "@/lib/stripe"
import {
  mapPaymentRpcError,
  toDuitNowReviewView,
  toTransferSubmissionView,
} from "@/lib/payments"
import { deriveCardLifecycle, type AvailabilityActionKind } from "@/lib/types"
import { loadPaymentSupportContact } from "@/lib/payment-support-server"

export const dynamic = "force-dynamic"

// Authenticated owner-only order status + DuitNow transfer submission API.
// The database submission RPC re-validates everything inside a transaction;
// these checks exist to give useful, early errors at the boundary.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("price_myr, status, user_id, payment_method, payment_completed_at, manual_paid_draft, entitlement_source, replacement_grant_id, checkout_reservation_token, stripe_session_id, stripe_session_expires_at")
    .eq("id", orderId)
    .maybeSingle()

  if (orderError) {
    console.error("Order lookup failed during status check:", orderId, orderError.message)
    return Response.json({ error: "Status lookup failed" }, { status: 500 })
  }
  if (!order || order.user_id !== user.id)
    return Response.json({ error: "Not found" }, { status: 404 })

  const isControlledReplacement = order.entitlement_source === "controlled_replacement"
  const receiptId = new URL(request.url).searchParams.get("receipt")
  if (receiptId) {
    if (isControlledReplacement) {
      return Response.json({ error: "Administrator-granted replacements do not have payment receipts." }, { status: 404 })
    }
    return readReceipt(supabaseAdmin, user.id, orderId, receiptId)
  }

  let cardSlug: string | null = null
  let draftVersion: number | null = null
  let lastActivityAt: string | null = null
  let manualPaidDraft = order.manual_paid_draft
  let editWindow: { id: string; expires_at: string } | null = null
  let replacementCardId: string | null = null
  let lifecycle = deriveCardLifecycle({
    orderPaid: false,
    isPublished: false,
  })

  if (order.status === "paid") {
    // Recovery path: normalize old paid rows into the private paid-draft
    // entitlement. This function must never publish content.
    const { data: finalized, error: finalizeError } = isControlledReplacement
      ? { data: { state: "controlled_replacement" }, error: null }
      : await supabaseAdmin.rpc("finalize_paid_order", { p_order_id: orderId })

    if (finalizeError || !finalized) {
      console.error("Paid-order recovery failed:", orderId, finalizeError?.message)
      return Response.json({ error: "Status recovery failed" }, { status: 500 })
    }

    const finalizedResult = finalized as { state?: string } | null

    // Load the card + latest recorded administrator action to derive the true
    // lifecycle. An audit-read failure is not evidence that there was no
    // disable, so fail the request rather than reporting Published/Publishing.
    const { data: card, error: cardError } = await supabaseAdmin
      .from("cards")
      .select("id, slug, is_published, published_at, current_publication_id, active_edit_window_id, draft_version, last_activity_at")
      .eq("order_id", orderId)
      .maybeSingle()

    if (cardError) {
      console.error("Card lookup failed during status check:", orderId, cardError.message)
      return Response.json({ error: "Status recovery failed" }, { status: 500 })
    }

    let latestAction: AvailabilityActionKind | null = null
    let retired = false
    if (card) {
      const { data: actionRow, error: actionError } = await supabaseAdmin
        .from("card_availability_actions")
        .select("action")
        .eq("card_id", card.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (actionError) {
        console.error(
          "Availability audit lookup failed during status check:",
          orderId,
          actionError.message
        )
        return Response.json({ error: "Status recovery failed" }, { status: 500 })
      }
      latestAction = (actionRow?.action as AvailabilityActionKind | undefined) ?? null
      if (card.active_edit_window_id) {
        const { data: window, error: windowError } = await supabaseAdmin
          .from("card_edit_windows")
          .select("id, expires_at")
          .eq("id", card.active_edit_window_id)
          .eq("card_id", card.id)
          .maybeSingle()
        if (windowError || !window) {
          console.error("Edit-window lookup failed during status check:", orderId, windowError?.message)
          return Response.json({ error: "Status recovery failed" }, { status: 500 })
        }
        editWindow = window
      }
      const { data: cutover, error: cutoverError } = await supabaseAdmin
        .from("card_replacement_cutovers")
        .select("replacement_card_id")
        .eq("predecessor_card_id", card.id)
        .maybeSingle()
      if (cutoverError) {
        console.error("Replacement retirement lookup failed during status check:", orderId, cutoverError.message)
        return Response.json({ error: "Status recovery failed" }, { status: 500 })
      }
      retired = Boolean(cutover)
      if (isControlledReplacement) replacementCardId = cutover?.replacement_card_id ?? null
    }

    lifecycle = deriveCardLifecycle({
      orderPaid: true,
      isPublished: card?.is_published ?? false,
      manualPaidDraft:
        order.manual_paid_draft || finalizedResult?.state === "paid_draft",
      latestAction,
      firstPublishedAt: card?.published_at ?? null,
      currentPublicationId: card?.current_publication_id ?? null,
      activeEditWindowId: card?.active_edit_window_id ?? null,
      editWindowExpiresAt: editWindow?.expires_at ?? null,
      retired,
    })
    manualPaidDraft =
      order.manual_paid_draft || finalizedResult?.state === "paid_draft"
    draftVersion = card?.draft_version ?? null
    lastActivityAt = card?.last_activity_at ?? null

    // The invitation link exists only once the invitation is truly
    // Published/reachable — Publishing and Unavailable slugs are never disclosed.
    if (lifecycle === "published" && card?.slug) {
      cardSlug = card.slug
    }
  }

  // Customer-safe immutable DuitNow payload: the frozen snapshots of this
  // owner's latest submission plus its review — never live slot or draft data.
  let duitnow: {
    submission: ReturnType<typeof toTransferSubmissionView> | null
    review: ReturnType<typeof toDuitNowReviewView> | null
  } | null = null

  if (order.user_id === user.id && !isControlledReplacement) {
    const { data: submissionRow, error: submissionError } = await supabaseAdmin
      .from("duitnow_transfer_submissions")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (submissionError) {
      console.error("DuitNow submission lookup failed during status check:", orderId, submissionError.message)
      return Response.json({ error: "Status lookup failed" }, { status: 500 })
    }
    if (submissionRow) {
      const { data: reviewRow, error: reviewError } = await supabaseAdmin
        .from("duitnow_payment_reviews")
        .select("*")
        .eq("submission_id", submissionRow.id)
        .maybeSingle()
      if (reviewError) {
        console.error("DuitNow review lookup failed during status check:", orderId, reviewError.message)
        return Response.json({ error: "Status lookup failed" }, { status: 500 })
      }
      const review = reviewRow ? toDuitNowReviewView(reviewRow) : null
      duitnow = {
        submission: toTransferSubmissionView(submissionRow),
        review,
      }
    }
  }

  let manual = null
  if (!isControlledReplacement) {
    try { manual = await loadManualPayment(supabaseAdmin, orderId, order.price_myr) }
    catch { return Response.json({ error: "Status resit tidak dapat dimuatkan." }, { status: 503 }) }
  }
  const supportContact = isControlledReplacement
    ? null
    : await loadPaymentSupportContact(supabaseAdmin)
  return Response.json({
    status: order.status,
    lifecycle,
    cardSlug,
    manualPaidDraft,
    draftVersion,
    lastActivityAt,
    entitlementSource: order.entitlement_source ?? "payment",
    replacementGrantId: order.replacement_grant_id ?? null,
    replacementCardId,
    paymentMethod: isControlledReplacement ? null : order.payment_method,
    paymentCompletedAt: isControlledReplacement ? null : order.payment_completed_at,
    checkoutReserved: isControlledReplacement ? false : order.checkout_reservation_token !== null,
    checkoutSessionBound: isControlledReplacement ? false : order.stripe_session_id !== null,
    stripeSessionExpiresAt: isControlledReplacement ? null : order.stripe_session_expires_at,
    editWindowId: editWindow?.id ?? null,
    editWindowExpiresAt: editWindow?.expires_at ?? null,
    duitnow,
    manual,
    supportContact,
    stripeAvailable: isControlledReplacement ? false : Boolean(process.env.STRIPE_SECRET_KEY),
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  // Ownership + pending check happen authoritatively inside the locked RPC,
  // but verify ownership here first so non-owners never reach it.
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("user_id, status, manual_paid_draft, entitlement_source, payment_method, checkout_reservation_token, stripe_session_id")
    .eq("id", orderId)
    .maybeSingle()

  if (orderError) {
    console.error("Order lookup failed before DuitNow submission:", orderId, orderError.message)
    return Response.json({ error: "Order lookup failed" }, { status: 500 })
  }
  if (!order || order.user_id !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  if (order.entitlement_source === "controlled_replacement") {
    return Response.json(
      {
        error: "Administrator-granted replacements do not accept payment or receipt submissions.",
        code: "CONTROLLED_REPLACEMENT_PAYMENT_FORBIDDEN",
      },
      { status: 409 },
    )
  }
  // A manual submission must not leave a usable Stripe Checkout Session. The
  // durable binding is the authority: ask Stripe about that exact Session,
  // expire it if still open, then release the matching reservation. Never use
  // local expiry time or release an unbound/ambiguous reservation.
  if (order.checkout_reservation_token !== null || order.stripe_session_id !== null) {
    if (!order.checkout_reservation_token || !order.stripe_session_id) {
      return Response.json(
        { error: mapPaymentRpcError("CHECKOUT_RECONCILIATION_REQUIRED") },
        { status: 409 }
      )
    }

    let isExpired = false
    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
      if (checkoutSession.status === "expired") {
        isExpired = true
      } else if (checkoutSession.status === "open") {
        const expiredSession = await stripe.checkout.sessions.expire(checkoutSession.id)
        isExpired = expiredSession.status === "expired"
      }
    } catch {
      return Response.json(
        { error: "Sesi Stripe tidak dapat disahkan atau ditutup sekarang. Sila cuba lagi." },
        { status: 503 }
      )
    }
    if (!isExpired) {
      return Response.json(
        { error: mapPaymentRpcError("CHECKOUT_RECONCILIATION_REQUIRED") },
        { status: 409 }
      )
    }

    const { data: released, error: releaseError } = await supabaseAdmin.rpc(
      "release_checkout_reservation",
      {
        p_order_id: orderId,
        p_owner: user.id,
        p_reservation_token: order.checkout_reservation_token,
        p_stripe_session_id: order.stripe_session_id,
      }
    )
    if (releaseError || released !== true) {
      return Response.json(
        { error: mapPaymentRpcError("CHECKOUT_RECONCILIATION_REQUIRED") },
        { status: 409 }
      )
    }
  }

  // Use the request-scoped client so auth.uid() inside the locked RPC is the
  // actual submitting customer, not the service-role API client. It repeats
  // the checkout guard under the order lock in case a concurrent request raced
  // the Stripe-confirmed handoff above.
  try {
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      return Response.json({ error: "Satu fail resit diperlukan." }, { status: 400 })
    }
    // Bound the entire multipart body, including requests without Content-Length.
    const reader = request.body?.getReader()
    if (!reader) return Response.json({ error: "Resit diperlukan." }, { status: 400 })
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > 5 * 1024 * 1024 + 65536) {
        await reader.cancel()
        return Response.json({ error: "Saiz maksimum resit ialah 5 MB." }, { status: 413 })
      }
      chunks.push(value)
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData()
    const result = await uploadReceipt(supabaseAdmin, user.id, orderId, form)
    return Response.json({ ok: true, ...result })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Muat naik gagal. Cuba semula." }, { status: 400 })
  }
}
