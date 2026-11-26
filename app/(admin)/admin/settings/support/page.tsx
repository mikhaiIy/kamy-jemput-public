import { requireAdmin } from "@/lib/auth/require-admin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  EMPTY_PAYMENT_SUPPORT_CONTACT,
  parsePaymentSupportContact,
} from "@/lib/payment-support"
import { SupportSettingsForm, type SupportContactHistoryRow } from "./SupportSettingsForm"

export const metadata = { title: "Tetapan sokongan — kamy jemput" }
export const dynamic = "force-dynamic"

type HistoryRecord = Omit<SupportContactHistoryRow, "administrator" | "id"> & {
  id: string | number
  administrator?: { email?: string | null; name?: string | null } | null
}

export default async function SupportSettingsPage() {
  await requireAdmin()

  const { data: configRow, error: configError } = await supabaseAdmin
    .from("payment_support_config")
    .select("email, whatsapp, version")
    .eq("id", true)
    .maybeSingle()

  const readFailed = Boolean(configError || !configRow)
  const contact = readFailed
    ? EMPTY_PAYMENT_SUPPORT_CONTACT
    : parsePaymentSupportContact(configRow)

  const historyResult = readFailed
    ? { data: null, error: configError }
    : await supabaseAdmin
        .from("payment_support_contact_history")
        .select("id, config_version, previous_email, previous_whatsapp, new_email, new_whatsapp, operation, reason, changed_by, changed_at")
        .order("changed_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(100)

  const rawHistory = (historyResult.data ?? []) as unknown as HistoryRecord[]
  const actorIds = [...new Set(rawHistory.map((row) => row.changed_by).filter(Boolean))]
  const actorResult = actorIds.length
    ? await supabaseAdmin.from("users").select("id, email, name").in("id", actorIds)
    : { data: [], error: null }
  const actors = new Map(
    (actorResult.data ?? []).map((actor) => [actor.id, actor.name || actor.email || null]),
  )
  const history: SupportContactHistoryRow[] = rawHistory.map((row) => ({
    ...row,
    id: String(row.id),
    administrator: actors.get(row.changed_by) ?? null,
  }))

  return (
    <>
      <header className="border-b border-border px-6 py-7 sm:px-9">
        <p className="admin-eyebrow">Tetapan operasi</p>
        <h2 className="mt-2 font-[family-name:var(--font-cormorant)] text-4xl font-semibold text-primary">
          Hubungi sokongan
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Urus saluran yang dipaparkan apabila pelanggan memerlukan bantuan berkaitan bayaran. Tetapan ini hanya mengawal mesej bantuan bayaran.
        </p>
      </header>
      <SupportSettingsForm
        initial={{
          ...contact,
          version: contact.version ?? 1,
        }}
        history={history}
        readFailed={readFailed}
        historyFailed={Boolean(historyResult.error)}
      />
    </>
  )
}
