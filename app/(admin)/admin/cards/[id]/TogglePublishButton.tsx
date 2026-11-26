"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { CardLifecycle } from "@/lib/types"

interface TogglePublishButtonProps {
  cardId: string
  lifecycle: CardLifecycle
}

/**
 * State-aware recorded availability controls:
 *  - paid Published or edit-window → disable (reason required + confirmation)
 *  - paid Unavailable → restore
 *  - unpaid / Publishing → blocked explanation, no control offered.
 */
export function TogglePublishButton({
  cardId,
  lifecycle,
}: TogglePublishButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [reason, setReason] = useState("")
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!success) return
    const timeout = window.setTimeout(() => setSuccess(""), 2500)
    return () => window.clearTimeout(timeout)
  }, [success])

  async function post(body: Record<string, unknown>, successMessage: string) {
    setError("")
    setSuccess("")
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/cards/${cardId}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const respBody = await res.json().catch(() => null)
          setError(
            respBody?.error ||
              "Tindakan tidak dapat direkodkan. Sila cuba lagi.",
          )
          return
        }

        setConfirming(false)
        setSuccess(successMessage)
        setReason("")
        router.refresh()
      } catch {
        setError("Tindakan tidak dapat direkodkan. Sila cuba lagi.")
      }
    })
  }

  function handleDisable() {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError("Masukkan sebab untuk menyahterbitkan jemputan ini.")
      return
    }
    setConfirming(true)
  }

  if (lifecycle !== "published" && lifecycle !== "unavailable" && lifecycle !== "edit_window" && lifecycle !== "edit_window_expired") {
    return (
      <p className="text-sm text-muted-foreground">
        {lifecycle === "editing"
          ? "Pesanan belum dibayar — ketersediaan hanya boleh dikawal selepas pembayaran."
          : lifecycle === "retired"
            ? "Jemputan ini dihentikan kekal selepas potong ganti. Ia tidak boleh dipulihkan."
          : lifecycle === "paid_draft"
            ? "Draf berbayar sedang menunggu pemilik melengkapkan suntingan. Ia belum diterbitkan."
            : "Penerbitan sedang diproses. Kawalan ketersediaan hanya tersedia selepas kad diterbitkan."}
      </p>
    )
  }

  if (lifecycle === "unavailable") {
    return (
      <div className="space-y-2">
        <Button
          onClick={() =>
            void post(
              { command: "restore" },
              "Kad telah dipulihkan dan tindakan direkodkan.",
            )
          }
          disabled={isPending}
        >
          {isPending ? "Mengemas kini…" : "Pulihkan Jemputan"}
        </Button>
        {success && <p className="text-sm text-green-600">{success}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={`disable-reason-${cardId}`}
        className="block text-sm text-muted-foreground"
      >
        Sebab dinyahterbitkan (dipaparkan kepada pemilik)
      </label>
      <textarea
        id={`disable-reason-${cardId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="cth. Isu kandungan dilaporkan — kad dinyahterbitkan sementara."
        disabled={isPending}
        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button
        onClick={handleDisable}
        disabled={isPending}
        variant="destructive"
      >
        {isPending ? "Mengemas kini…" : "Nyahterbitkan Jemputan"}
      </Button>
      {success && (
        <p role="status" className="text-sm text-green-600">
          {success}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Dialog
        open={confirming}
        onOpenChange={(v) => {
          if (!isPending) setConfirming(v)
        }}
      >
        <DialogContent busy={isPending} className="admin-workspace min-h-0">
          <DialogTitle>Nyahterbitkan jemputan?</DialogTitle>
          <DialogDescription>
            Tetamu tidak dapat membuka jemputan sehingga anda memulihkannya.
            Pemilik akan melihat sebab yang direkodkan.
          </DialogDescription>
          <p className="rounded bg-background p-3 text-sm">{reason}</p>
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <DialogFooter>
            <button
              className="admin-secondary"
              disabled={isPending}
              onClick={() => setConfirming(false)}
            >
              Batal
            </button>
            <button
              className="admin-button"
              disabled={isPending}
              onClick={() =>
                void post(
                  { command: "disable", reason: reason.trim() },
                  "Jemputan dinyahterbitkan dan tindakan direkodkan.",
                )
              }
            >
              {isPending ? "Memproses…" : "Nyahterbitkan"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
