import { requireAdmin } from "@/lib/auth/require-admin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { QrSettingsForm } from "./QrSettingsForm"
export const metadata = { title: "Tetapan Bayaran QR — kamy jemput" }
export const dynamic = "force-dynamic"
export default async function QrSettingsPage() {
  await requireAdmin()
  const [bank, tng, bankHistory, tngHistory] = await Promise.all([
    supabaseAdmin
      .from("duitnow_payment_slots")
      .select("*")
      .eq("slot_number", 1)
      .single(),
    supabaseAdmin
      .from("tng_payment_config")
      .select("*")
      .eq("id", true)
      .single(),
    supabaseAdmin
      .from("duitnow_slot_history")
      .select("*")
      .eq("slot_number", 1)
      .order("changed_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("tng_config_history")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(50),
  ])
  if (bank.error || tng.error)
    return (
      <p role="alert" className="p-8 text-sm text-red-700">
        Tetapan QR tidak dapat dimuatkan. Sila muat semula halaman.
      </p>
    )
  return (
    <>
      <header className="border-b border-border px-6 py-7 sm:px-9">
        <h2 className="text-xl font-semibold text-primary">Bayaran QR</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Dua pilihan bayaran untuk pelanggan: Bank dan Touch ’n Go.
        </p>
      </header>
      <QrSettingsForm bank={bank.data} tng={tng.data} />
      <details className="border-t border-border p-6 sm:px-9">
        <summary className="cursor-pointer text-sm font-semibold">
          Sejarah tetapan QR
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">
          50 perubahan terkini bagi setiap kaedah.
        </p>
        {bankHistory.error || tngHistory.error ? (
          <p role="alert" className="admin-error mt-4">
            Sejarah tidak dapat dimuatkan.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {[
              ...(bankHistory.data ?? []).map((h) => ({
                ...h,
                method: "Bank",
              })),
              ...(tngHistory.data ?? []).map((h) => ({
                ...h,
                method: "Touch ’n Go",
              })),
            ]
              .sort((a, b) => b.changed_at.localeCompare(a.changed_at))
              .map((h) => (
                <div
                  key={`${h.method}-${h.id}`}
                  className="rounded-lg border border-border p-4 text-xs"
                >
                  <p className="font-semibold">
                    {h.method} ·{" "}
                    {new Date(h.changed_at).toLocaleString("en-US", { hour12: true, timeZone: "Asia/Kuala_Lumpur" })}
                  </p>
                  <p className="mt-1 break-all text-[10px] text-muted-foreground">
                    Pentadbir: {h.changed_by ?? "Sistem"}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer">
                      Butiran perubahan
                    </summary>
                    <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold">Sebelum</dt>
                        <dd>
                          <QrHistorySummary config={h.previous_config} />
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Selepas</dt>
                        <dd>
                          <QrHistorySummary config={h.config} />
                        </dd>
                      </div>
                    </dl>
                  </details>
                </div>
              ))}
            {!bankHistory.data?.length && !tngHistory.data?.length && (
              <p className="text-xs text-muted-foreground">
                Belum ada perubahan direkodkan.
              </p>
            )}
          </div>
        )}
      </details>
    </>
  )
}

function QrHistorySummary({
  config,
}: {
  config: Record<string, unknown> | null
}) {
  if (!config) return <p className="mt-2 text-muted-foreground">Belum dikonfigurasi</p>
  const qr = String(config.qr_image_url ?? config.qrImageUrl ?? "")
  return (
    <div className="mt-2 space-y-2 text-muted-foreground">
      <p>{config.enabled ? "Aktif" : "Tidak aktif"}</p>
      <p>Penerima: {String(config.payee_name ?? config.payeeName ?? "—")}</p>
      {!!config.provider && <p>Bank: {String(config.provider)}</p>}
      <p className="whitespace-pre-wrap">
        Arahan: {String(config.instructions || "Tiada")}
      </p>
      {/^(https:\/\/|\/api\/payment-qr\/)/.test(qr) ? (
        <a className="admin-link" href={qr} target="_blank" rel="noreferrer">
          Buka imej QR ↗
        </a>
      ) : (
        <p>Tiada imej</p>
      )}
    </div>
  )
}
