"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, CreditCard, QrCode } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

/** Both editor checkout and cancelled-checkout recovery share these two choices. */
export function PaymentMethodDialog({
  open,
  onOpenChange,
  orderId,
  stripeAvailable = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  stripeAvailable?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function stripe() {
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      const result = await response.json()
      if (!response.ok || !result.url) throw new Error()
      window.location.assign(result.url)
    } catch {
      setError("Stripe tidak dapat dibuka. Sila cuba lagi.")
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value)
      }}
    >
      <DialogContent
        className="max-w-md"
      >
        <DialogTitle className="">
          Pilih cara bayaran
        </DialogTitle>
        <DialogDescription>Bagaimana anda ingin membayar?</DialogDescription>
        <div className="mt-3 grid gap-3">
          {stripeAvailable && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void stripe()}
              className="flex min-h-16 items-center gap-4 rounded-xl bg-[var(--primary)] px-5 py-4 text-left font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60"
            >
              <CreditCard size={22} aria-hidden />
              <span className="flex-1">
                {busy ? "Membuka Stripe…" : "Stripe"}
              </span>
              <ArrowUpRight size={18} aria-hidden />
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onOpenChange(false)
              router.push(`/dashboard/checkout/${orderId}/qr`)
            }}
            className="flex min-h-16 items-center gap-4 rounded-xl border border-[var(--border)] bg-white px-5 py-4 text-left font-semibold text-[var(--primary)] transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60"
          >
            <QrCode size={22} aria-hidden />
            <span className="flex-1">DuitNow QR</span>
            <ArrowUpRight size={18} aria-hidden />
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
