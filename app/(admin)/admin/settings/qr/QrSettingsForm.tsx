"use client"
import { useEffect, useState } from "react"
import { Upload, QrCode, Check } from "lucide-react"

type Config = {
  enabled: boolean
  payee_name: string
  provider?: string
  qr_image_url: string
  instructions: string
}
export function QrSettingsForm({ bank, tng }: { bank: Config; tng: Config }) {
  const [method, setMethod] = useState<"bank" | "tng">("bank")
  return (
    <div className="p-6 sm:p-9">
      <div
        className="mb-8 flex gap-2 border-b border-border"
        aria-label="Kaedah QR"
      >
        {(
          [
            ["bank", "Bank"],
            ["tng", "Touch ’n Go"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={method === value}
            onClick={() => setMethod(value)}
            className={`border-b-2 px-5 pb-4 text-sm font-semibold ${method === value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div hidden={method !== "bank"}>
        <QrForm method="bank" initial={bank} />
      </div>
      <div hidden={method !== "tng"}>
        <QrForm method="tng" initial={tng} />
      </div>
    </div>
  )
}
function QrForm({
  method,
  initial,
}: {
  method: "bank" | "tng"
  initial: Config
}) {
  const [image, setImage] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState(initial.qr_image_url)
  const [preview, setPreview] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        form.set("method", method)
        if (image) form.set("image", image)
        setBusy(true)
        setError("")
        setMessage("")
        try {
          const response = await fetch("/api/admin/payment-qr", {
            method: "POST",
            body: form,
          })
          const result = await response.json()
          if (!response.ok)
            throw new Error(result.error || "Tetapan gagal disimpan.")
          setImageUrl(result.qr)
          setImage(null)
          setPreview("")
          setMessage(result.message)
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Sambungan gagal. Cuba semula.",
          )
        } finally {
          setBusy(false)
        }
      }}
    >
      <fieldset
        disabled={busy}
        className="grid gap-8 disabled:opacity-60 lg:grid-cols-[minmax(0,1fr)_240px]"
      >
        <legend className="sr-only">
          Tetapan {method === "bank" ? "Bank" : "Touch ’n Go"}
        </legend>
        <div className="space-y-6">
          <label className="flex cursor-pointer items-center justify-between gap-5 rounded-xl bg-muted p-4">
            <span>
              <span className="block text-sm font-semibold text-foreground">
                Terima bayaran {method === "bank" ? "bank" : "Touch ’n Go"}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Paparkan QR ini kepada pelanggan.
              </span>
            </span>
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={initial.enabled}
              className="h-5 w-5 accent-primary"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Nama penerima
            <input
              name="payee"
              maxLength={120}
              defaultValue={initial.payee_name}
              placeholder="Nama seperti dalam akaun"
              className="mt-2 block w-full rounded-lg border border-border px-3 py-3 focus:border-ring focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </label>
          {method === "bank" && (
            <label className="block text-sm font-medium text-foreground">
              Nama bank
              <input
                name="provider"
                maxLength={120}
                defaultValue={initial.provider}
                placeholder="Contoh: Maybank"
                className="mt-2 block w-full rounded-lg border border-border px-3 py-3 focus:border-ring focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </label>
          )}
          <label className="block text-sm font-medium text-foreground">
            Arahan bayaran{" "}
            <span className="font-normal text-muted-foreground">(pilihan)</span>
            <textarea
              name="instructions"
              maxLength={2000}
              rows={3}
              defaultValue={initial.instructions}
              placeholder="Maklumat tambahan untuk pelanggan"
              className="mt-2 block w-full resize-y rounded-lg border border-border px-3 py-3 focus:border-ring focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </label>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium text-foreground">Imej QR</p>
          <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-white p-5">
            {/* Uploaded artwork must retain its original aspect ratio. */}
            {preview || imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview || imageUrl}
                alt="Pratonton QR bayaran"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <QrCode size={44} className="mx-auto mb-3" aria-hidden />
                <p className="text-xs">Belum ada imej QR</p>
              </div>
            )}
          </div>
          <label className="relative mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted focus-within:outline-2 focus-within:outline-offset-2">
            <Upload size={16} aria-hidden />
            {imageUrl ? "Gantikan imej" : "Muat naik imej"}
            <input
              aria-label="Muat naik imej QR"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 5 * 1024 * 1024) {
                  setError("Saiz maksimum imej ialah 5 MB.")
                  return
                }
                setError("")
                setMessage("")
                setImage(file)
                setPreview(URL.createObjectURL(file))
              }}
            />
          </label>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            JPG, PNG atau WebP. Maksimum 5 MB. Pastikan keseluruhan kod QR
            jelas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6 lg:col-span-2">
          <button
            disabled={busy}
            className="min-h-11 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90"
          >
            {busy ? "Menyimpan…" : "Simpan perubahan"}
          </button>
          {message && (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-green-700"
            >
              <Check size={16} aria-hidden />
              {message}
            </p>
          )}
        </div>
      </fieldset>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </form>
  )
}
