"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Props = {
  cardId: string
  predecessorCardId: string
  replacementCardId: string | null
  grantId: string | null
  reason: string | null
  completed: boolean
  expectedSourcePublicationId: string | null
  expectedReplacementDraftVersion: number | null
}

export function ControlledReplacementPanel({
  cardId,
  predecessorCardId,
  replacementCardId,
  grantId,
  reason,
  completed,
  expectedSourcePublicationId,
  expectedReplacementDraftVersion,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [draftReason, setDraftReason] = useState("")
  const requestIdRef = useRef<string | null>(null)
  const isPredecessor = cardId === predecessorCardId
  const canGrant = isPredecessor && !grantId
  const canCutover = Boolean(grantId && !completed)
  const cutoverReviewReady = Boolean(
    expectedSourcePublicationId &&
    expectedReplacementDraftVersion !== null &&
    expectedReplacementDraftVersion >= 1,
  )

  function submit(operation: "grant" | "cutover") {
    const value = draftReason.trim()
    if (!value || value !== draftReason || new TextEncoder().encode(value).length > 1000) {
      setError("Masukkan sebab tanpa ruang di hujung dan maksimum 1000 bait.")
      return
    }
    if (operation === "cutover" && !cutoverReviewReady) {
      setError("Versi semakan pengganti tidak tersedia. Muat semula butiran ini sebelum potong ganti.")
      return
    }
    const requestId = requestIdRef.current ?? crypto.randomUUID()
    requestIdRef.current = requestId
    setError("")
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/cards/${predecessorCardId}/replacement`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation,
            reason: value,
            requestId,
            ...(grantId ? { grantId } : {}),
            ...(operation === "cutover"
              ? {
                  expectedSourcePublicationId,
                  expectedReplacementDraftVersion,
                }
              : {}),
          }),
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          setError(body?.error || "Tindakan penggantian tidak dapat diselesaikan.")
          return
        }
        requestIdRef.current = null
        setOpen(false)
        setDraftReason("")
        window.location.reload()
      } catch {
        setError("Tindakan penggantian tidak dapat diselesaikan.")
      }
    })
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/35 p-4 sm:p-5" aria-labelledby={`replacement-${cardId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`replacement-${cardId}`} className="text-sm font-semibold text-[var(--primary)]">
            Penggantian terkawal
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Sumber entitlement berasingan untuk penggantian yang diluluskan pentadbir.
          </p>
        </div>
        {completed && <span className="rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]">Selesai</span>}
      </div>
      {reason && (
        <p className="mt-4 rounded-lg border border-[var(--border)] bg-card p-3 text-xs leading-5">
          <span className="font-semibold text-muted-foreground">Sebab: </span>{reason}
        </p>
      )}
      {replacementCardId && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{completed ? "Pengganti diterbitkan:" : "Draf pengganti:"}</span>
          <Link className="admin-link break-all" href={`/admin/cards/${replacementCardId}`}>
            Buka butiran pengganti →
          </Link>
        </p>
      )}
      {canCutover && (
        <p className="mt-3 rounded-lg border border-[var(--border)] bg-card p-3 text-xs leading-5 text-muted-foreground">
          Versi draf pengganti yang disemak: {cutoverReviewReady ? `v${expectedReplacementDraftVersion}` : "tidak tersedia"}.
          Potong ganti akan gagal jika pemilik menyimpan versi baharu selepas semakan ini.
        </p>
      )}
      {canGrant && (
        <Button type="button" className="mt-4" onClick={() => { setError(""); setDraftReason(""); setOpen(true) }}>
          Cipta penggantian
        </Button>
      )}
      {canCutover && (
        <Button type="button" className="mt-4" disabled={!cutoverReviewReady} onClick={() => { setError(""); setDraftReason(""); setOpen(true) }}>
          Lengkapkan potong ganti
        </Button>
      )}
      {completed && (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Predecessor kekal dalam rekod dengan snapshot, aset dan RSVP asal. URL tetamu lama hanya menunjukkan keadaan tidak tersedia.
        </p>
      )}
      <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value) }}>
        <DialogContent busy={pending} className="admin-workspace min-h-0 border-[var(--border)] bg-card">
          <DialogHeader>
            <DialogTitle>{canGrant ? "Cipta penggantian terkawal?" : "Lengkapkan potong ganti?"}</DialogTitle>
            <DialogDescription>
              {canGrant
                ? "Draf baharu akan disalin daripada snapshot awam terkini. Ia menerima order dan URL berasingan tanpa mencipta rekod bayaran."
                : "Tindakan ini menerbitkan draf pengganti yang telah divalidasi dan menghentikan predecessor secara kekal dalam satu transaksi."}
            </DialogDescription>
          </DialogHeader>
          <label htmlFor={`replacement-reason-${cardId}`} className="text-sm font-medium">Sebab pentadbir</label>
          <textarea
            id={`replacement-reason-${cardId}`}
            value={draftReason}
            onChange={(event) => { setDraftReason(event.target.value); requestIdRef.current = null }}
            rows={4}
            maxLength={1000}
            disabled={pending}
            className="w-full rounded-md border border-[var(--border)] bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Terangkan sebab penggantian."
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Batal</Button>
            <Button type="button" disabled={pending} onClick={() => submit(canGrant ? "grant" : "cutover")}>
              {pending ? "Memproses…" : canGrant ? "Cipta penggantian" : "Lengkapkan potong ganti"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
