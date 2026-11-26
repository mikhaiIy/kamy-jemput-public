"use client"

import { useEffect, useState } from "react"
import { Download, Expand, LoaderCircle, Minimize } from "lucide-react"
import { ReceiptPdfPreview } from "@/components/ReceiptPdfPreview"
import { PaymentSupportMessage } from "@/components/PaymentSupportMessage"
import type { PaymentSupportContact } from "@/lib/payment-support"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const previewTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
])

type Preview = { url: string; type: string }

/** Preview bytes are fetched through the same authenticated boundary as downloads. */
export function ReceiptViewer({
  orderId,
  receiptId,
  description = "Bukti bayaran untuk pesanan ini.",
  className,
  supportContact,
}: {
  orderId: string
  receiptId: string
  description?: string
  className?: string
  supportContact?: PaymentSupportContact
}) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  const [originalSize, setOriginalSize] = useState(false)
  const endpoint = `/api/orders/${encodeURIComponent(orderId)}/status?receipt=${encodeURIComponent(receiptId)}`

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    let objectUrl: string | undefined
    async function load() {
      try {
        const response = await fetch(endpoint, {
          signal: controller.signal,
          cache: "no-store",
        })
        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sesi anda telah tamat. Log masuk semula untuk melihat resit."
              : response.status === 404
                ? "Resit tidak tersedia atau anda tidak lagi mempunyai akses. Muat semula halaman untuk melihat status terkini."
                : "Resit tidak dapat dimuatkan. Semak sambungan dan cuba semula.",
          )
        }
        const type =
          response.headers.get("content-type")?.split(";")[0].trim() ?? ""
        if (!previewTypes.has(type))
          throw new Error("Format resit ini tidak boleh dipratonton.")
        const file = await response.blob()
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(file)
        setPreview({ url: objectUrl, type })
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Resit tidak dapat dimuatkan. Cuba semula.",
          )
        }
      }
    }
    void load()
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, endpoint, retry])

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        setPreview(null)
        setError("")
        setOriginalSize(false)
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={`cursor-pointer ${className ?? "text-sm font-semibold text-primary underline underline-offset-4"}`}
        >
          Buka resit
        </button>
      </DialogTrigger>
      <DialogContent overlayClassName="z-[120]" className="z-[121] flex h-[90dvh] max-h-[960px] w-[calc(100%-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-xl bg-background p-0">
        <header className="shrink-0 border-b border-border px-5 pb-4 pt-5 pr-12 sm:px-6 sm:pr-14">
          <DialogTitle className="font-display text-3xl font-semibold text-primary">
            Resit bayaran
          </DialogTitle>
          <DialogDescription className="mt-2 text-xs leading-5">
            {description} · Pesanan #{orderId.slice(0, 8)}
          </DialogDescription>
        </header>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {preview?.type === "application/pdf"
              ? "Dokumen PDF"
              : "Pratonton resit"}
          </p>
          <div className="flex flex-wrap gap-3">
            {preview?.type.startsWith("image/") && (
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium text-primary"
                onClick={() => setOriginalSize(!originalSize)}
                aria-pressed={originalSize}
              >
                {originalSize ? (
                  <Minimize size={15} aria-hidden />
                ) : (
                  <Expand size={15} aria-hidden />
                )}
                {originalSize ? "Muat pada ruang" : "Saiz asal"}
              </button>
            )}
            <a
              href={endpoint}
              download
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              <Download size={15} aria-hidden /> Muat turun
            </a>
          </div>
        </div>
        <div
          className="relative min-h-0 flex-1 overflow-auto bg-muted p-3 sm:p-5"
          role="region"
          aria-label="Pratonton resit"
          tabIndex={0}
        >
          {error ? (
            <div className="grid min-h-full place-content-center gap-4 p-4 text-center">
              <p role="alert" className="max-w-md text-sm text-destructive">
                {error}
              </p>
              {supportContact && (
                <PaymentSupportMessage
                  contact={supportContact}
                  className="mx-auto max-w-md text-left"
                />
              )}
              <button
                type="button"
                className="mx-auto min-h-10 rounded-md border border-border bg-card px-4 text-sm text-primary"
                onClick={() => {
                  setError("")
                  setPreview(null)
                  setRetry(retry + 1)
                }}
              >
                Cuba semula
              </button>
            </div>
          ) : !preview ? (
            <div
              role="status"
              className="flex min-h-full items-center justify-center gap-3 text-sm text-muted-foreground"
            >
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                size={20}
                aria-hidden
              />{" "}
              Memuatkan resit…
            </div>
          ) : preview.type === "application/pdf" ? (
            <ReceiptPdfPreview url={preview.url} supportContact={supportContact} />
          ) : (
            // Authenticated, validated private images use temporary browser URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.url}
              alt="Resit bayaran pelanggan"
              className={
                originalSize
                  ? "block max-w-none"
                  : "h-full w-full object-contain"
              }
              onError={() =>
                setError(
                  "Imej resit tidak dapat dipaparkan. Cuba semula atau muat turun fail.",
                )
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
