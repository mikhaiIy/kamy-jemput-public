import { requireAdmin } from "@/lib/auth/require-admin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { loadAdminPages } from "@/lib/admin-records"
import { AdminPageHeader, AdminStatus } from "../../AdminPageHeader"
import { AdminTable } from "../../AdminTable"
import { StatusUpdateForm } from "./StatusUpdateForm"

export const metadata = { title: "Tempahan khas — kamy jemput" }
const labels = {
  new: "Baru",
  in_review: "Dalam semakan",
  quoted: "Sebut harga",
  closed_won: "Berjaya",
  closed_lost: "Ditutup",
}
type Status = keyof typeof labels
export default async function CustomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  await requireAdmin()
  const { status = "" } = await searchParams
  const { data, error } = await loadAdminPages(async (cursor) => {
    const query = supabaseAdmin
      .from("custom_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000)
    return cursor ? query.or(cursor) : query
  })
  return (
    <>
      <AdminPageHeader
        title="Tempahan khas"
        description="Susun permintaan reka bentuk, butiran pelanggan dan susulan dalam satu senarai."
      />
      {error ? (
        <p role="alert" className="admin-error">
          Tempahan tidak dapat dimuatkan. Sila muat semula halaman.
        </p>
      ) : (
        <AdminTable
          label="tempahan"
          columns={["Pelanggan", "Majlis", "Bajet", "Status", "Diterima"]}
          searchPlaceholder="Cari nama, e-mel atau butiran tempahan…"
          statuses={Object.entries(labels).map(([value, label]) => ({
            value,
            label,
          }))}
          defaultStatus={status}
          rows={data.map((o) => ({
            id: o.id,
            status: o.status,
            search: `${o.id} ${o.contact_name} ${o.contact_email ?? ""} ${o.contact_phone} ${o.event_type} ${o.brief}`,
            cells: [
              <div key="name">
                <p className="font-semibold">{o.contact_name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {o.contact_email || o.contact_phone}
                </p>
              </div>,
              o.event_type,
              o.budget_band || "Belum ditetapkan",
              <AdminStatus
                key="status"
                tone={
                  o.status === "closed_won"
                    ? "success"
                    : o.status === "new"
                      ? "warning"
                      : undefined
                }
              >
                {labels[o.status as Status]}
              </AdminStatus>,
              new Date(o.created_at).toLocaleDateString("ms-MY", {
                timeZone: "Asia/Kuala_Lumpur",
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            ],
            details: (
              <div key={o.id} className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h2 className="mb-3 text-sm font-semibold">
                    Permintaan pelanggan
                  </h2>
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {o.brief}
                  </p>
                  {o.reference_links && (
                    <p className="mt-4 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      Rujukan: {o.reference_links}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-4 text-xs">
                    <a className="admin-link" href={`tel:${o.contact_phone}`}>
                      {o.contact_phone}
                    </a>
                    {o.contact_email && (
                      <a
                        className="admin-link"
                        href={`mailto:${o.contact_email}`}
                      >
                        {o.contact_email}
                      </a>
                    )}
                  </div>
                </div>
                <div className="admin-panel p-5">
                  <h3 className="mb-4 text-sm font-semibold">
                    Kemas kini tempahan
                  </h3>
                  <StatusUpdateForm
                    id={o.id}
                    currentStatus={o.status as Status}
                    currentNotes={o.admin_notes ?? ""}
                  />
                </div>
              </div>
            ),
          }))}
        />
      )}
    </>
  )
}
