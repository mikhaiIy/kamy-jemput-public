import Link from "next/link"
import { requireAdmin } from "@/lib/auth/require-admin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCardEventName, type CardData, type CardEditRequestStatus } from "@/lib/types"
import { EditRequestReviewControls } from "@/components/EditRequestReviewControls"
import { AdminPageHeader, AdminStatus } from "../../AdminPageHeader"
import { AdminTable, type AdminTableServerPagination } from "../../AdminTable"

export const metadata = { title: "Mohon Suntingan — Pentadbir kamy jemput" }

const labels: Record<CardEditRequestStatus, string> = {
  pending: "Menunggu semakan",
  approved: "Diluluskan",
  rejected: "Ditolak",
  stale: "Tidak lagi tersedia",
}

const statusValues = new Set<CardEditRequestStatus>([
  "pending",
  "approved",
  "rejected",
  "stale",
])
const pageSize = 20

function tone(status: CardEditRequestStatus): "success" | "warning" | "danger" | undefined {
  if (status === "approved") return "success"
  if (status === "rejected" || status === "stale") return "danger"
  return "warning"
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleString("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function EditRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  await requireAdmin()
  const {
    q = "",
    status = "pending",
    page: pageParam = "1",
  } = await searchParams
  const statusFilter =
    status === "all"
      ? ""
      : statusValues.has(status as CardEditRequestStatus)
        ? status
        : "pending"
  const requestedPage = Math.max(1, Number.parseInt(pageParam, 10) || 1)
  let countQuery = supabaseAdmin
    .from("card_edit_requests")
    .select("id", { count: "exact", head: true })
  if (statusFilter) countQuery = countQuery.eq("status", statusFilter)
  const { count: requestCount, error: countError } = await countQuery
  if (countError) {
    return (
      <>
        <AdminPageHeader
          title="Mohon Suntingan"
          description="Semak permintaan pelanggan dalam aplikasi. Tiada mesej atau notifikasi luar dihantar untuk aliran ini."
        />
        <p role="alert" className="admin-error">
          Permintaan suntingan tidak dapat dimuatkan. Sila muat semula halaman.
        </p>
      </>
    )
  }
  const totalRequests = requestCount ?? 0
  const pageCount = Math.max(1, Math.ceil(totalRequests / pageSize))
  const currentPage = totalRequests
    ? Math.min(requestedPage, pageCount)
    : 1
  let requestQuery = supabaseAdmin
    .from("card_edit_requests")
    .select(
      "id, card_id, owner_id, request_id, reason, status, decision, decision_reason, submitted_publication_id, submitted_edit_window_id, submitted_availability_action_id, submitted_draft_version, submitted_at, decision_actor_id, decided_at, approved_edit_window_id",
    )
  if (statusFilter) requestQuery = requestQuery.eq("status", statusFilter)
  const { data: requests, error } = await requestQuery
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

  if (error) {
    return (
      <>
        <AdminPageHeader
          title="Mohon Suntingan"
          description="Semak permintaan pelanggan dalam aplikasi. Tiada mesej atau notifikasi luar dihantar untuk aliran ini."
        />
        <p role="alert" className="admin-error">
          Permintaan suntingan tidak dapat dimuatkan. Sila muat semula halaman.
        </p>
      </>
    )
  }

  const serverPagination: AdminTableServerPagination = {
    path: "/admin/edit-requests",
    page: currentPage,
    pageSize,
    total: totalRequests,
  }

  const cardIds = [...new Set((requests ?? []).map((request) => request.card_id))]
  const ownerIds = [...new Set((requests ?? []).map((request) => request.owner_id))]
  const [{ data: cards, error: cardsError }, { data: owners, error: ownersError }] = await Promise.all([
    cardIds.length
      ? supabaseAdmin
          .from("cards")
          .select("id, slug, custom_data, custom_data_draft, revision_draft")
          .in("id", cardIds)
      : Promise.resolve({ data: [], error: null }),
    ownerIds.length
      ? supabaseAdmin.from("users").select("id, email, name").in("id", ownerIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (cardsError || ownersError) {
    return (
      <>
        <AdminPageHeader
          title="Mohon Suntingan"
          description="Semak permintaan pelanggan dalam aplikasi. Tiada mesej atau notifikasi luar dihantar untuk aliran ini."
        />
        <p role="alert" className="admin-error">
          Butiran jemputan tidak dapat dimuatkan. Sila muat semula halaman.
        </p>
      </>
    )
  }

  const cardById = new Map((cards ?? []).map((card) => [card.id, card]))
  const ownerById = new Map((owners ?? []).map((owner) => [owner.id, owner]))
  const requestRows = (requests ?? []) as Array<{
    id: string
    card_id: string
    owner_id: string
    request_id: string
    reason: string
    status: CardEditRequestStatus
    decision: "approve" | "reject" | "stale" | null
    decision_reason: string | null
    submitted_publication_id: string
    submitted_edit_window_id: string | null
    submitted_availability_action_id: string | null
    submitted_draft_version: number
    submitted_at: string
    decision_actor_id: string | null
    decided_at: string | null
    approved_edit_window_id: string | null
  }>

  return (
    <>
      <AdminPageHeader
        title="Mohon Suntingan"
        description="Semak sebab pelanggan dan pilih lulus atau tolak. Jemputan tidak berubah sehingga anda membuat keputusan."
      />
      <AdminTable
        key={`${statusFilter}-${currentPage}-${q}`}
        label="permintaan suntingan"
        searchPlaceholder="Cari pada halaman ini…"
        initialSearch={q}
        columns={["Jemputan", "Pelanggan", "Sebab ringkas", "Status", "Dihantar"]}
        statuses={Object.entries(labels).map(([value, label]) => ({ value, label }))}
        defaultStatus={statusFilter}
        serverPagination={serverPagination}
        rows={requestRows.map((request) => {
          const card = cardById.get(request.card_id)
          const owner = ownerById.get(request.owner_id)
          const source = card?.revision_draft ?? card?.custom_data_draft ?? card?.custom_data
          const title = source ? getCardEventName(source as CardData) : "Jemputan tanpa nama"
          return {
            id: request.id,
            status: request.status,
            search: `${title} ${card?.slug ?? ""} ${owner?.name ?? ""} ${owner?.email ?? ""} ${request.reason}`,
            cells: [
              <div key="invitation">
                {card ? (
                  <Link href={`/admin/cards/${card.id}`} className="font-semibold text-primary hover:underline">
                    {title}
                  </Link>
                ) : (
                  <p className="font-semibold">{title}</p>
                )}
                <p className="mt-1 max-w-48 truncate text-[11px] text-muted-foreground">
                  {card ? `/i/${card.slug}` : "Jemputan tidak ditemui"}
                </p>
              </div>,
              <div key="owner">
                <p>{owner?.name || owner?.email || "Pelanggan"}</p>
                {owner?.name && <p className="mt-1 text-[11px] text-muted-foreground">{owner.email}</p>}
              </div>,
              <p key="reason" className="max-w-60 truncate" title={request.reason}>
                {request.reason}
              </p>,
              <AdminStatus key="status" tone={tone(request.status)}>
                {labels[request.status]}
              </AdminStatus>,
              formatDate(request.submitted_at),
            ],
            details: (
              <div key={request.id} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
                <div>
                  <h2 className="text-sm font-semibold">Sebab pelanggan</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{request.reason}</p>
                  <dl className="mt-6 grid gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">ID permintaan</dt>
                      <dd className="mt-1 break-all font-mono">{request.request_id}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Versi semasa dihantar</dt>
                      <dd className="mt-1 font-mono">{request.submitted_draft_version}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Dihantar</dt>
                      <dd className="mt-1">{formatDate(request.submitted_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Keputusan</dt>
                      <dd className="mt-1">{formatDate(request.decided_at)}</dd>
                    </div>
                  </dl>
                  {request.decision_reason && (
                    <p className="mt-5 rounded-lg border border-border bg-background p-3 text-xs leading-5">
                      <span className="font-semibold">Sebab keputusan: </span>
                      {request.decision_reason}
                    </p>
                  )}
                </div>
                <div className="admin-panel p-5">
                  <h2 className="text-sm font-semibold">Kawalan semakan</h2>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Semak sebab pelanggan sebelum meluluskan tetingkap suntingan
                    tujuh hari atau menolak dengan sebab yang jelas.
                  </p>
                  {request.status === "pending" ? (
                    <div className="mt-5">
                      <EditRequestReviewControls requestId={request.id} />
                    </div>
                  ) : (
                    <p className="mt-5 rounded-lg bg-secondary p-3 text-xs leading-5">
                      Keputusan akhir: <strong>{labels[request.status]}</strong>. Tiada
                      tindakan baharu boleh dibuka untuk rekod ini.
                    </p>
                  )}
                </div>
              </div>
            ),
          }
        })}
      />
    </>
  )
}
