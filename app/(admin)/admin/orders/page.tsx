import { requireAdmin } from "@/lib/auth/require-admin"
import Link from "next/link"
import { loadAdminPages } from "@/lib/admin-records"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { TEMPLATE_NAMES } from "@/lib/template-names"
import { formatMyrFromSen, PAYMENT_METHOD_LABEL_MS } from "@/lib/payments"
import {
  deriveCardLifecycle,
  type CardLifecycle,
  type PaymentMethod,
} from "@/lib/types"
import { AdminPageHeader, AdminStatus } from "../../AdminPageHeader"
import { AdminTable } from "../../AdminTable"

export const metadata = { title: "Pesanan — Pentadbir kamy jemput" }
const labels: Record<string, string> = {
  pending: "Belum dibayar",
  paid: "Dibayar",
  failed: "Gagal",
}

const lifecycleLabels: Record<CardLifecycle, string> = {
  editing: "Draf",
  paid_draft: "Draf berbayar",
  publishing: "Diproses",
  published: "Diterbitkan",
  edit_window: "Suntingan diluluskan",
  edit_window_expired: "Suntingan tamat",
  unavailable: "Tidak tersedia",
  retired: "Dihentikan kekal",
}

function formatAdminDate(value: string | null | undefined) {
  if (!value) return null
  return new Date(value).toLocaleString("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function daysSincePayment(value: string | null | undefined) {
  if (!value) return null
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000))
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  await requireAdmin()
  const { q = "", status = "" } = await searchParams
  const { data, error } = await loadAdminPages(async (cursor) => {
    const query = supabaseAdmin
      .from("orders")
      .select(
        "id, status, price_myr, created_at, template_id, payment_method, payment_completed_at, manual_paid_draft, entitlement_source, replacement_grant_id, users(email,name), cards(id,slug,is_published,published_at,current_publication_id,active_edit_window_id,last_activity_at)",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000)
    return cursor ? query.or(cursor) : query
  })
  const cards = (data ?? [])
    .map((order) => (Array.isArray(order.cards) ? order.cards[0] : order.cards))
    .filter(
      (card): card is {
        id: string
        slug: string
        is_published: boolean
        published_at: string | null
        current_publication_id: string | null
        active_edit_window_id: string | null
        last_activity_at: string | null
      } => Boolean(card?.id),
    )
  const { data: availabilityActions, error: availabilityError } = cards.length
    ? await supabaseAdmin
        .from("card_availability_actions")
        .select("card_id, action, created_at")
        .in("card_id", cards.map((card) => card.id))
        .order("created_at", { ascending: false })
    : { data: [], error: null }
  if (availabilityError) throw availabilityError
  const { data: editWindows, error: editWindowsError } = cards.length
    ? await supabaseAdmin
        .from("card_edit_windows")
        .select("id, card_id, expires_at")
        .in("card_id", cards.map((card) => card.id))
        .order("granted_at", { ascending: false })
    : { data: [], error: null }
  if (editWindowsError) throw editWindowsError
  const { data: retiredCutovers, error: retiredCutoversError } = cards.length
    ? await supabaseAdmin
        .from("card_replacement_cutovers")
        .select("predecessor_card_id")
        .in("predecessor_card_id", cards.map((card) => card.id))
    : { data: [], error: null }
  if (retiredCutoversError) throw retiredCutoversError
  const retiredCardIds = new Set((retiredCutovers ?? []).map((row) => row.predecessor_card_id))
  const editWindowById = new Map((editWindows ?? []).map((window) => [window.id, window]))
  const latestActionByCard = new Map<string, "disabled" | "restored">()
  for (const action of availabilityActions ?? []) {
    if (!latestActionByCard.has(action.card_id)) {
      latestActionByCard.set(action.card_id, action.action as "disabled" | "restored")
    }
  }
  return (
    <>
      <AdminPageHeader
        title="Pesanan"
        description="Cari pelanggan, semak bayaran dan buka jemputan daripada satu tempat."
        action={
          <Link className="admin-button" href="/templates">
            Cipta jemputan
          </Link>
        }
      />
      {error ? (
        <p role="alert" className="admin-error">
          Pesanan tidak dapat dimuatkan. Sila muat semula halaman.
        </p>
      ) : (
        <>
          <AdminTable
            label="pesanan"
            searchPlaceholder="Cari nama, e-mel atau ID pesanan…"
            columns={[
              "Pelanggan / Pesanan",
              "Template",
              "Jumlah",
              "Bayaran",
              "Kitaran / aktiviti",
              "Tarikh",
              "Jemputan",
            ]}
            statuses={Object.entries(labels).map(([value, label]) => ({
              value,
              label,
            }))}
            initialSearch={q}
            defaultStatus={status}
            rows={(data ?? []).map((o) => {
              const owner = Array.isArray(o.users) ? o.users[0] : o.users
              const card = Array.isArray(o.cards) ? o.cards[0] : o.cards
              const lifecycle = card
                ? deriveCardLifecycle({
                    orderPaid: o.status === "paid",
                    isPublished: card.is_published,
                    manualPaidDraft: o.manual_paid_draft,
                    latestAction: latestActionByCard.get(card.id) ?? null,
                    firstPublishedAt: card.published_at,
                    currentPublicationId: card.current_publication_id,
                    activeEditWindowId: card.active_edit_window_id,
                    editWindowExpiresAt: editWindowById.get(card.active_edit_window_id ?? "")?.expires_at ?? null,
                    retired: retiredCardIds.has(card.id),
                  })
                : null
              const paymentDate = formatAdminDate(o.payment_completed_at)
              const activityDate = formatAdminDate(card?.last_activity_at)
              const paymentAge = daysSincePayment(o.payment_completed_at)
              return {
                id: o.id,
                status: o.status,
                search: `${o.id} ${owner?.name ?? ""} ${owner?.email ?? ""} ${TEMPLATE_NAMES[o.template_id] ?? o.template_id}`,
                cells: [
                  <div key="owner">
                    <p className="font-semibold">
                      {owner?.name || owner?.email || "Pelanggan"}
                    </p>
                    {owner?.name && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {owner.email}
                      </p>
                    )}
                    <p
                      className="mt-2 font-mono text-[10px] text-muted-foreground"
                      title={o.id}
                    >
                      #{o.id.slice(0, 8)}
                    </p>
                  </div>,
                  TEMPLATE_NAMES[o.template_id] ?? o.template_id,
                  <span
                    key="price"
                    className="whitespace-nowrap font-semibold tabular-nums"
                  >
                    {o.entitlement_source === "controlled_replacement"
                      ? "Admin grant · geen betaling"
                      : formatMyrFromSen(o.price_myr)}
                  </span>,
                  <div key="status">
                    <AdminStatus
                      tone={
                        o.status === "paid"
                          ? "success"
                          : o.status === "failed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {labels[o.status] ?? o.status}
                    </AdminStatus>
                    {o.entitlement_source === "controlled_replacement" ? (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Penggantian diluluskan pentadbir
                      </p>
                    ) : o.payment_method ? (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {PAYMENT_METHOD_LABEL_MS[
                          o.payment_method as PaymentMethod
                        ] ?? o.payment_method}
                      </p>
                    ) : null}
                    {o.entitlement_source !== "controlled_replacement" && paymentDate && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {paymentDate}
                      </p>
                    )}
                  </div>,
                  <div key="lifecycle" className="min-w-44">
                    {lifecycle ? (
                      <AdminStatus
                        tone={
                          lifecycle === "published"
                            ? "success"
                            : lifecycle === "unavailable"
                              ? "danger"
                            : lifecycle === "paid_draft"
                                ? "warning"
                                : lifecycle === "edit_window" || lifecycle === "edit_window_expired"
                                  ? "warning"
                                : undefined
                        }
                      >
                        {lifecycleLabels[lifecycle]}
                      </AdminStatus>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {o.entitlement_source !== "controlled_replacement" && paymentAge !== null && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {paymentAge} hari sejak bayaran
                      </p>
                    )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                      Aktiviti draf: {activityDate ?? "tiada rekod lama"}
                    </p>
                    {(lifecycle === "edit_window" || lifecycle === "edit_window_expired") && card?.active_edit_window_id && (
                      <p className="mt-1 text-[10px] text-primary">
                        {lifecycle === "edit_window"
                          ? `Tamat ${formatAdminDate(editWindowById.get(card.active_edit_window_id)?.expires_at) ?? "—"}`
                          : "Tamat — menunggu bukaan baharu"}
                      </p>
                    )}
                  </div>,
                  <span key="date" className="whitespace-nowrap text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("ms-MY", {
                      timeZone: "Asia/Kuala_Lumpur",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>,
                  card ? (
                    <Link
                      key="card"
                      className="admin-link whitespace-nowrap"
                      href={`/admin/cards/${card.id}`}
                    >
                      Urus jemputan →
                    </Link>
                  ) : (
                    "Belum tersedia"
                  ),
                ],
                details: (
                  <div key={o.id} className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">ID pesanan penuh</p>
                      <p className="mt-2 break-all font-mono text-xs">{o.id}</p>
                    </div>
                    {o.entitlement_source === "controlled_replacement" ? (
                      <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                        Penggantian diluluskan pentadbir · tiada rekod bayaran, resit atau hasil.
                      </p>
                    ) : (
                      <Link
                        href={`/admin/payments?q=${o.id}`}
                        className="admin-secondary"
                      >
                        Lihat rekod bayaran →
                      </Link>
                    )}
                  </div>
                ),
              }
            })}
          />
        </>
      )}
    </>
  )
}
