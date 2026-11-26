import { requireAdmin } from "@/lib/auth/require-admin"
import Link from "next/link"
import {
  ReceiptText,
  ShoppingBag,
  PencilRuler,
  ArrowRight,
  LayoutTemplate,
  MessageSquareText,
} from "lucide-react"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { AdminPageHeader } from "../AdminPageHeader"

export const metadata = { title: "Ringkasan — Pentadbir kamy jemput" }
export default async function AdminOverviewPage() {
  await requireAdmin()
  const [receipts, orders, requests, editRequests, recent] = await Promise.all([
    supabaseAdmin
      .from("manual_payment_attempts")
      .select("id", { count: "exact", head: true })
      .eq("state", "submitted"),
    supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("custom_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabaseAdmin
      .from("card_edit_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("orders")
      .select("id,status,entitlement_source,created_at,users(email,name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ])
  const tasks = [
    {
      title: "Resit menunggu semakan",
      count: receipts.error ? null : receipts.count,
      href: "/admin/payments?status=pending",
      icon: ReceiptText,
      description: "Semak bukti dan jumlah bayaran pelanggan.",
    },
    {
      title: "Pesanan belum dibayar",
      count: orders.error ? null : orders.count,
      href: "/admin/orders?status=pending",
      icon: ShoppingBag,
      description: "Jejaki pesanan dan status jemputan.",
    },
    {
      title: "Tempahan khas baharu",
      count: requests.error ? null : requests.count,
      href: "/admin/custom-orders?status=new",
      icon: PencilRuler,
      description: "Baca permintaan dan kemas kini pelanggan.",
    },
    {
      title: "Mohon Suntingan menunggu semakan",
      count: editRequests.error ? null : editRequests.count,
      href: "/admin/edit-requests?status=pending",
      icon: MessageSquareText,
      description: "Semak sebab pelanggan tanpa membuka suntingan secara automatik.",
    },
  ]
  return (
    <>
      <AdminPageHeader
        title="Selamat datang kembali."
        description="Mulakan dengan perkara yang memerlukan perhatian anda."
        action={
          <Link href="/templates" className="admin-button">
            Cipta jemputan <ArrowRight size={15} aria-hidden />
          </Link>
        }
      />
      {!receipts.error && (receipts.count ?? 0) > 0 && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950"
        >
          <ReceiptText size={19} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Notifikasi semakan bayaran</p>
            <p className="mt-1 text-xs leading-5 text-amber-900/80">
              {receipts.count} resit baharu atau pengganti menunggu keputusan pentadbir.
            </p>
          </div>
          <Link href="/admin/payments?status=pending" className="admin-link whitespace-nowrap text-xs">
            Buka semakan →
          </Link>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {tasks.map(({ title, count, href, icon: Icon, description }) => (
          <Link
            key={href}
            href={href}
            className="admin-panel group p-6 transition-colors hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <Icon
                size={21}
                strokeWidth={1.5}
                className="text-primary"
                aria-hidden
              />
              <ArrowRight
                size={16}
                className="text-muted-foreground group-hover:text-primary"
                aria-hidden
              />
            </div>
            <p className="mb-2 mt-7 text-4xl font-medium tracking-tight tabular-nums">
              {count ?? "—"}
            </p>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {count === null
                ? "Data tidak dapat dimuatkan. Buka halaman untuk cuba lagi."
                : description}
            </p>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5">
            <h2 className="text-sm font-semibold">Pesanan terkini</h2>
            <Link href="/admin/orders" className="admin-link text-xs">
              Semua pesanan →
            </Link>
          </div>
          {recent.error ? (
            <p className="admin-error m-5" role="alert">
              Pesanan tidak dapat dimuatkan.
            </p>
          ) : !recent.data?.length ? (
            <p className="admin-empty">Pesanan baharu akan muncul di sini.</p>
          ) : (
            <ul>
              {recent.data.map((o) => {
                const owner = Array.isArray(o.users) ? o.users[0] : o.users
                return (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orders?q=${o.id}`}
                      className="flex items-center justify-between gap-4 border-t border-border px-5 py-5 hover:bg-background"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {owner?.name || owner?.email || "Pelanggan"}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          #{o.id.slice(0, 8)}
                        </p>
                      </div>
                      <span
                        className="admin-pill"
                        data-tone={o.status === "paid" ? "success" : "warning"}
                      >
                        {o.entitlement_source === "controlled_replacement"
                          ? "Admin grant · tiada bayaran"
                          : o.status === "paid"
                          ? "Dibayar"
                          : o.status === "failed"
                            ? "Gagal"
                            : "Belum dibayar"}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <section className="rounded-xl bg-secondary p-6">
          <LayoutTemplate size={24} strokeWidth={1.5} aria-hidden />
          <h2 className="mb-2 mt-5 text-lg font-semibold tracking-tight">
            Ruang untuk mencipta.
          </h2>
          <p className="text-xs leading-6 text-muted-foreground">
            Uji pengalaman pelanggan atau sediakan jemputan bagi pihak mereka
            melalui galeri dan Dashboard pelanggan.
          </p>
          <Link className="admin-secondary mt-5 w-full" href="/templates">
            Buka galeri template <ArrowRight size={14} aria-hidden />
          </Link>
          <Link
            className="mt-4 block text-center text-xs font-semibold underline underline-offset-4"
            href="/dashboard"
          >
            Buka Dashboard pelanggan
          </Link>
        </section>
      </div>
    </>
  )
}
