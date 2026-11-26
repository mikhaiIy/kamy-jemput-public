import { requireAdmin } from "@/lib/auth/require-admin"
import { AdminPageHeader } from "../../../AdminPageHeader"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { PhonePreview } from "@/components/PhonePreview"
import { DeleteCardButton } from "./DeleteCardButton"
import { TogglePublishButton } from "./TogglePublishButton"
import { GrantEditWindowButton } from "./GrantEditWindowButton"
import { ControlledReplacementPanel } from "./ControlledReplacementPanel"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  deriveCardLifecycle,
  getCardEventName,
  type AvailabilityActionKind,
  type CardData,
  type CardLifecycle,
  type PaymentMethod,
} from "@/lib/types"
import { PAYMENT_METHOD_LABEL_MS } from "@/lib/payments"
import { TEMPLATE_NAMES } from "@/lib/template-names"

const LIFECYCLE_LABELS: Record<CardLifecycle, string> = {
  editing: "Draf · belum dibayar",
  paid_draft: "Draf berbayar · belum diterbitkan",
  publishing: "Sedang disiapkan",
  published: "Diterbitkan",
  edit_window: "Suntingan diluluskan",
  edit_window_expired: "Suntingan tamat — terkunci",
  unavailable: "Dinyahterbitkan",
  retired: "Dihentikan kekal",
}

export default async function AdminCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const { data: card } = await supabaseAdmin
    .from("cards")
    .select(
      `
      id, slug, custom_data, custom_data_draft, draft_version, last_activity_at, is_published, published_at, template_id, user_id, order_id, created_at,
      revision_draft, current_publication_id, active_edit_window_id,
      users (email),
      templates (name),
      orders (status, payment_method, payment_completed_at, manual_paid_draft, entitlement_source, replacement_grant_id)
    `,
    )
    .eq("id", id)
    .single()

  if (!card) notFound()

  const [{ data: predecessorGrant, error: predecessorGrantError }, { data: replacementGrantRow, error: replacementGrantError }] = await Promise.all([
    supabaseAdmin
      .from("card_replacement_grants")
      .select("id, predecessor_card_id, replacement_card_id, reason, granted_at")
      .eq("predecessor_card_id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("card_replacement_grants")
      .select("id, predecessor_card_id, replacement_card_id, reason, granted_at")
      .eq("replacement_card_id", id)
      .maybeSingle(),
  ])
  if (predecessorGrantError || replacementGrantError) throw predecessorGrantError ?? replacementGrantError
  const replacementGrant = predecessorGrant ?? replacementGrantRow
  const { data: replacementCutover, error: replacementCutoverError } = replacementGrant
    ? await supabaseAdmin
        .from("card_replacement_cutovers")
        .select("id, grant_id, replacement_publication_id, created_at")
        .eq("grant_id", replacementGrant.id)
        .maybeSingle()
    : { data: null, error: null }
  if (replacementCutoverError) throw replacementCutoverError

  const sourceReviewCardId = replacementGrant?.predecessor_card_id ?? card.id
  const [{ data: sourceReviewCard, error: sourceReviewError }, { data: replacementReviewCard, error: replacementReviewError }] = await Promise.all([
    sourceReviewCardId === card.id
      ? Promise.resolve({ data: { current_publication_id: card.current_publication_id }, error: null })
      : supabaseAdmin
          .from("cards")
          .select("current_publication_id")
          .eq("id", sourceReviewCardId)
          .maybeSingle<{ current_publication_id: string | null }>(),
    replacementGrant && !replacementCutover
      ? supabaseAdmin
          .from("cards")
          .select("draft_version")
          .eq("id", replacementGrant.replacement_card_id)
          .maybeSingle<{ draft_version: number }>()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (sourceReviewError || replacementReviewError) throw sourceReviewError ?? replacementReviewError
  const expectedSourcePublicationId = sourceReviewCard?.current_publication_id ?? null
  const expectedReplacementDraftVersion = replacementReviewCard?.draft_version ?? null

  // Ordered availability-action history (newest first) with the recorded actor.
  const { data: history, error: historyError } = await supabaseAdmin
    .from("card_availability_actions")
    .select("id, action, reason, created_at, admin_id, users (email)")
    .eq("card_id", id)
    .order("created_at", { ascending: false })

  if (historyError) throw historyError

  const { data: editWindows, error: editWindowsError } = await supabaseAdmin
    .from("card_edit_windows")
    .select(
      "id, request_id, reason, granted_at, expires_at, admin_id, users!card_edit_windows_admin_id_fkey (email)",
    )
    .eq("card_id", id)
    .order("granted_at", { ascending: false })
  if (editWindowsError) throw editWindowsError

  let currentPublicationData: CardData | null = null
  if (card.current_publication_id) {
    const { data: publication, error: publicationError } = await supabaseAdmin
      .from("card_publications")
      .select("snapshot")
      .eq("id", card.current_publication_id)
      .eq("card_id", card.id)
      .maybeSingle()
    if (publicationError) throw publicationError
    if (publication?.snapshot && typeof publication.snapshot === "object") {
      currentPublicationData = publication.snapshot as CardData
    }
  }

  const [{ count: rsvpCount }, { data: attendingResponses }] =
    await Promise.all([
      supabaseAdmin
        .from("rsvp_responses")
        .select("id", { count: "exact", head: true })
        .eq("card_id", card.id),
      supabaseAdmin
        .from("rsvp_responses")
        .select("pax")
        .eq("card_id", card.id)
        .eq("attending", true),
    ])

  const cardData = (card.revision_draft ??
    card.custom_data_draft ??
    currentPublicationData ??
    card.custom_data) as CardData
  const owner = (Array.isArray(card.users) ? card.users[0] : card.users) as {
    email: string
  } | null
  const template = (
    Array.isArray(card.templates) ? card.templates[0] : card.templates
  ) as { name: string } | null
  const order = (Array.isArray(card.orders) ? card.orders[0] : card.orders) as {
    status: string
    payment_method: PaymentMethod | null
    payment_completed_at: string | null
    manual_paid_draft: boolean
    entitlement_source?: "payment" | "controlled_replacement"
    replacement_grant_id?: string | null
  } | null
  const orderStatus = order?.status ?? null
  const attending = attendingResponses?.length ?? 0
  const pax =
    attendingResponses?.reduce(
      (total, response) => total + (response.pax ?? 0),
      0,
    ) ?? 0

  const orderPaid = orderStatus === "paid"
  const paymentCompletedAt = order?.payment_completed_at ?? null
  const daysSincePayment = paymentCompletedAt
    ? Math.max(
        0,
        Math.floor(
          (new Date().getTime() - new Date(paymentCompletedAt).getTime()) /
            86_400_000,
        ),
      )
    : null
  const latestAction =
    (history?.[0]?.action as AvailabilityActionKind | undefined) ?? null
  const activeWindow =
    (editWindows ?? []).find(
      (window) => window.id === card.active_edit_window_id,
    ) ?? null
  const lifecycle = deriveCardLifecycle({
    orderPaid,
    isPublished: card.is_published,
    manualPaidDraft: order?.manual_paid_draft,
    latestAction,
    firstPublishedAt: card.published_at,
    currentPublicationId: card.current_publication_id,
    activeEditWindowId: card.active_edit_window_id,
    editWindowExpiresAt: activeWindow?.expires_at ?? null,
    retired: Boolean(
      replacementCutover && replacementGrant?.predecessor_card_id === card.id,
    ),
  })
  const disableReason =
    latestAction === "disabled" ? (history?.[0]?.reason ?? null) : null

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleString("ms-MY", {
          timeZone: "Asia/Kuala_Lumpur",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—"
  return (
    <div>
      <Link
        href="/admin/cards"
        className="admin-link mb-5 inline-block text-xs"
      >
        ← Jemputan pelanggan
      </Link>
      <AdminPageHeader
        title={getCardEventName(cardData)}
        description={owner?.email ?? "Jemputan pelanggan"}
      />
      <div className="mb-7 flex flex-wrap items-center gap-3">
        <Badge
          variant={
            lifecycle === "published"
              ? "success"
              : lifecycle === "unavailable" || lifecycle === "retired"
                ? "destructive"
                : "secondary"
          }
        >
          {LIFECYCLE_LABELS[lifecycle]}
        </Badge>
        <span className="break-all font-mono text-xs text-muted-foreground">
          /i/{card.slug}
        </span>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <section aria-label="Pratonton telefon jemputan" className="min-w-0">
          <div className="flex justify-center">
            <PhonePreview mode="phone">
              <iframe
                src={`/admin/cards/${card.id}/preview`}
                title="Pratonton telefon jemputan pelanggan"
                className="block h-full w-full border-0"
              />
            </PhonePreview>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            {card.revision_draft
              ? "Draf suntingan terkini"
              : card.custom_data_draft
                ? "Draf tersimpan terkini"
                : "Jemputan tersimpan"}{" "}
            · Tatal untuk melihat jemputan.
          </p>
        </section>
        <div className="min-w-0 space-y-4">
          <section
            className="admin-panel p-5 sm:p-6"
            aria-labelledby="invitation-summary"
          >
            <h2 id="invitation-summary" className="text-sm font-semibold">
              Ringkasan jemputan
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-5 text-xs">
              <div>
                <dt className="text-muted-foreground">Reka bentuk</dt>
                <dd className="mt-2 font-medium break-words">
                  {template?.name ??
                    TEMPLATE_NAMES[card.template_id] ??
                    card.template_id}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bayaran</dt>
                <dd className="mt-2 font-medium">
                  {order?.entitlement_source === "controlled_replacement"
                    ? "Penggantian diluluskan pentadbir"
                    : orderPaid
                      ? "Dibayar"
                      : "Belum dibayar"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Respons RSVP</dt>
                <dd className="mt-2 text-xl font-semibold tabular-nums">
                  {rsvpCount ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tetamu hadir</dt>
                <dd className="mt-2 text-xl font-semibold tabular-nums">
                  {pax}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({attending} respons)
                  </span>
                </dd>
              </div>
            </dl>
            {disableReason && (
              <p className="mt-5 rounded-lg bg-destructive/5 p-3 text-xs leading-5 text-destructive">
                Sebab dinyahterbitkan: {disableReason}
              </p>
            )}
            {activeWindow && (
              <p className="mt-5 rounded-lg bg-secondary p-3 text-xs leading-5">
                {lifecycle === "edit_window"
                  ? `Suntingan dibuka sehingga ${formatDate(activeWindow.expires_at)}.`
                  : "Suntingan tamat. Jemputan kekal peribadi sehingga suntingan dibuka dan diterbitkan semula."}
              </p>
            )}
            {lifecycle === "published" && (
              <Link
                href={`/i/${card.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-secondary mt-5"
              >
                Buka jemputan awam ↗
              </Link>
            )}
            {lifecycle === "paid_draft" && (
              <p className="mt-5 text-xs leading-5 text-muted-foreground">
                {order?.entitlement_source === "controlled_replacement"
                  ? "Pemilik boleh menyunting draf penggantian. Ia hanya akan menjadi awam selepas pentadbir melengkapkan potong ganti."
                  : "Pemilik boleh menyunting dan menerbitkan jemputan selepas semakan mereka. Bayaran sahaja tidak menerbitkan jemputan."}
              </p>
            )}
            {replacementGrant && (
              <ControlledReplacementPanel
                cardId={card.id}
                predecessorCardId={replacementGrant.predecessor_card_id}
                replacementCardId={replacementGrant.replacement_card_id}
                grantId={replacementGrant.id}
                reason={replacementGrant.reason}
                completed={Boolean(replacementCutover)}
                expectedSourcePublicationId={expectedSourcePublicationId}
                expectedReplacementDraftVersion={expectedReplacementDraftVersion}
              />
            )}
            {!predecessorGrant && lifecycle !== "retired" && (lifecycle === "published" || lifecycle === "unavailable") && (
              <ControlledReplacementPanel
                cardId={card.id}
                predecessorCardId={card.id}
                replacementCardId={null}
                grantId={null}
                reason={null}
                completed={false}
                expectedSourcePublicationId={expectedSourcePublicationId}
                expectedReplacementDraftVersion={null}
              />
            )}
          </section>

          <details className="admin-panel admin-disclosure">
            <summary>
              Bayaran & aktiviti
              <span>Kaedah bayaran, tarikh dan rekod draf</span>
            </summary>
            <div className="admin-disclosure-body">
              <dl className="space-y-4 text-xs">
                {[
                  ["ID jemputan", card.id],
                  ["ID reka bentuk", card.template_id],
                  ["Dicipta", formatDate(card.created_at)],
                  ["Diterbitkan", formatDate(card.published_at)],
                  [
                    "Sumber entitlement",
                    order?.entitlement_source === "controlled_replacement"
                      ? "Penggantian diluluskan pentadbir"
                      : "Bayaran pelanggan",
                  ],
                  [
                    "Kaedah bayaran",
                    order?.entitlement_source === "controlled_replacement"
                      ? "Tiada — bukan bayaran baharu"
                      : order?.payment_method
                        ? PAYMENT_METHOD_LABEL_MS[order.payment_method]
                        : "—",
                  ],
                  [
                    "Bayaran disahkan",
                    order?.entitlement_source === "controlled_replacement"
                      ? "Tiada — grant pentadbir"
                      : formatDate(paymentCompletedAt),
                  ],
                  [
                    "Hari sejak bayaran",
                    order?.entitlement_source === "controlled_replacement"
                      ? "Tiada — grant pentadbir"
                      : daysSincePayment === null
                      ? "—"
                      : `${daysSincePayment} hari`,
                  ],
                  [
                    "Aktiviti pelanggan terkini",
                    formatDate(card.last_activity_at),
                  ],
                  ["Versi draf", String(card.draft_version ?? 0)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-wrap justify-between gap-2"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="break-all font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              {card.order_id && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    className="admin-secondary"
                    href={`/admin/orders?q=${card.order_id}`}
                  >
                    Lihat pesanan →
                  </Link>
                  {order?.entitlement_source !== "controlled_replacement" && (
                    <Link
                      className="admin-secondary"
                      href={`/admin/payments?q=${card.order_id}`}
                    >
                      Rekod bayaran →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </details>

          <details className="admin-panel admin-disclosure">
            <summary>
              Akses & suntingan
              <span>Urus ketersediaan dan kelulusan suntingan</span>
            </summary>
            <div className="admin-disclosure-body space-y-5">
              {!replacementGrant && (
                <TogglePublishButton cardId={card.id} lifecycle={lifecycle} />
              )}
              {card.published_at && lifecycle !== "unavailable" && lifecycle !== "retired" && !replacementGrant && (
                <GrantEditWindowButton
                  cardId={card.id}
                  lifecycle={lifecycle}
                  activeWindow={
                    activeWindow
                      ? {
                          id: activeWindow.id,
                          expiresAt: activeWindow.expires_at,
                        }
                      : null
                  }
                />
              )}
            </div>
          </details>

          <details className="admin-panel admin-disclosure">
            <summary>
              Sejarah tindakan
              <span>
                {(history?.length ?? 0) + (editWindows?.length ?? 0)} rekod
                pentadbir
              </span>
            </summary>
            <div className="admin-disclosure-body space-y-6">
              <section>
                <h3 className="mb-3 text-xs font-semibold">Bukaan suntingan</h3>
                {!editWindows?.length ? (
                  <p className="text-xs text-muted-foreground">Tiada rekod.</p>
                ) : (
                  <ul className="space-y-3">
                    {editWindows.map((window) => {
                      const actor = Array.isArray(window.users)
                        ? window.users[0]
                        : window.users
                      return (
                        <li
                          key={window.id}
                          className="rounded-lg border p-3 text-xs leading-5"
                        >
                          <p className="font-medium">
                            7 hari · {formatDate(window.granted_at)}
                          </p>
                          <p className="text-muted-foreground break-all">
                            Oleh {actor?.email ?? window.admin_id} · tamat{" "}
                            {formatDate(window.expires_at)}
                          </p>
                          <p className="mt-1 break-words">{window.reason}</p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="mb-3 text-xs font-semibold">
                  Ketersediaan jemputan
                </h3>
                {!history?.length ? (
                  <p className="text-xs text-muted-foreground">Tiada rekod.</p>
                ) : (
                  <ul className="space-y-3">
                    {history.map((entry) => {
                      const actor = Array.isArray(entry.users)
                        ? entry.users[0]
                        : entry.users
                      return (
                        <li
                          key={entry.id}
                          className="rounded-lg border p-3 text-xs leading-5"
                        >
                          <p className="font-medium">
                            {entry.action === "disabled"
                              ? "Dinyahterbitkan"
                              : "Dipulihkan"}{" "}
                            · {formatDate(entry.created_at)}
                          </p>
                          <p className="text-muted-foreground break-all">
                            Oleh {actor?.email ?? entry.admin_id}
                          </p>
                          {entry.reason && (
                            <p className="mt-1 break-words">{entry.reason}</p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          </details>

          <details className="admin-panel admin-disclosure">
            <summary className="text-destructive">
              Padam jemputan<span>Tindakan kekal</span>
            </summary>
            <div className="admin-disclosure-body">
              <p className="mb-4 text-xs leading-5 text-muted-foreground">
                Pemadaman tertakluk kepada perlindungan bayaran dan rekod audit.
              </p>
              {lifecycle === "editing" && !replacementGrant ? (
                <DeleteCardButton cardId={card.id} />
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  Jemputan berbayar atau dalam lineage penggantian tidak boleh dipadamkan.
                </p>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
