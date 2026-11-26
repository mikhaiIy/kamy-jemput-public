import { notFound, redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isEditWindowExpired, isSectionCard, type CardData, type TemplateType } from "@/lib/types"
import { SectionEditor } from "@/components/SectionEditor"
import { EditWindowLockedNotice } from "@/components/EditWindowLockedNotice"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const metadata = {
  title: "Sesuaikan Kad — kamy jemput",
}

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/dashboard/cards/${id}/edit`)

  // Account-level tour completion (migration 017). RLS scopes this read to
  // the caller's own row. A failed profile read must suppress the automatic
  // tour rather than look like a fresh account, so only an explicit NULL
  // timestamp counts as "never completed".
  const { data: profile } = await supabase
    .from("users")
    .select("section_editor_tour_completed_at")
    .eq("id", user.id)
    .single()
  const tourCompleted = profile
    ? profile.section_editor_tour_completed_at != null
    : true

  const { data: card } = await supabase
    .from("cards")
    .select(
      "id, slug, custom_data, custom_data_draft, revision_draft, active_edit_window_id, draft_version, is_published, published_at, template_id, order_id, orders (status, manual_paid_draft, entitlement_source, replacement_grant_id)"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!card) notFound()

  const orderStatus = (
    Array.isArray(card.orders) ? card.orders[0] : card.orders
  ) as {
    status: string
    manual_paid_draft?: boolean
    entitlement_source?: "payment" | "controlled_replacement"
    replacement_grant_id?: string | null
  } | null

  const isControlledReplacement =
    orderStatus?.entitlement_source === "controlled_replacement"
  let controlledReplacement: {
    reason: string
    preparationReady: boolean
  } | null = null
  if (isControlledReplacement) {
    const { data: grant, error: grantError } = await supabaseAdmin
      .from("card_replacement_grants")
      .select("id, reason, replacement_card_id")
      .eq(
        "id",
        orderStatus?.replacement_grant_id ?? "00000000-0000-4000-8000-000000000000",
      )
      .eq("replacement_card_id", card.id)
      .maybeSingle()
    if (grantError) throw new Error("Unable to load replacement entitlement")
    if (grant) {
      const { data: preparation, error: preparationError } = await supabaseAdmin
        .from("card_replacement_asset_preparations")
        .select("target_draft_version, source_publication_id")
        .eq("grant_id", grant.id)
        .eq("target_draft_version", card.draft_version ?? 1)
        .maybeSingle()
      if (preparationError) throw new Error("Unable to load replacement preparation")
      controlledReplacement = {
        reason: grant.reason,
        preparationReady: Boolean(preparation),
      }
    } else {
      return (
        <EditWindowLockedNotice
          expiresAt={null}
          reason="Rekod penggantian pentadbir tidak lengkap. Hubungi sokongan."
        />
      )
    }
  }

  const isPostPublication = card.published_at !== null
  let revisionWindow: { id: string; expiresAt: string; grantedAt: string } | null = null
  if (isPostPublication) {
    if (!card.active_edit_window_id) redirect("/dashboard")
    const [{ data: window }, { data: latestAction }] = await Promise.all([
      supabaseAdmin
        .from("card_edit_windows")
        .select("id, expires_at, granted_at")
        .eq("id", card.active_edit_window_id)
        .eq("card_id", card.id)
        .maybeSingle(),
      supabaseAdmin
        .from("card_availability_actions")
        .select("action")
        .eq("card_id", card.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    const expired = !window || isEditWindowExpired(window.expires_at)
    const disabled = latestAction?.action === "disabled"
    if (!window || disabled || expired || !card.revision_draft || card.is_published) {
      return (
        <EditWindowLockedNotice
          expiresAt={window?.expires_at ?? null}
          reason={disabled
            ? "Pentadbir telah menyahterbitkan jemputan ini."
            : !window
              ? "Rekod tetingkap suntingan tidak lengkap."
              : expired
                ? "Tetingkap suntingan tujuh hari telah tamat."
                : "Jemputan tidak boleh disunting dalam keadaan semasa."}
        />
      )
    }
    revisionWindow = {
      id: window.id,
      expiresAt: window.expires_at,
      grantedAt: window.granted_at,
    }
  }

  // Payment review and invitation editing are separate flows. Keep a small
  // status signal for the editor action, but do not redirect the owner away
  // from the live draft while a receipt is submitted or partially confirmed.
  let manualReviewActive = false
  if (card.order_id && !isControlledReplacement) {
    const [{ data: activeAttempt, error: attemptError }, { data: legacySubmissions, error: legacyError }] =
      await Promise.all([
        supabaseAdmin
          .from("manual_payment_attempts")
          .select("id")
          .eq("order_id", card.order_id)
          .in("state", ["submitted", "insufficient"])
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("duitnow_transfer_submissions")
          .select("id")
          .eq("order_id", card.order_id),
      ])
    if (attemptError || legacyError) {
      throw new Error("Unable to check payment review status")
    }

    let reviewedLegacyCount = 0
    const legacyIds = (legacySubmissions ?? []).map((submission) => submission.id)
    if (legacyIds.length > 0) {
      const { data: legacyReviews, error: reviewError } = await supabaseAdmin
        .from("duitnow_payment_reviews")
        .select("submission_id")
        .in("submission_id", legacyIds)
      if (reviewError) throw new Error("Unable to check payment review status")
      reviewedLegacyCount = new Set(
        (legacyReviews ?? []).map((review) => review.submission_id),
      ).size
    }

    manualReviewActive =
      orderStatus?.status === "pending" &&
      (Boolean(activeAttempt) || reviewedLegacyCount < legacyIds.length)
  }

  // An unpaid Editing row and the one manual Paid draft are editable. A
  // Published or paid rows without the editable paid-draft entitlement stay
  // on the status surface.
  const paidDraft =
    orderStatus?.status === "paid" &&
    orderStatus.manual_paid_draft === true &&
    !card.is_published &&
    card.custom_data_draft !== null
  if (!isPostPublication && orderStatus?.status === "paid" && !paidDraft) {
    redirect(`/dashboard/checkout/${card.order_id}`)
  }

  const data = (revisionWindow
    ? card.revision_draft
    : paidDraft
      ? card.custom_data_draft
      : card.custom_data_draft ?? card.custom_data) as CardData
  if (!isSectionCard(data)) {
    redirect("/dashboard")
  }

  // Look up template price + type for the "Continue to payment" button and
  // the appliesTo filter on the "+ Add Section" picker.
  const { data: template } = await supabase
    .from("templates")
    .select("price_myr, name, type")
    .eq("id", card.template_id)
    .single()

  return (
    <SectionEditor
      cardId={card.id}
      stripeAvailable={Boolean(process.env.STRIPE_SECRET_KEY)}
      orderId={card.order_id ?? null}
      slug={card.slug}
      userId={user.id}
      templateName={template?.name ?? "Invitation"}
      templatePriceMyr={template?.price_myr ?? 0}
      templateType={(template?.type as TemplateType | null) ?? null}
      initialData={data}
      initialDraftVersion={card.draft_version ?? 1}
      tourCompleted={tourCompleted}
      paidDraft={paidDraft}
      manualReviewActive={manualReviewActive}
      controlledReplacement={controlledReplacement}
      revisionWindow={revisionWindow}
    />
  )
}
