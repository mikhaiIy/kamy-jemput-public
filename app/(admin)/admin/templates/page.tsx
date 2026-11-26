import { requireAdmin } from "@/lib/auth/require-admin"
import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { TemplateRow } from "./TemplateRow"
import { TEMPLATE_NAMES } from "@/lib/template-names"
import { AdminPageHeader } from "../../AdminPageHeader"
import { AdminTable } from "../../AdminTable"

export const metadata = { title: "Pengurusan template — kamy jemput" }
export default async function AdminTemplatesPage() {
  await requireAdmin()
  const { data: templates, error } = await supabaseAdmin
    .from("templates")
    .select("id, name, category, price_myr, is_active")
    .order("category")
    .order("id")
  return (
    <>
      <AdminPageHeader
        title="Pengurusan template"
        description="Cari reka bentuk, kemas kini harga dan tentukan pilihan yang tersedia kepada pelanggan."
        action={
          <Link href="/templates" className="admin-secondary">
            Lihat galeri pelanggan ↗
          </Link>
        }
      />
      {error || !templates ? (
        <div role="alert" className="admin-error">
          Template tidak dapat dimuatkan. Sila muat semula halaman.
        </div>
      ) : (
        <AdminTable
          label="template"
          searchPlaceholder="Cari nama atau ID template…"
          columns={[
            "Template",
            "Kategori",
            "Harga",
            "Ketersediaan",
            "Pratonton",
          ]}
          statuses={[
            { value: "active", label: "Aktif" },
            { value: "inactive", label: "Tidak aktif" },
          ]}
          categories={Array.from(new Set(templates.map((t) => t.category))).map(
            (c) => ({ value: c, label: c }),
          )}
          rows={templates.map((t) => ({
            id: t.id,
            search: `${TEMPLATE_NAMES[t.id] ?? t.name} ${t.id}`,
            status: t.is_active ? "active" : "inactive",
            category: t.category,
            content: (
              <TemplateRow
                id={t.id}
                name={TEMPLATE_NAMES[t.id] ?? t.name}
                category={t.category}
                priceMyr={t.price_myr}
                isActive={t.is_active}
              />
            ),
          }))}
        />
      )}
      <p className="admin-description">
        Perubahan harga digunakan untuk pesanan baharu. Harga pesanan sedia ada
        kekal.
      </p>
    </>
  )
}
