import Link from "next/link"
import { ArrowRight, ExternalLink, MailOpen, Plus, ReceiptText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InvitationThumbnail } from "@/components/InvitationThumbnail"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { loadManualPayment } from "@/lib/payment-receipts"
import {
  manualPaymentMessage,
  manualPaymentNeedsSupport,
  type ManualOutcome,
} from "@/lib/payments"
import { SupportContactDialog } from "@/components/SupportContactDialog"
import { InvitationDetailsDialog } from "@/components/InvitationDetailsDialog"
import { loadPaymentSupportContact } from "@/lib/payment-support-server"
import { CopyLinkButton } from "@/components/CopyLinkButton"
import { EditRequestDialog } from "@/components/EditRequestDialog"
import { DeleteCardButton } from "./DeleteCardButton"
import { InvitationGallery } from "./InvitationGallery"
import {
  collectEventDates,
  classifyEventDates,
  klTodayKey,
  type EventDateGrouping,
} from "@/lib/sections/resolve-event-date"
import {
  deriveCardLifecycle,
  getCardEventName,
  type AvailabilityActionKind,
  type CardAvailabilityActionRow,
  type CardData,
  type CardEditRequestSummary,
  type CardLifecycle,
} from "@/lib/types"

export const metadata = {
  title: "Dashboard — kamy jemput",
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

const dateDisplayFormatter = new Intl.DateTimeFormat("ms-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  day: "numeric",
  month: "long",
  year: "numeric",
})

function formatDate(utcMs: number): string {
  return dateDisplayFormatter.format(new Date(utcMs))
}

type CardRecord = {
  id: string
  slug: string
  custom_data: CardData | null
  custom_data_draft: CardData | null
  revision_draft: CardData | null
  current_publication_id: string | null
  active_edit_window_id: string | null
  published_at: string | null
  is_published: boolean
  created_at: string
  order_id: string | null
  orders:
    | {
        status: string
        price_myr: number
        manual_paid_draft: boolean
        entitlement_source?: "payment" | "controlled_replacement"
        replacement_grant_id?: string | null
        checkout_reservation_token: string | null
        stripe_session_id: string | null
      }
    | {
        status: string
        price_myr: number
        manual_paid_draft: boolean
        entitlement_source?: "payment" | "controlled_replacement"
        replacement_grant_id?: string | null
        checkout_reservation_token: string | null
        stripe_session_id: string | null
      }[]
    | null
  rsvp_responses?: { id: string; attending: boolean; pax: number }[] | null
}

type DashboardRow = {
  record: CardRecord
  manualPayment: {
    outcome: ManualOutcome
    method: "duitnow" | "tng"
    reason: string
    receivedSen: number
    creditedSen: number
    remainingSen: number
    excessSen: number
    paidDraft: boolean
  } | null
  lifecycle: CardLifecycle
  title: string
  eventDate: string | null
  sortDate: number
  latestAction: AvailabilityActionKind | null
  disableReason: string | null
  editWindow: { id: string; expires_at: string; granted_at: string } | null
  editRequest: CardEditRequestSummary | null
  /** Published invitations group by event date in Kuala Lumpur. */
  dateGrouping: EventDateGrouping | null
  replacement: {
    grantId: string
    predecessorCardId: string
    replacementCardId: string
    reason: string
    completed: boolean
  } | null
}

function orderStatusOf(card: CardRecord): string | null {
  const o = Array.isArray(card.orders) ? card.orders[0] : card.orders
  return o?.status ?? null
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Owner-scoped facts only: the signed-in owner's cards, their order payment
  // state, and the RSVP data needed for per-card metrics.
  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select(
      `id, slug, custom_data, custom_data_draft, is_published, created_at, order_id,
       revision_draft, current_publication_id, active_edit_window_id, published_at,
       orders (status, price_myr, manual_paid_draft, entitlement_source, replacement_grant_id, checkout_reservation_token, stripe_session_id),
       rsvp_responses (id, attending, pax)`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (cardsError) throw cardsError

  const records = (cards ?? []) as unknown as CardRecord[]
  const cardIds = records.map((c) => c.id)
  const supportContact = await loadPaymentSupportContact(supabaseAdmin)

  // Replacement lineage is read through the trusted server client after the
  // owner identity has been established. It contains the administrator reason
  // and terminal result, never payment evidence.
  const { data: replacementGrants, error: replacementError } = await supabaseAdmin
    .from("card_replacement_grants")
    .select("id, predecessor_card_id, replacement_card_id, reason")
    .eq("owner_id", user.id)
    .order("granted_at", { ascending: false })
  if (replacementError) throw replacementError
  const grantIds = (replacementGrants ?? []).map((grant) => grant.id)
  const { data: replacementCutovers, error: cutoverError } = grantIds.length > 0
    ? await supabaseAdmin
        .from("card_replacement_cutovers")
        .select("grant_id")
        .in("grant_id", grantIds)
    : { data: [], error: null }
  if (cutoverError) throw cutoverError
  const completedGrantIds = new Set((replacementCutovers ?? []).map((cutover) => cutover.grant_id))
  const replacementByCard = new Map<string, DashboardRow["replacement"]>()
  for (const grant of replacementGrants ?? []) {
    const lineage = {
      grantId: grant.id,
      predecessorCardId: grant.predecessor_card_id,
      replacementCardId: grant.replacement_card_id,
      reason: grant.reason,
      completed: completedGrantIds.has(grant.id),
    } satisfies NonNullable<DashboardRow["replacement"]>
    if (!replacementByCard.has(grant.predecessor_card_id)) {
      replacementByCard.set(grant.predecessor_card_id, lineage)
    }
    if (!replacementByCard.has(grant.replacement_card_id)) {
      replacementByCard.set(grant.replacement_card_id, lineage)
    }
  }

  // `custom_data` is the immutable first-publication snapshot. The dashboard
  // still needs the one guarded current-publication pointer for titles and
  // dates after a later approved revision; never infer the current version
  // from the historical first snapshot.
  const publicationIds = records
    .map((record) => record.current_publication_id)
    .filter((id): id is string => Boolean(id))
  const currentPublicationByCard = new Map<string, CardData>()
  if (publicationIds.length > 0) {
    const { data: publications, error: publicationsError } = await supabase
      .from("card_publications")
      .select("id, card_id, snapshot")
      .in("id", publicationIds)
    if (publicationsError) throw publicationsError
    for (const publication of publications ?? []) {
      if (publication.snapshot && typeof publication.snapshot === "object") {
        currentPublicationByCard.set(
          publication.card_id,
          publication.snapshot as CardData,
        )
      }
    }
  }

  // Latest recorded administrator availability action per card (owner-readable
  // through RLS) — needed to distinguish Publishing from Unavailable.
  const latestActionByCard = new Map<string, CardAvailabilityActionRow>()
  if (cardIds.length > 0) {
    const { data: actions, error: actionsError } = await supabase
      .from("card_availability_actions")
      .select("id, card_id, admin_id, action, reason, created_at")
      .in("card_id", cardIds)
      .order("created_at", { ascending: false })

    if (actionsError) throw actionsError

    for (const action of (actions ?? []) as CardAvailabilityActionRow[]) {
      if (!latestActionByCard.has(action.card_id)) {
        latestActionByCard.set(action.card_id, action)
      }
    }
  }

  // The owner may read only their own request ledger through RLS. Keep the
  // latest outcome per invitation so a rejection/stale result is visible next
  // to the next eligible submission without exposing administrator metadata.
  const editRequestByCard = new Map<string, CardEditRequestSummary>()
  if (cardIds.length > 0) {
    const { data: editRequests, error: editRequestsError } = await supabase
      .from("card_edit_requests")
      .select(
        "id, card_id, request_id, reason, status, decision, decision_reason, submitted_at, decided_at, approved_edit_window_id",
      )
      .in("card_id", cardIds)
      .order("submitted_at", { ascending: false })
      .order("id", { ascending: false })
    if (editRequestsError) throw editRequestsError
    for (const request of (editRequests ?? []) as CardEditRequestSummary[]) {
      if (!editRequestByCard.has(request.card_id)) {
        editRequestByCard.set(request.card_id, request)
      }
    }
  }

  const editWindowById = new Map<
    string,
    { id: string; expires_at: string; granted_at: string }
  >()
  if (cardIds.length > 0) {
    const { data: windows, error: windowsError } = await supabase
      .from("card_edit_windows")
      .select("id, card_id, expires_at, granted_at")
      .in("card_id", cardIds)
      .order("granted_at", { ascending: false })
    if (windowsError) throw windowsError
    for (const window of windows ?? []) {
      editWindowById.set(window.id, window)
    }
  }

  // Derive lifecycle before selecting the saved draft or current publication.
  const todayKey = klTodayKey()
  const rows: DashboardRow[] = await Promise.all(
    records.map(async (record) => {
      const order = Array.isArray(record.orders)
        ? record.orders[0]
        : record.orders
      const latestAction = latestActionByCard.get(record.id)?.action ?? null
      const editWindow = record.active_edit_window_id
        ? (editWindowById.get(record.active_edit_window_id) ?? null)
        : null
      const lifecycle = deriveCardLifecycle({
        orderPaid: orderStatusOf(record) === "paid",
        isPublished: record.is_published,
        manualPaidDraft: order?.manual_paid_draft,
        latestAction,
        firstPublishedAt: record.published_at,
        currentPublicationId: record.current_publication_id,
        activeEditWindowId: record.active_edit_window_id,
        editWindowExpiresAt: editWindow?.expires_at ?? null,
        retired: Boolean(
          replacementByCard.get(record.id)?.completed &&
            replacementByCard.get(record.id)?.predecessorCardId === record.id,
        ),
      })
      const source =
        lifecycle === "editing" || lifecycle === "paid_draft"
          ? (record.custom_data_draft ?? record.custom_data)
          : lifecycle === "edit_window" || lifecycle === "edit_window_expired"
            ? (record.revision_draft ?? record.custom_data)
            : (currentPublicationByCard.get(record.id) ?? record.custom_data)
      const data = source as CardData | null
      const dates = data ? collectEventDates(data) : []
      const sortedDates = dates.slice().sort((a, b) => a.utcMs - b.utcMs)
      const earliest =
        sortedDates.find((date) => date.klDayKey >= todayKey) ??
        sortedDates.at(-1)
      const replacement = replacementByCard.get(record.id) ?? null
      const manualState =
        record.order_id && order && order.entitlement_source !== "controlled_replacement"
          ? await loadManualPayment(
              supabaseAdmin,
              record.order_id,
              order.price_myr,
            )
          : null
      const manualPayment = manualState?.attempt
        ? {
            outcome: (manualState.review?.outcome ??
              "pending") as ManualOutcome,
            method: manualState.attempt.method,
            reason: manualState.review?.reason ?? "",
            receivedSen: manualState.receivedSen,
            creditedSen: manualState.creditedSen,
            remainingSen: manualState.remainingSen,
            excessSen: manualState.excessSen,
            paidDraft: manualState.paidDraft,
          }
        : null

      return {
        record,
        manualPayment,
        lifecycle,
        title: data ? getCardEventName(data) : "Jemputan tanpa nama",
        eventDate: earliest ? formatDate(earliest.utcMs) : null,
        sortDate: earliest?.utcMs ?? Number.MAX_SAFE_INTEGER,
        latestAction,
        editWindow,
        replacement,
        disableReason:
          latestAction === "disabled"
            ? (latestActionByCard.get(record.id)?.reason ?? null)
            : null,
        editRequest: editRequestByCard.get(record.id) ?? null,
        dateGrouping: classifyEventDates(dates, todayKey),
      }
    }),
  )

  const attentionRows = rows.filter((row) => row.lifecycle !== "published")
  const upcomingRows = rows
    .filter(
      (row) => row.lifecycle === "published" && row.dateGrouping !== "past",
    )
    .sort((a, b) => a.sortDate - b.sortDate)
  const pastRows = rows
    .filter(
      (row) => row.lifecycle === "published" && row.dateGrouping === "past",
    )
    .sort((a, b) => b.sortDate - a.sortDate)
  const groups = [
    {
      id: "attention",
      heading: "Perlu perhatian",
      description:
        "Sambung suntingan, semak bayaran atau sediakan jemputan untuk diterbitkan.",
      rows: attentionRows,
    },
    {
      id: "upcoming",
      heading: "Akan datang",
      description:
        "Kongsi jemputan dan ikuti jawapan tetamu. Jemputan tanpa tarikh juga ada di sini.",
      rows: upcomingRows,
    },
    {
      id: "past",
      heading: "Majlis lepas",
      description:
        "Jemputan dan respons tetamu daripada majlis yang telah berlalu.",
      rows: pastRows,
    },
  ]

  function renderRow(row: DashboardRow) {
    const {
      record,
      lifecycle,
      title,
      eventDate,
      disableReason,
      manualPayment,
      editWindow,
      editRequest,
      replacement,
    } = row
    const responses = record.rsvp_responses ?? []
    const attendingGuests = responses
      .filter((response) => response.attending)
      .reduce((sum, response) => sum + (response.pax || 1), 0)
    const order = Array.isArray(record.orders)
      ? record.orders[0]
      : record.orders
    const isControlledReplacement =
      order?.entitlement_source === "controlled_replacement"
    const editable = ["editing", "paid_draft", "edit_window"].includes(
      lifecycle,
    )
    const publicInvitation = lifecycle === "published"
    const labels: Record<CardLifecycle, string> = {
      editing: "Draf",
      paid_draft: "Sedia untuk diterbitkan",
      publishing: "Sedang disiapkan",
      published: "Diterbitkan",
      edit_window: "Suntingan diluluskan",
      edit_window_expired: "Suntingan tamat",
      unavailable: "Tidak tersedia",
      retired: "Dihentikan kekal",
    }
    const editorHref = `/dashboard/cards/${record.id}/edit`
    const previewHref = `/dashboard/cards/${record.id}/preview`
    const primaryHref = editable
      ? editorHref
      : publicInvitation
        ? `/dashboard/cards/${record.id}/rsvp`
        : lifecycle === "publishing" && record.order_id
          ? `/dashboard/checkout/${record.order_id}`
          : null
    const primaryLabel =
      isControlledReplacement && lifecycle === "paid_draft"
        ? "Sambung suntingan"
        : lifecycle === "paid_draft"
        ? "Semak & terbitkan"
        : editable
          ? "Sambung suntingan"
          : publicInvitation
            ? "Lihat RSVP"
            : lifecycle === "publishing"
              ? "Semak status"
              : "Hubungi sokongan"
    const editRequestStatusId =
      publicInvitation || lifecycle === "edit_window_expired"
        ? `edit-request-status-${record.id}`
        : null
    const showPaymentAction = Boolean(
      record.order_id &&
        order?.entitlement_source !== "controlled_replacement" &&
        (manualPayment || lifecycle === "paid_draft"),
    )
    const showDeleteAction = lifecycle === "editing" && !manualPayment
    const lifecycleLabel =
      isControlledReplacement && lifecycle === "paid_draft"
        ? "Draf penggantian pentadbir"
        : labels[lifecycle]
    const overview =
      lifecycle === "paid_draft"
        ? isControlledReplacement
          ? "Draf penggantian pentadbir boleh disunting; penerbitan dilakukan oleh pentadbir."
          : "Bayaran selesai · sedia untuk diterbitkan."
        : lifecycle === "publishing"
          ? "Sedang diproses · semak status."
          : lifecycle === "unavailable"
            ? "Tidak tersedia · tindakan sokongan diperlukan."
            : lifecycle === "retired"
              ? "Jemputan asal dihentikan kekal."
              : null
    const deadline =
      editWindow && lifecycle === "edit_window"
        ? {
            label: `Sunting sebelum ${dateDisplayFormatter.format(new Date(editWindow.expires_at))}.`,
            detail:
              "Jemputan kekal peribadi sehingga anda menerbitkan semula versi suntingan.",
          }
        : editWindow && lifecycle === "edit_window_expired"
          ? {
              label: "Suntingan tamat · jemputan peribadi dan terkunci.",
              detail:
                "Hanya kelulusan pentadbir boleh membuka tetingkap suntingan baharu untuk jemputan ini.",
            }
          : null
    const replacementDetails = replacement
      ? {
          heading: replacement.completed
            ? "Penggantian pentadbir selesai"
            : "Draf penggantian pentadbir",
          reason: replacement.reason,
          detail: replacement.completed
            ? "Jemputan asal ini dihentikan kekal. Respons tetamu dan rekod lama dikekalkan pada jemputan asal."
            : record.id === replacement.replacementCardId
              ? "Draf ini boleh disunting. Ia hanya akan menjadi awam selepas pentadbir melengkapkan potong ganti."
              : "Jemputan asal kekal pada keadaan semasa sehingga pentadbir melengkapkan potong ganti.",
        }
      : null
    return (
      <article
        key={record.id}
        className="invitation-tile"
        aria-labelledby={`invitation-${record.id}`}
      >
        <div className="invitation-tile-render">
          <InvitationThumbnail
            src={previewHref}
            href={publicInvitation ? `/i/${record.slug}` : previewHref}
            title={title || "Jemputan tanpa nama"}
          />
        </div>
        <div className="invitation-tile-body">
          <span
            className="invitation-status"
            data-tone={
              publicInvitation
                ? "success"
                : ["unavailable", "edit_window_expired"].includes(lifecycle)
              ? "danger"
                  : "neutral"
            }
          >
            {lifecycleLabel}
          </span>
          <h3
            id={`invitation-${record.id}`}
            className="invitation-title mt-3 min-h-11 line-clamp-2 break-words text-base font-semibold leading-snug"
            title={title || "Jemputan tanpa nama"}
          >
            {title || "Jemputan tanpa nama"}
          </h3>
          <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {eventDate || "Tarikh belum ditetapkan"}
            </p>
            <InvitationDetailsDialog
              cardId={record.id}
              title={title || "Jemputan tanpa nama"}
              eventDate={eventDate}
              lifecycleLabel={lifecycleLabel}
              overview={overview}
              deadline={deadline}
              unavailableReason={disableReason}
              replacement={replacementDetails}
              request={editRequest}
              manualPayment={
                manualPayment
                  ? {
                      message: manualPaymentMessage(manualPayment, editable),
                      needsSupport: manualPaymentNeedsSupport(manualPayment),
                      supportContact,
                    }
                  : null
              }
            />
          </div>
          {publicInvitation && (
            <p className="mt-3 text-xs text-muted-foreground">
              <strong className="text-primary">
                {attendingGuests} tetamu hadir
              </strong>{" "}
              · {responses.length} respons
            </p>
          )}
          {lifecycle === "paid_draft" && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {isControlledReplacement
                ? "Draf penggantian pentadbir · boleh disunting."
                : "Bayaran selesai · sedia untuk diterbitkan."}
            </p>
          )}
          {lifecycle === "publishing" && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Sedang diproses · semak status.
            </p>
          )}
          {lifecycle === "unavailable" && (
            <p className="mt-2 text-xs leading-5 text-destructive">
              Tidak tersedia · buka Butiran atau hubungi sokongan.
            </p>
          )}
          {deadline && lifecycle === "edit_window" && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {deadline.label}
            </p>
          )}
          {deadline && lifecycle === "edit_window_expired" && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {deadline.label}
            </p>
          )}
          {editRequestStatusId && <div id={editRequestStatusId} />}
          {manualPayment && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              <span className="font-medium text-primary">
                {manualPayment.outcome === "pending"
                  ? "Bayaran menunggu semakan."
                  : "Maklumat bayaran tersedia dalam Butiran."}
              </span>
            </p>
          )}
          <div className="invitation-actions mt-auto flex flex-col gap-2 pt-5">
            {lifecycle === "edit_window_expired" ? (
              <EditRequestDialog
                cardId={record.id}
                lifecycle={lifecycle}
                statusTargetId={editRequestStatusId ?? undefined}
                triggerVariant="default"
                triggerSize="default"
                compactStatus
                expiredSupportContact={supportContact}
                existingRequest={
                  editRequest?.status === "approved" ? null : editRequest
                }
              />
            ) : (
              <>
                <div className="min-h-11 w-full">
                  {primaryHref ? (
                    <Button asChild className="w-full">
                      <Link href={primaryHref}>
                        {primaryLabel}
                        <ArrowRight size={15} aria-hidden />
                      </Link>
                    </Button>
                  ) : (
                    <SupportContactDialog contact={supportContact} />
                  )}
                </div>
                {!publicInvitation && (
                  <div className="invitation-secondary-track flex flex-wrap items-center justify-between gap-2">
                    {showPaymentAction && (
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link
                          href={`/dashboard/checkout/${record.order_id}${manualPayment ? "/qr" : ""}`}
                        >
                          <ReceiptText size={14} className="shrink-0" aria-hidden />
                          {manualPayment &&
                          manualPayment.remainingSen > 0 &&
                          manualPayment.receivedSen > 0 &&
                          manualPayment.outcome !== "pending"
                            ? `Bayar baki RM ${(manualPayment.remainingSen / 100).toFixed(2)}`
                            : "Lihat bayaran"}
                        </Link>
                      </Button>
                    )}
                    {showDeleteAction && (
                      <DeleteCardButton
                        cardId={record.id}
                        checkoutReserved={Boolean(
                          order?.checkout_reservation_token,
                        )}
                      />
                    )}
                  </div>
                )}
              </>
            )}
            {publicInvitation && (
              <div className="invitation-secondary-actions grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/i/${record.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka jemputan
                    <ExternalLink size={13} aria-hidden />
                  </Link>
                </Button>
                <CopyLinkButton url={`${APP_URL}/i/${record.slug}`} compact />
                {publicInvitation && editRequestStatusId && (
                  <div className="invitation-secondary-track min-w-0 min-[480px]:col-span-2">
                    <EditRequestDialog
                      cardId={record.id}
                      lifecycle={lifecycle}
                      statusTargetId={editRequestStatusId}
                      triggerVariant="outline"
                      triggerSize="sm"
                      compactStatus
                      existingRequest={
                        editRequest?.status === "approved" ? null : editRequest
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="min-h-[80vh] bg-background">
      <div className="mx-auto max-w-[1240px] px-5 py-5 sm:px-8 sm:py-7">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Ruang anda
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
              Jemputan saya
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Daripada draf pertama hingga jawapan tetamu — urus setiap majlis
              di sini.
            </p>
          </div>
          <Button asChild>
            <Link href="/templates">
              <Plus size={16} aria-hidden />
              Jemputan baharu
            </Link>
          </Button>
        </header>
        {records.length === 0 ? (
          <section className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
            <MailOpen
              className="mx-auto mb-5 text-primary"
              size={38}
              strokeWidth={1.3}
              aria-hidden
            />
            <h2 className="text-xl font-semibold">
              Mulakan dengan satu jemputan.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Pilih reka bentuk untuk majlis anda. Simpan draf dan sambung
              bila-bila masa.
            </p>
            <Button asChild className="mt-6">
              <Link href="/templates">
                Pilih reka bentuk
                <ArrowRight size={16} aria-hidden />
              </Link>
            </Button>
          </section>
        ) : (
          <InvitationGallery
            groups={groups.map((group) => ({
              id: group.id,
              heading: group.heading,
              description: group.description,
              entries: group.rows.map((row) => ({
                id: row.record.id,
                searchText: `${row.title} ${row.record.slug} ${row.eventDate || ""}`,
                content: renderRow(row),
              })),
            }))}
          />
        )}
      </div>
    </div>
  )
}
