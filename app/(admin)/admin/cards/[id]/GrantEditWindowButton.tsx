"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { CardLifecycle } from "@/lib/types"

type Props = {
  cardId: string
  lifecycle: CardLifecycle
  activeWindow: { id: string; expiresAt: string } | null
}

function formatDeadline(value: string) {
  return new Date(value).toLocaleString("en-US", {
    hour12: true,
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function GrantEditWindowButton({ cardId, lifecycle, activeWindow }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const requestIdRef = useRef<string | null>(null)
  const hasActiveWindow = lifecycle === "edit_window" && Boolean(activeWindow)

  if (lifecycle === "edit_window" && hasActiveWindow && activeWindow) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
        <p className="font-medium text-foreground">Tetingkap suntingan sedang aktif</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Pemilik boleh menyimpan perubahan sehingga {formatDeadline(activeWindow.expiresAt)}.
        </p>
      </div>
    )
  }

  if (lifecycle !== "published" && lifecycle !== "edit_window_expired") return null

  function submit() {
    const trimmed = reason.trim()
    if (!trimmed || trimmed !== reason || new TextEncoder().encode(reason).length > 500) {
      setError("Masukkan sebab tanpa ruang di hujung dan maksimum 500 bait.")
      return
    }
    setError("")
    setSuccess("")
    const requestId = requestIdRef.current ?? crypto.randomUUID()
    requestIdRef.current = requestId
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/cards/${cardId}/edit-window`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, requestId }),
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          setError(body?.error || "Tetingkap suntingan tidak dapat dibuka.")
          return
        }
        requestIdRef.current = null
        setReason("")
        setSuccess(
          body?.replayed
            ? "Percubaan yang sama telah dipulihkan. Tarikh tamat tidak berubah."
            : "Tetingkap suntingan tujuh hari telah dibuka.",
        )
        router.refresh()
      } catch {
        setError("Tetingkap suntingan tidak dapat dibuka.")
      }
    })
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {lifecycle === "edit_window_expired" ? "Buka semula suntingan" : "Buka suntingan terhad"}
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Ini membuka tepat tujuh hari dari masa kelulusan. Perubahan pelanggan
          kekal peribadi sehingga mereka menerbitkannya semula.
        </p>
      </div>
      <label htmlFor={`edit-window-reason-${cardId}`} className="block text-xs font-medium text-foreground">
        Sebab kelulusan
      </label>
      <textarea
        id={`edit-window-reason-${cardId}`}
        value={reason}
        onChange={(event) => {
          if (event.target.value !== reason) requestIdRef.current = null
          setReason(event.target.value)
        }}
        maxLength={500}
        rows={3}
        disabled={isPending}
        placeholder="cth. Pemilik perlu membetulkan masa majlis."
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-muted-foreground">{reason.length}/500</span>
        <Button type="button" onClick={submit} disabled={isPending}>
          {isPending ? "Membuka…" : "Buka tetingkap 7 hari"}
        </Button>
      </div>
      {success && <p role="status" className="text-sm text-green-700">{success}</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
