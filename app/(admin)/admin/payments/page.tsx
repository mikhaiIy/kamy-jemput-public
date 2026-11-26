import Link from "next/link"
import { ReceiptViewer } from "@/components/ReceiptViewer"
import { requireAdmin } from "@/lib/auth/require-admin"
import {
  MANUAL_METHOD_LABEL,
  MANUAL_OUTCOMES,
  formatMyrFromSen,
  type ManualOutcome,
} from "@/lib/payments"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { loadAdminPages } from "@/lib/admin-records"
import { AdminPageHeader, AdminStatus } from "../../AdminPageHeader"
import { AdminTable } from "../../AdminTable"
import { ReceiptControls, ReviewControls } from "./ReviewControls"

export const metadata = { title: "Semakan bayaran — kamy jemput" }

type QueueRow = {
  id: string
  order_id: string
  prior_attempt_id: string | null
  current_receipt_id: string
  created_at: string
  method: "duitnow" | "tng"
  receipt_bucket: string
  receipt_object: string
  receipt_version: number
  customer_reference: string
  email: string | null
  price_myr: number
  total_sen: number
  credited_total_sen: number
  review_id: string | null
  outcome: ManualOutcome
  reason: string | null
  reviewer: string | null
  reviewed_at: string | null
  received_sen: number | null
  credited_sen: number | null
  remaining_sen: number | null
  excess_sen: number | null
  evidence_bucket: string | null
  evidence_object: string | null
  evidence_content_type: string | null
  evidence_size_bytes: number | null
  receipt_access: string | null
  receipt_content_type: string
  receipt_size_bytes: number
  order_status: string
  payment_method: string | null
  payment_completed_at: string | null
  manual_paid_draft: boolean
}

type ReceiptHistory = {
  id: string
  attempt_id: string
  created_at: string
  version: number
  content_type: string
  size_bytes: number
  transfer_reference: string
  payment_receipt_access: { state: string } | { state: string }[] | null
  manual_payment_reviews:
    | {
        id: string
        outcome: ManualOutcome
        received_amount_sen: number
        credited_amount_sen: number
        remaining_amount_sen: number
        excess_amount_sen: number
        reason: string
        reviewer: string
        created_at: string
        replaces_review_id: string | null
        evidence_object_path: string | null
      }[]
    | null
}

type LegacyTransfer = {
  id: string
  order_id: string
  created_at: string
  amount_sen: number
  transfer_reference: string
  users: { email: string } | { email: string }[] | null
  duitnow_payment_reviews: {
    id: string
    outcome: "confirmed" | "rejected"
    note: string
    created_at: string
  }[]
}

const first = <T,>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value

const when = (date: string | null) =>
  date
    ? new Date(date).toLocaleString("en-US", {
        hour12: true,
        timeZone: "Asia/Kuala_Lumpur",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

const statusFilters = MANUAL_OUTCOMES.map((value) => ({
  value,
  label:
    value === "pending"
      ? "Menunggu semakan"
      : value === "insufficient"
        ? "Baki belum dibayar"
        : value === "rejected"
          ? "Ditolak"
          : value === "confirmed"
            ? "Disahkan"
            : "Bayaran tambahan",
}))

function toneFor(outcome: ManualOutcome) {
  if (outcome === "confirmed") return "success" as const
  if (outcome === "rejected") return "danger" as const
  return "warning" as const
}

async function privateEvidenceLink(row: QueueRow) {
  if (!row.evidence_bucket || !row.evidence_object) return null
  const { data, error } = await supabaseAdmin.storage
    .from(row.evidence_bucket)
    .createSignedUrl(row.evidence_object, 300)
  return error ? null : data.signedUrl
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  await requireAdmin()
  const { q = "", status = "" } = await searchParams

  const queue = await loadAdminPages<QueueRow>(async (cursor) => {
    const query = supabaseAdmin
      .from("manual_payment_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000)
    return cursor ? query.or(cursor) : query
  })
  const histories = await loadAdminPages<ReceiptHistory>(async (cursor) => {
    const query = supabaseAdmin
      .from("payment_receipts")
      .select(
        "id,attempt_id,created_at,version,content_type,size_bytes,transfer_reference,payment_receipt_access(state),manual_payment_reviews(id,outcome,received_amount_sen,credited_amount_sen,remaining_amount_sen,excess_amount_sen,reason,reviewer,created_at,replaces_review_id,evidence_object_path)",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000)
    return cursor ? query.or(cursor) : query
  })
  const legacy = await loadAdminPages<LegacyTransfer>(async (cursor) => {
    const query = supabaseAdmin
      .from("duitnow_transfer_submissions")
      .select(
        "id,order_id,created_at,amount_sen,transfer_reference,users(email),duitnow_payment_reviews(id,outcome,note,created_at)",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000)
    return cursor ? query.or(cursor) : query
  })

  const historyByAttempt = new Map<string, ReceiptHistory[]>()
  for (const receipt of histories.data) {
    historyByAttempt.set(receipt.attempt_id, [
      ...(historyByAttempt.get(receipt.attempt_id) ?? []),
      receipt,
    ])
  }
  const pendingCount = queue.data.filter((row) => row.outcome === "pending").length
  const filterCount = new Map<ManualOutcome, number>(
    MANUAL_OUTCOMES.map((value) => [
      value,
      queue.data.filter((row) => row.outcome === value).length,
    ]),
  )

  const rows = await Promise.all(
    queue.data.map(async (row) => {
      const history = historyByAttempt.get(row.id) ?? []
      const latestReview = row.review_id
        ? history
            .flatMap((item) => item.manual_payment_reviews ?? [])
            .find((review) => review.id === row.review_id)
        : null
      const evidenceUrl = await privateEvidenceLink(row)
      const remaining = row.remaining_sen ?? Math.max(0, row.price_myr - row.credited_total_sen)
      const received = row.total_sen
      const excess = Math.max(0, received - row.price_myr)

      return {
        id: row.id,
        status: row.outcome,
        search: `${row.email ?? ""} ${row.order_id} ${row.customer_reference} ${MANUAL_METHOD_LABEL[row.method]}`,
        detailLabel: row.outcome === "pending" ? "Semak resit" : "Lihat rekod",
        cells: [
          <div key="owner">
            <p className="font-semibold">{row.email ?? "Pelanggan"}</p>
            <Link
              href={`/admin/orders?q=${row.order_id}`}
              className="mt-2 block font-mono text-[10px] text-muted-foreground underline"
              title={row.order_id}
            >
              #{row.order_id.slice(0, 8)}
            </Link>
          </div>,
          <span key="method">{MANUAL_METHOD_LABEL[row.method]}</span>,
          <div key="amount" className="whitespace-nowrap tabular-nums">
            <p className="font-semibold">{formatMyrFromSen(row.price_myr)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Diterima {formatMyrFromSen(received)}
            </p>
          </div>,
          <AdminStatus key="state" tone={toneFor(row.outcome)}>
            {statusFilters.find((item) => item.value === row.outcome)?.label}
          </AdminStatus>,
          <span key="date" className="whitespace-nowrap text-[11px] text-muted-foreground">
            {when(row.created_at)}
          </span>,
        ],
        details: (
          <div
            key={row.id}
            className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="admin-eyebrow">Bukti sebelum keputusan</p>
                  <h2 className="mt-2 text-xl font-semibold text-primary">
                    {MANUAL_METHOD_LABEL[row.method]} · {formatMyrFromSen(row.price_myr)}
                  </h2>
                  <p className="mt-1 break-all text-[11px] text-muted-foreground">
                    Pesanan {row.order_id} · Cubaan {row.id}
                  </p>
                </div>
                <AdminStatus tone={toneFor(row.outcome)}>
                  {statusFilters.find((item) => item.value === row.outcome)?.label}
                </AdminStatus>
              </div>

              <dl className="my-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
                {[
                  ["Harga pesanan", row.price_myr],
                  ["Diterima", received],
                  ["Dikreditkan", row.credited_total_sen],
                  ["Baki", remaining],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white p-4">
                    <dt className="text-[10px] text-muted-foreground">{label}</dt>
                    <dd className="mt-2 font-semibold tabular-nums">
                      {formatMyrFromSen(Number(value))}
                    </dd>
                  </div>
                ))}
              </dl>
              {excess > 0 && (
                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                  Lebihan {formatMyrFromSen(excess)} direkodkan untuk sokongan bayaran balik manual.
                  Tiada bayaran balik automatik atau kelayakan jemputan tambahan.
                </p>
              )}

              <div className="admin-panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">Resit semasa · versi {row.receipt_version}</h3>
                  <ReceiptViewer
                    orderId={row.order_id}
                    receiptId={row.current_receipt_id}
                    description={`Versi ${row.receipt_version} · resit semasa`}
                    className="admin-link text-xs"
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {row.receipt_content_type} · {(row.receipt_size_bytes / 1024).toFixed(0)} KB · Rujukan: {row.customer_reference || "Tidak diberikan"}
                </p>
                <div className="mt-4 grid gap-3 border-t border-border pt-4 text-xs sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Percubaan terdahulu</span><br />
                    <span className="break-all">{row.prior_attempt_id ?? "Tiada"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Dihantar</span><br />
                    {when(row.created_at)}
                  </p>
                </div>
                {latestReview && (
                  <div className="mt-4 border-t border-border pt-4 text-xs">
                    <p className="font-semibold">
                      Keputusan: {statusFilters.find((item) => item.value === latestReview.outcome)?.label}
                    </p>
                    <p className="mt-2">
                      Diterima {formatMyrFromSen(latestReview.received_amount_sen)} · Dikreditkan {formatMyrFromSen(latestReview.credited_amount_sen)} · Baki {formatMyrFromSen(latestReview.remaining_amount_sen)} · Lebihan {formatMyrFromSen(latestReview.excess_amount_sen)}
                    </p>
                    {latestReview.reason && <p className="mt-2 whitespace-pre-wrap">{latestReview.reason}</p>}
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {when(latestReview.created_at)} · Pentadbir {latestReview.reviewer}
                    </p>
                    {evidenceUrl && (
                      <a className="admin-link mt-3 inline-block" href={evidenceUrl} target="_blank" rel="noreferrer">
                        Buka bukti peribadi
                      </a>
                    )}
                  </div>
                )}
              </div>

              <details className="mt-5">
                <summary className="cursor-pointer py-2 text-xs font-semibold">
                  Sejarah resit & keputusan ({history.length} versi)
                </summary>
                <div className="mt-3 space-y-3">
                  {history.map((version) => {
                    const review = first(version.manual_payment_reviews)
                    return (
                      <div key={version.id} className="admin-panel p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <strong className="text-xs">
                            Versi {version.version} · {version.id === row.current_receipt_id ? "Semasa" : "Terdahulu"}
                          </strong>
                          <ReceiptViewer
                            orderId={row.order_id}
                            receiptId={version.id}
                            description={`Versi ${version.version} · resit peribadi`}
                            className="admin-link text-xs"
                          />
                        </div>
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          {when(version.created_at)} · Rujukan {version.transfer_reference || "Tidak diberikan"} · {version.content_type} · {(version.size_bytes / 1024).toFixed(0)} KB
                        </p>
                        {review && (
                          <p className="mt-2 break-all text-xs">
                            {review.outcome} · {formatMyrFromSen(review.received_amount_sen)} · {review.reason || "Tiada sebab"}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </details>
            </div>

            <div className="admin-panel p-5">
              <p className="admin-eyebrow">Keputusan & fail</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Semak jumlah sebenar yang masuk. Baki dikira di pelayan; medan pelanggan tidak boleh menentukan kredit atau kelayakan draf.
              </p>
              <ReceiptControls
                orderId={row.order_id}
                attemptId={row.id}
                receiptId={row.current_receipt_id}
                reviewable={row.outcome === "pending" || row.outcome === "duplicate"}
                outcome={row.outcome}
                expectedReviewId={row.review_id}
                remainingSen={remaining}
                access={row.receipt_access ?? "removed"}
              />
            </div>
          </div>
        ),
      }
    }),
  )

  return (
    <>
      <AdminPageHeader
        title="Semakan bayaran"
        description="Satu baris bagi setiap cubaan manual. Cari, tapis, buka bukti peribadi dan rekod keputusan tanpa menerbitkan jemputan."
        action={
          <Link href="/admin/settings/qr" className="admin-secondary">
            Tetapan bayaran QR ↗
          </Link>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3 text-xs">
        <span className="font-semibold">{pendingCount} resit baharu menunggu perhatian</span>
        <span className="text-muted-foreground">Notifikasi dashboard · baris terkini dahulu</span>
        <span className="ml-auto flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          {MANUAL_OUTCOMES.map((value) => (
            <span key={value}>{statusFilters.find((item) => item.value === value)?.label}: {filterCount.get(value)}</span>
          ))}
        </span>
      </div>
      {queue.error ? (
        <div role="alert" className="admin-error">
          Rekod bayaran tidak dapat dimuatkan. Sila muat semula halaman.
        </div>
      ) : (
        <AdminTable
          label="cubaan bayaran"
          columns={["Pelanggan / Pesanan", "Kaedah", "Harga / Diterima", "Status", "Dihantar"]}
          searchPlaceholder="Cari pelanggan, ID pesanan, kaedah atau rujukan…"
          statuses={statusFilters}
          initialSearch={q}
          defaultStatus={status}
          rows={rows}
        />
      )}
      {histories.error && (
        <p role="alert" className="admin-error mt-5">
          Sejarah versi resit tidak dapat dimuatkan sepenuhnya.
        </p>
      )}
      {legacy.error && (
        <p role="alert" className="admin-error mt-5">
          Rekod pindahan terdahulu tidak dapat dimuatkan. Cuba muat semula.
        </p>
      )}
      {!!legacy.data.length && (
        <details className="admin-panel mt-8 p-5">
          <summary className="cursor-pointer text-sm font-semibold">
            Pindahan terdahulu tanpa resit ({legacy.data.length})
          </summary>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Rekod ini dikekalkan untuk sejarah. Keputusan lama tidak menerbitkan atau membuka draf baharu; aliran semasa memerlukan resit peribadi.
          </p>
          <div className="mt-5 space-y-4">
            {legacy.data.map((transfer) => {
              const review = transfer.duitnow_payment_reviews[0]
              const owner = first(transfer.users)
              return (
                <div key={transfer.id} className="rounded-xl border border-border p-4 text-xs">
                  <Link className="admin-link" href={`/admin/orders?q=${transfer.order_id}`}>
                    Pesanan #{transfer.order_id.slice(0, 8)}
                  </Link>
                  <p className="mt-2">
                    {owner?.email ?? "Pelanggan"} · {transfer.transfer_reference} · {formatMyrFromSen(transfer.amount_sen)} · {when(transfer.created_at)}
                  </p>
                  {review ? (
                    <p className="mt-2">{review.outcome} · {review.note || "Tiada nota"}</p>
                  ) : (
                    <ReviewControls submissionId={transfer.id} />
                  )}
                </div>
              )
            })}
          </div>
        </details>
      )}
    </>
  )
}
