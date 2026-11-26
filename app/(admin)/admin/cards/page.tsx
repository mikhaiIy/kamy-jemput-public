import Link from "next/link"
import { requireAdmin } from "@/lib/auth/require-admin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { loadAdminPages } from "@/lib/admin-records"
import {
  deriveCardLifecycle,
  getCardEventName,
  type CardData,
  type CardLifecycle,
} from "@/lib/types"
import { AdminPageHeader, AdminStatus } from "../../AdminPageHeader"
import { AdminTable } from "../../AdminTable"

export const metadata = { title: "Jemputan pelanggan — Pentadbir kamy jemput" }
const labels: Record<CardLifecycle, string> = {
  editing: "Draf",
  paid_draft: "Draf berbayar",
  publishing: "Diproses",
  published: "Diterbitkan",
  edit_window: "Suntingan diluluskan",
  edit_window_expired: "Suntingan tamat",
  unavailable: "Tidak tersedia",
  retired: "Dihentikan kekal",
}

export default async function AdminCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  await requireAdmin()
  const { q = "", status = "" } = await searchParams
  const { data, error } = await loadAdminPages(async (cursor) => {
    const query = supabaseAdmin
      .from("cards")
      .select(
        "id,slug,created_at,custom_data,custom_data_draft,revision_draft,is_published,published_at,current_publication_id,active_edit_window_id,users(email,name),orders(status,manual_paid_draft,entitlement_source),card_availability_actions(action,created_at),card_edit_windows!cards_active_edit_window_fk(id,expires_at),card_publications!cards_current_publication_fk(snapshot)",
      )
      .order("created_at", {
        referencedTable: "card_availability_actions",
        ascending: false,
      })
      .limit(1, { referencedTable: "card_availability_actions" })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000)
    return cursor ? query.or(cursor) : query
  })
  const cardIds = (data ?? []).map((card) => card.id)
  const { data: retiredCutovers, error: retiredCutoversError } = cardIds.length
    ? await supabaseAdmin
        .from("card_replacement_cutovers")
        .select("predecessor_card_id")
        .in("predecessor_card_id", cardIds)
    : { data: [], error: null }
  if (retiredCutoversError) throw retiredCutoversError
  const retiredCardIds = new Set((retiredCutovers ?? []).map((row) => row.predecessor_card_id))
  return (
    <>
      <AdminPageHeader
        title="Jemputan pelanggan"
        description="Cari jemputan, kenal pasti statusnya dan buka butiran apabila diperlukan."
      />
      {error ? (
        <p role="alert" className="admin-error">
          Jemputan tidak dapat dimuatkan. Sila muat semula halaman.
        </p>
      ) : (
        <AdminTable
          label="jemputan"
          searchPlaceholder="Cari majlis, pelanggan, e-mel atau pautan…"
          initialSearch={q}
          defaultStatus={status}
          columns={["Jemputan", "Pelanggan", "Status", ""]}
          statuses={Object.entries(labels).map(([value, label]) => ({
            value,
            label,
          }))}
          rows={(data ?? []).map((card) => {
            const owner = Array.isArray(card.users) ? card.users[0] : card.users
            const order = Array.isArray(card.orders)
              ? card.orders[0]
              : card.orders
            const isControlledReplacement =
              order?.entitlement_source === "controlled_replacement"
            const publication = Array.isArray(card.card_publications)
              ? card.card_publications[0]
              : card.card_publications
            const latestAction = [
              ...(card.card_availability_actions ?? []),
            ].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
              ?.action as "disabled" | "restored" | undefined
            const window = Array.isArray(card.card_edit_windows)
              ? card.card_edit_windows[0]
              : card.card_edit_windows
            const lifecycle = deriveCardLifecycle({
              orderPaid: order?.status === "paid",
              isPublished: card.is_published,
              manualPaidDraft: order?.manual_paid_draft,
              latestAction: latestAction ?? null,
              firstPublishedAt: card.published_at,
              currentPublicationId: card.current_publication_id,
              activeEditWindowId: card.active_edit_window_id,
              editWindowExpiresAt: window?.expires_at ?? null,
              retired: retiredCardIds.has(card.id),
            })
            const source =
              card.revision_draft ??
              card.custom_data_draft ??
              publication?.snapshot ??
              card.custom_data
            const title = source
              ? getCardEventName(source as CardData)
              : "Jemputan tanpa nama"
            return {
              id: card.id,
              status: lifecycle,
              search: `${title} ${card.slug} ${card.id} ${owner?.name ?? ""} ${owner?.email ?? ""}`,
              cells: [
                <div key="invitation">
                  <Link
                    href={`/admin/cards/${card.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {title}
                  </Link>
                  <p className="mt-1 max-w-64 truncate text-[11px] text-muted-foreground">
                    /i/{card.slug}
                  </p>
                </div>,
                <div key="owner">
                  <p>{owner?.name || owner?.email || "Pelanggan"}</p>
                  {owner?.name && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {owner.email}
                    </p>
                  )}
                </div>,
                <div key="status">
                  <AdminStatus
                    tone={
                      lifecycle === "published"
                        ? "success"
                        : lifecycle === "unavailable" || lifecycle === "retired"
                          ? "danger"
                          : lifecycle === "editing"
                            ? undefined
                            : "warning"
                    }
                  >
                    {labels[lifecycle]}
                  </AdminStatus>
                  {isControlledReplacement && (
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Penggantian diluluskan pentadbir
                    </p>
                  )}
                </div>,
                <Link
                  key="manage"
                  href={`/admin/cards/${card.id}`}
                  className="admin-secondary whitespace-nowrap"
                  aria-label={`Urus ${title}`}
                >
                  Buka butiran →
                </Link>,
              ],
            }
          })}
        />
      )}
    </>
  )
}
