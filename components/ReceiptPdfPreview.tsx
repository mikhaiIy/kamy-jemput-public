"use client"

import { useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { PaymentSupportMessage } from "@/components/PaymentSupportMessage"
import type { PaymentSupportContact } from "@/lib/payment-support"

/** Render private bytes locally; no external viewer receives the receipt. */
export function ReceiptPdfPreview({
  url,
  supportContact,
}: {
  url: string
  supportContact?: PaymentSupportContact
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState("")
  const [rendering, setRendering] = useState(true)

  useEffect(() => {
    let disposed = false
    let task: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined
    async function load() {
      try {
        const pdf = await import("pdfjs-dist")
        if (disposed) return
        pdf.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url,
        ).toString()
        task = pdf.getDocument({ url })
        const loaded = await task.promise
        if (!disposed) setDocument(loaded)
      } catch {
        if (!disposed) setError("PDF ini rosak, kosong atau dilindungi kata laluan. Muat turun fail untuk menyemaknya.")
      }
    }
    void load()
    return () => { disposed = true; void task?.destroy() }
  }, [url])

  useEffect(() => {
    if (!document) return
    let disposed = false
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined
    async function render() {
      try {
        const pdfPage = await document!.getPage(page)
        if (disposed || !canvas.current) return
        const viewport = pdfPage.getViewport({ scale: 1 })
        const scale = Math.min(2, 1600 / Math.max(viewport.width, viewport.height))
        const sized = pdfPage.getViewport({ scale })
        canvas.current.width = sized.width
        canvas.current.height = sized.height
        task = pdfPage.render({ canvas: canvas.current, viewport: sized })
        await task.promise
        if (!disposed) setRendering(false)
      } catch {
        if (!disposed) setError("Halaman resit tidak dapat dipaparkan. Muat turun fail untuk menyemaknya.")
      }
    }
    void render()
    return () => { disposed = true; task?.cancel() }
  }, [document, page])

  if (error) return <div className="mx-auto grid max-w-md gap-3 p-8 text-center">
    <p role="alert" className="text-sm leading-relaxed text-destructive">{error}</p>
    {supportContact && <PaymentSupportMessage contact={supportContact} className="text-left" />}
  </div>
  return <div className="space-y-4">
    {document && <nav aria-label="Halaman resit" className="flex items-center justify-center gap-4 text-sm">
      <button disabled={page === 1} className="min-h-10 rounded border bg-card px-3 disabled:opacity-40" onClick={() => { setRendering(true); setPage(page - 1) }}>Sebelum</button>
      <span>Halaman {page} / {document.numPages}</span>
      <button disabled={page === document.numPages} className="min-h-10 rounded border bg-card px-3 disabled:opacity-40" onClick={() => { setRendering(true); setPage(page + 1) }}>Seterusnya</button>
    </nav>}
    {rendering && <p role="status" className="text-center text-sm">Memuatkan halaman resit…</p>}
    <canvas ref={canvas} role="img" aria-label={`Resit bayaran, halaman ${page}`} className="mx-auto h-auto max-w-full bg-white shadow-sm" hidden={rendering} />
  </div>
}
