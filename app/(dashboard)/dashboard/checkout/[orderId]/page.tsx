import { loadManualPayment } from "@/lib/payment-receipts"
import { notFound, redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  parseDuitNowSlot,
  toDuitNowReviewView,
  toDuitNowSlotView,
  toTransferSubmissionView,
  type DuitNowSlotView,
} from "@/lib/payments"
import { loadPaymentSupportContact } from "@/lib/payment-support-server"
import { deriveCardLifecycle, type AvailabilityActionKind } from "@/lib/types"
import { CheckoutStatusClient } from "./CheckoutStatusClient"

export const metadata = {
  title: "Status Pesanan — kamy jemput",
}

export const dynamic = "force-dynamic"

export default async function CheckoutResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ status?: string; method?: string }>
}) {
  const { orderId } = await params
  const { status, method } = await searchParams

  // Authenticate first; proxy.ts normally guards this route already.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Ownership-checked order load (admin client read, explicit owner check).
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, status, manual_paid_draft, price_myr, payment_method, payment_completed_at, entitlement_source, replacement_grant_id")
    .eq("id", orderId)
    .maybeSingle()

  if (orderError) throw new Error("Unable to load checkout order")
  if (!order || order.user_id !== user.id) {
    notFound()
  }

  // Keep the editor target for a cancelled pending Checkout. Expose the public
  // invitation link only after publication finishes.
  const { data: card, error: cardError } = await supabaseAdmin
    .from("cards")
    .select("id, slug, is_published, published_at, current_publication_id, active_edit_window_id")
    .eq("order_id", orderId)
    .maybeSingle()
  if (cardError) throw new Error("Unable to load checkout card")

  if (order.entitlement_source === "controlled_replacement") {
    if (!card) notFound()
    redirect(`/dashboard/cards/${card.id}/edit`)
  }

  let latestAction: AvailabilityActionKind | null = null
  let editWindow: { id: string; expires_at: string } | null = null
  if (card) {
    const { data: actionRow, error: actionError } = await supabaseAdmin
      .from("card_availability_actions")
      .select("action")
      .eq("card_id", card.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (actionError) throw new Error("Unable to load checkout card availability")
    latestAction =
      actionRow?.action === "disabled" || actionRow?.action === "restored"
        ? actionRow.action
        : null
    if (card.active_edit_window_id) {
      const { data: window, error: windowError } = await supabaseAdmin
        .from("card_edit_windows")
        .select("id, expires_at")
        .eq("id", card.active_edit_window_id)
        .eq("card_id", card.id)
        .maybeSingle()
      if (windowError || !window) throw new Error("Unable to load checkout edit window")
      editWindow = window
    }
  }
  const initialLifecycle = deriveCardLifecycle({
    orderPaid: order.status === "paid",
    isPublished: card?.is_published ?? false,
    manualPaidDraft: order.manual_paid_draft,
    latestAction,
    firstPublishedAt: card?.published_at ?? null,
    currentPublicationId: card?.current_publication_id ?? null,
    activeEditWindowId: card?.active_edit_window_id ?? null,
    editWindowExpiresAt: editWindow?.expires_at ?? null,
  })

  // Current enabled DuitNow slots — only these may be chosen for a new
  // submission. An existing submission always renders its frozen snapshot.
  const { data: slotRows, error: slotsError } = await supabaseAdmin
    .from("duitnow_payment_slots")
    .select("*")
    .eq("enabled", true)
    .eq("slot_number", 1)
    .order("slot_number")
  if (slotsError) throw new Error("Unable to load DuitNow slots")

  const slots: DuitNowSlotView[] = (slotRows ?? [])
    .map((row) => {
      try {
        return toDuitNowSlotView(row)
      } catch {
        return null
      }
    })
    .filter((s): s is DuitNowSlotView => s !== null && parseDuitNowSlot(s.slotNumber) !== null)

  // The customer's latest immutable submission and its review, if any.
  const { data: submissionRow, error: submissionError } = await supabaseAdmin
    .from("duitnow_transfer_submissions")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (submissionError) throw new Error("Unable to load DuitNow submission")

  let review = null
  if (submissionRow) {
    const { data: reviewRow, error: reviewError } = await supabaseAdmin
      .from("duitnow_payment_reviews")
      .select("*")
      .eq("submission_id", submissionRow.id)
      .maybeSingle()
    if (reviewError) throw new Error("Unable to load DuitNow review")
    review = reviewRow ? toDuitNowReviewView(reviewRow) : null
  }
  const manual = await loadManualPayment(supabaseAdmin, orderId, order.price_myr)
  const supportContact = await loadPaymentSupportContact(supabaseAdmin)
  const { data: tng, error: tngError } = await supabaseAdmin.from("tng_payment_config").select("*").eq("id", true).single()
  if (tngError) throw new Error("Unable to load Touch ’n Go")
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  return (
    <CheckoutStatusClient
      qrPage={method === "qr"}
      initialManual={manual}
      manualPaidDraft={order.manual_paid_draft}
      tng={tng}
      orderId={orderId}
      initialOrderStatus={order.status}
      initialLifecycle={initialLifecycle}
      initialCardId={card?.id ?? null}
      paymentMethod={order.payment_method}
      paymentCompletedAt={order.payment_completed_at}
      initialCardSlug={card?.is_published ? card.slug ?? null : null}
      initialEditWindow={editWindow}
      priceMyr={order.price_myr}
      slots={slots}
      initialSubmission={submissionRow ? toTransferSubmissionView(submissionRow) : null}
      initialReview={review}
      stripeStatus={status ?? null}
      appUrl={APP_URL}
      supportContact={supportContact}
      stripeAvailable={Boolean(process.env.STRIPE_SECRET_KEY)}
    />
  )
}
