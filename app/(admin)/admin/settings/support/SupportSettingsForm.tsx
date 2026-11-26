"use client"

import { useRef, useState, useTransition } from "react"
import { Check, History, RotateCcw } from "lucide-react"
import { PaymentSupportMessage } from "@/components/PaymentSupportMessage"
import {
  saveSupportContactAction,
  type SupportContactActionResult,
} from "./actions"
import type { PaymentSupportContact } from "@/lib/payment-support"

export type SupportContactHistoryRow = {
  id: string
  config_version: number
  previous_email: string | null
  previous_whatsapp: string | null
  new_email: string | null
  new_whatsapp: string | null
  operation: "change" | "restore"
  reason: string
  changed_by: string
  changed_at: string
  administrator: string | null
}

type Props = {
  initial: PaymentSupportContact
  history: SupportContactHistoryRow[]
  readFailed?: boolean
  historyFailed?: boolean
}

function displayContact(email: string | null, whatsapp: string | null) {
  return { email: email || "Tidak ditetapkan", whatsapp: whatsapp || "Tidak ditetapkan" }
}

export function SupportSettingsForm({
  initial,
  history,
  readFailed = false,
  historyFailed = false,
}: Props) {
  const [email, setEmail] = useState(initial.email ?? "")
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp ?? "")
  const [reason, setReason] = useState("")
  const [version, setVersion] = useState(initial.version ?? 1)
  const [restoreHistoryId, setRestoreHistoryId] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState<SupportContactActionResult & { ok: false } | null>(null)
  const [isPending, startTransition] = useTransition()
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  const liveContact: PaymentSupportContact = {
    email: email || null,
    whatsapp: whatsapp || null,
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice("")
    setError(null)
    startTransition(async () => {
      try {
        const result = await saveSupportContactAction({
          email,
          whatsapp,
          reason,
          expectedVersion: version,
          restoreHistoryId: restoreHistoryId ?? undefined,
        })
        if (!result.ok) {
          setError(result)
          return
        }
        setVersion(result.version)
        setEmail(result.email ?? "")
        setWhatsapp(result.whatsapp ?? "")
        setReason("")
        setRestoreHistoryId(null)
        setNotice(
          result.changed
            ? "Tetapan sokongan disimpan dan perubahan direkodkan."
            : "Tiada perubahan untuk disimpan.",
        )
      } catch {
        setError({ ok: false, error: "Sambungan gagal. Cuba semula." })
      }
    })
  }

  function prepareRestore(row: SupportContactHistoryRow) {
    setEmail(row.previous_email ?? "")
    setWhatsapp(row.previous_whatsapp ?? "")
    setRestoreHistoryId(row.id)
    setReason("")
    setNotice("Nilai sebelum perubahan dipilih. Masukkan sebab pemulihan sebelum menyimpan.")
    setError(null)
    window.requestAnimationFrame(() => reasonRef.current?.focus())
  }

  return (
    <>
      <div className="grid gap-8 border-b border-border p-6 sm:p-9 2xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
        <form onSubmit={submit} className="space-y-6" aria-busy={isPending}>
          <div>
            <p className="admin-eyebrow">Saluran operasi</p>
            <h3 className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-primary">
              Maklumat sokongan bayaran
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Nilai ini muncul hanya dalam mesej bantuan bayaran pelanggan. Setiap perubahan memerlukan sebab dan direkodkan untuk pentadbir.
            </p>
          </div>

          {readFailed && (
            <p role="alert" className="admin-error">
              Tetapan semasa tidak dapat dimuatkan. Borang dinyahaktifkan sehingga halaman dimuatkan semula.
            </p>
          )}

          <fieldset disabled={readFailed || isPending} className="space-y-5 disabled:opacity-60">
            <legend className="sr-only">Saluran sokongan bayaran</legend>
            <div>
              <label htmlFor="support-email" className="text-sm font-semibold">
                E-mel sokongan <span className="font-normal text-muted-foreground">(pilihan)</span>
              </label>
              <input
                id="support-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                maxLength={254}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setRestoreHistoryId(null)
                  setNotice("")
                  setError(null)
                }}
                aria-invalid={error?.field === "email"}
                aria-describedby="support-email-help support-email-error"
                className="admin-field mt-2 block w-full"
                placeholder="contoh@kamyjemput.my"
              />
              <p id="support-email-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Satu alamat sahaja. Ruang di luar alamat akan dibuang dan huruf disimpan dalam format kecil.
              </p>
              {error?.field === "email" && (
                <p id="support-email-error" role="alert" className="mt-2 text-xs text-red-700">
                  {error.error}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="support-whatsapp" className="text-sm font-semibold">
                WhatsApp <span className="font-normal text-muted-foreground">(pilihan)</span>
              </label>
              <input
                id="support-whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={whatsapp}
                maxLength={24}
                onChange={(event) => {
                  setWhatsapp(event.target.value)
                  setRestoreHistoryId(null)
                  setNotice("")
                  setError(null)
                }}
                aria-invalid={error?.field === "whatsapp"}
                aria-describedby="support-whatsapp-help support-whatsapp-error"
                className="admin-field mt-2 block w-full"
                placeholder="+60 12-345 6789"
              />
              <p id="support-whatsapp-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Bermula dengan +60. Ruang, sempang dan kurungan akan dibuang; selepas +60 perlu ada 8 hingga 10 angka tanpa 0 sejurus selepas kod negara. Nombor tidak disahkan pemilikan atau pendaftaran WhatsApp.
              </p>
              {error?.field === "whatsapp" && (
                <p id="support-whatsapp-error" role="alert" className="mt-2 text-xs text-red-700">
                  {error.error}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="support-reason" className="text-sm font-semibold">
                Sebab perubahan
              </label>
              <textarea
                id="support-reason"
                name="reason"
                ref={reasonRef}
                value={reason}
                maxLength={500}
                required
                rows={3}
                onChange={(event) => {
                  setReason(event.target.value)
                  setError(null)
                }}
                aria-invalid={error?.field === "reason"}
                aria-describedby="support-reason-help support-reason-error"
                className="admin-field mt-2 block w-full resize-y"
                placeholder="Contoh: Nombor sokongan baharu untuk musim pembayaran Jun."
              />
              <p id="support-reason-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Wajib untuk perubahan dan pemulihan. Maksimum 500 aksara.
              </p>
              {error?.field === "reason" && (
                <p id="support-reason-error" role="alert" className="mt-2 text-xs text-red-700">
                  {error.error}
                </p>
              )}
            </div>

            {restoreHistoryId && (
              <p className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-3 text-xs font-semibold text-primary" role="status">
                <RotateCcw size={15} aria-hidden />
                Pemulihan rekod #{restoreHistoryId} dipilih.
              </p>
            )}

            {error && error.field !== "email" && error.field !== "whatsapp" && error.field !== "reason" && (
              <p role="alert" className="admin-error">
                {error.error}
                {error.stale && (
                  <button
                    type="button"
                    className="ml-2 font-semibold underline underline-offset-2"
                    onClick={() => window.location.reload()}
                  >
                    Muat semula
                  </button>
                )}
              </p>
            )}
            {notice && (
              <p role="status" className="flex items-center gap-2 text-sm text-green-700">
                <Check size={16} aria-hidden />
                {notice}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="admin-button" disabled={readFailed || isPending}>
                {isPending ? "Menyimpan…" : restoreHistoryId ? "Simpan pemulihan" : "Simpan tetapan"}
              </button>
              <span className="text-xs text-muted-foreground">Versi semasa: {version}</span>
            </div>
          </fieldset>
        </form>

        <aside className="relative self-start overflow-hidden rounded-2xl border border-[#decaa9] bg-[#fffdf8] p-6 shadow-lg" aria-label="Contoh mesej pelanggan">
          <div className="absolute inset-y-0 left-0 w-1 bg-[var(--accent)]" aria-hidden />
          <p className="pl-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b6a33]">
            Contoh mesej pelanggan
          </p>
          <h3 className="mt-3 pl-3 font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-primary">
            Mesej bantuan bayaran
          </h3>
          <p className="mt-2 pl-3 text-xs leading-relaxed text-muted-foreground">
            Contoh ini berubah semasa anda menaip dan menunjukkan pautan yang akan diterima pelanggan.
          </p>
          <PaymentSupportMessage contact={liveContact} className="mt-6" />
          <p className="mt-5 pl-3 text-[11px] leading-relaxed text-muted-foreground">
            Jika kedua-dua saluran kosong, mesej pelanggan menggunakan sandaran tanpa pautan.
          </p>
        </aside>
      </div>

      <section className="border-t border-border p-6 sm:p-9" aria-labelledby="support-history-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Jejak perubahan</p>
            <h3 id="support-history-heading" className="mt-2 flex items-center gap-2 font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-primary">
              <History size={22} aria-hidden />
              Sejarah tetapan sokongan
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sejarah ini disimpan tanpa had dan hanya boleh dilihat oleh pentadbir. 100 perubahan terkini dipaparkan; setiap rekod menunjukkan nilai sebelum, selepas, pentadbir, masa dan sebab.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-primary">{history.length} dipaparkan</span>
        </div>

        {historyFailed ? (
          <p role="alert" className="admin-error mt-6">Sejarah tidak dapat dimuatkan. Nilai sokongan semasa masih selamat digunakan.</p>
        ) : history.length === 0 ? (
          <p className="admin-empty mt-6">Belum ada perubahan tetapan sokongan.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {history.map((row) => {
              const before = displayContact(row.previous_email, row.previous_whatsapp)
              const after = displayContact(row.new_email, row.new_whatsapp)
              return (
                <article key={row.id} className="min-w-0 break-words rounded-xl border border-border bg-card p-4 sm:p-5" data-support-history-row>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        {row.operation === "restore" ? "Pemulihan tetapan" : "Perubahan tetapan"} · versi {row.config_version}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.administrator || row.changed_by} · {new Date(row.changed_at).toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short", hour12: true })}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() => prepareRestore(row)}
                      disabled={readFailed || isPending}
                    >
                      <RotateCcw size={14} aria-hidden /> Pulihkan nilai sebelum
                    </button>
                  </div>
                  <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/60 p-3">
                      <dt className="font-semibold text-primary">Sebelum</dt>
                      <dd className="mt-2 space-y-1 text-muted-foreground">
                        <div>E-mel: {before.email}</div>
                        <div>WhatsApp: {before.whatsapp}</div>
                      </dd>
                    </div>
                    <div className="rounded-lg bg-[#fff9ed] p-3">
                      <dt className="font-semibold text-primary">Selepas</dt>
                      <dd className="mt-2 space-y-1 text-muted-foreground">
                        <div>E-mel: {after.email}</div>
                        <div>WhatsApp: {after.whatsapp}</div>
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">Sebab:</span> {row.reason}
                  </p>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
