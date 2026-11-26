"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Props = {
  requestId: string
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}

export function EditRequestReviewControls({ requestId }: Props) {
  const router = useRouter()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isPending, startTransition] = useTransition()
  const approveIdRef = useRef<string | null>(null)
  const rejectIdRef = useRef<string | null>(null)

  function decide(decision: "approve" | "reject") {
    if (
      decision === "reject" &&
      (rejectReason.length === 0 ||
        rejectReason.trim() !== rejectReason ||
        byteLength(rejectReason) > 500)
    ) {
      setError("Masukkan sebab tanpa ruang di hujung dan maksimum 500 bait.")
      return
    }
    setError("")
    const ref = decision === "approve" ? approveIdRef : rejectIdRef
    const decisionRequestId = ref.current ?? crypto.randomUUID()
    ref.current = decisionRequestId
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/edit-requests/${requestId}/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            reason: decision === "reject" ? rejectReason : null,
            decisionRequestId,
          }),
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          setError(body?.error || "Keputusan tidak dapat disimpan.")
          router.refresh()
          return
        }
        ref.current = null
        setRejectOpen(false)
        setRejectReason("")
        setNotice(
          body?.request?.status === "stale"
            ? "Permintaan ditandakan tidak lagi tersedia. Tiada tetingkap dibuka."
            : decision === "approve"
              ? "Permintaan diluluskan. Tetingkap suntingan tujuh hari telah dibuka."
              : "Permintaan ditolak dengan sebab yang boleh dilihat pelanggan.",
        )
        router.refresh()
      } catch {
        setError("Sambungan terganggu. Cuba semula keputusan yang sama.")
      }
    })
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p role="status" className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => decide("approve")} disabled={isPending}>
          {isPending ? "Menyimpan…" : "Luluskan 7 hari"}
        </Button>
        <Dialog open={rejectOpen} onOpenChange={(nextOpen) => !isPending && setRejectOpen(nextOpen)}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Tolak permintaan
            </Button>
          </DialogTrigger>
          <DialogContent busy={isPending}>
            <DialogHeader>
              <DialogTitle>Tolak permintaan</DialogTitle>
              <DialogDescription>
                Sebab ini akan dihantar kepada pelanggan. Elakkan butiran dalaman
                dan terangkan pembetulan yang diperlukan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label htmlFor={`reject-reason-${requestId}`} className="text-sm font-medium">
                Sebab pelanggan
              </label>
              <Textarea
                id={`reject-reason-${requestId}`}
                value={rejectReason}
                onChange={(event) => {
                  rejectIdRef.current = null
                  setRejectReason(event.target.value)
                  setError("")
                }}
                maxLength={500}
                rows={5}
                autoFocus
                disabled={isPending}
              />
              <p className="text-right text-[11px] text-muted-foreground">
                {byteLength(rejectReason)}/500 bait
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button type="button" variant="destructive" onClick={() => decide("reject")} disabled={isPending}>
                {isPending ? "Menyimpan…" : "Simpan penolakan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
