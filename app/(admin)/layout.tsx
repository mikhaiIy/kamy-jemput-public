import { requireAdmin } from "@/lib/auth/require-admin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { AdminNav } from "./AdminNav"
import "./admin.css"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAdmin()
  const { count: pendingEditRequests } = await supabaseAdmin
    .from("card_edit_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")

  return (
    <div className="admin-workspace flex-1">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 admin-secondary"
      >
        Langkau ke kandungan
      </a>
      <AdminNav
        email={user.email ?? ""}
        pendingEditRequests={pendingEditRequests ?? 0}
      />
      <main id="admin-content" className="md:ml-[244px]">
        <div className="admin-content">{children}</div>
      </main>
    </div>
  )
}
