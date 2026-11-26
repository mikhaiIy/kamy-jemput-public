"use client"

import { createPortal } from "react-dom"
import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button, type ButtonProps } from "@/components/ui/button"
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
import { SupportContactDialog } from "@/components/SupportContactDialog"
import type { PaymentSupportContact } from "@/lib/payment-support"
import type {
  CardEditRequestStatus,
  CardEditRequestSummary,
  CardLifecycle,
} from "@/lib/types"

type Props = {
  cardId: string
  lifecycle: Extract<CardLifecycle, "published" | "edit_window_expired">
  existingRequest?: CardEditRequestSummary | null
  statusTargetId?: string
  compactStatus?: boolean
  expiredSupportContact?: PaymentSupportContact | null
  triggerVariant?: ButtonProps["variant"]
  triggerSize?: ButtonProps["size"]
  triggerClassName?: string
}

type Result = {
  requestId: string
  submittedAt: string | null
  status: CardEditRequestStatus
  decisionReason: string | null
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}

function statusCopy(
  request: Pick<CardEditRequestSummary, "status" | "decision_reason">,
) {
  if (request.status === "rejected") {
    return {
      label: "Permintaan ditolak",
      detail: request.decision_reason || "Pentadbir menolak permintaan ini.",
      tone: "border-destructive/20 bg-destructive/5 text-destructive",
    }
  }
  if (request.status === "stale") {
    return {
      label: "Permintaan tidak lagi tersedia",
      detail:
        request.decision_reason ||
        "Jemputan berubah sebelum permintaan dapat disemak. Anda boleh menghantar permintaan baharu.",
      tone: "border-amber-300/50 bg-amber-50 text-amber-950",
    }
  }
  if (request.status === "approved") {
    return {
      label: "Suntingan diluluskan",
      detail: "Tetingkap suntingan telah dibuka.",
      tone: "border-primary/20 bg-primary/5 text-primary",
    }
  }
  return {
    label: "Menunggu semakan",
    detail:
      "Jemputan kekal awam dan baca sahaja sehingga pentadbir meluluskan permintaan ini.",
    tone: "border-primary/20 bg-primary/5 text-primary",
  }
}

function pendingCopy(lifecycle: Props["lifecycle"]) {
  return lifecycle === "edit_window_expired"
    ? "Jemputan kekal peribadi dan terkunci sehingga pentadbir meluluskan permintaan ini."
    : "Jemputan kekal awam dan baca sahaja sehingga pentadbir meluluskan permintaan ini."
}

function compactPendingCopy(lifecycle: Props["lifecycle"]) {
  return lifecycle === "edit_window_expired"
    ? "Jemputan peribadi dan terkunci sementara menunggu semakan."
    : "Jemputan awam dan baca sahaja sementara menunggu semakan."
}

export function EditRequestDialog({
  cardId,
  lifecycle,
  existingRequest,
  statusTargetId,
  compactStatus = false,
  expiredSupportContact,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName = "w-full",
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [isPending, startTransition] = useTransition()
  const [statusTarget, setStatusTarget] = useState<HTMLElement | null>(null)
  const requestIdRef = useRef<string | null>(null)

  useEffect(() => {
    const target =
      statusTargetId && typeof document !== "undefined"
        ? document.getElementById(statusTargetId)
        : null
    // The status slot is rendered in the tile content while this client dialog
    // lives in the bottom action stack.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatusTarget(target)
  }, [statusTargetId])

  // The server result is optimistic until the refreshed owner projection has
  // caught up. A terminal server row with the same request id (or a newer
  // submitted row) must win, so an administrator's rejection/stale decision
  // cannot be masked by the local pending state while this tile stays mounted.
  const serverRequestWins = Boolean(
    result &&
      existingRequest &&
      (existingRequest.request_id === result.requestId ||
        (result.submittedAt !== null &&
          existingRequest.submitted_at >= result.submittedAt)),
  )
  const visibleRequest = serverRequestWins
    ? existingRequest
    : result
      ? {
          status: result.status,
          decision_reason: result.decisionReason,
        }
      : existingRequest
  const isWaiting = visibleRequest?.status === "pending"

  function submit() {
    if (
      reason.length === 0 ||
      reason.trim() !== reason ||
      byteLength(reason) > 500
    ) {
      setError("Masukkan sebab tanpa ruang di hujung dan maksimum 500 bait.")
      return
    }
    setError("")
    const requestId = requestIdRef.current ?? crypto.randomUUID()
    requestIdRef.current = requestId
    startTransition(async () => {
      try {
        const response = await fetch(`/api/cards/${cardId}/edit-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, requestId }),
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          setError(body?.error || "Permintaan suntingan tidak dapat dihantar.")
          return
        }
        const request = body?.request as
          | {
              requestId?: unknown
              submittedAt?: unknown
              status?: CardEditRequestStatus
              decisionReason?: string | null
            }
          | undefined
        if (!request || typeof request.requestId !== "string") {
          setError("Permintaan suntingan tidak dapat dihantar.")
          return
        }
        requestIdRef.current = null
        setReason("")
        setResult({
          requestId: request.requestId,
          submittedAt:
            typeof request.submittedAt === "string" ? request.submittedAt : null,
          status: request.status ?? "pending",
          decisionReason: request.decisionReason ?? null,
        })
        setOpen(false)
        router.refresh()
      } catch {
        // Keep the request id so a network retry cannot create a second row.
        setError("Sambungan terganggu. Cuba hantar semula permintaan yang sama.")
      }
    })
  }

  if (isWaiting) {
    const waitingBlock = (
      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs leading-5 text-primary">
        <p className="font-semibold">Menunggu semakan</p>
        <p className="mt-1">
          {compactStatus
            ? compactPendingCopy(lifecycle)
            : `Permintaan anda sedang disemak. ${pendingCopy(lifecycle)}`}
        </p>
      </div>
    )
    const waitingStatus = statusTargetId
      ? statusTarget
        ? createPortal(waitingBlock, statusTarget)
        : null
      : waitingBlock
    if (!expiredSupportContact) {
      return <>{waitingStatus}</>
    }
    return (
      <>
        {waitingStatus}
        <div className="flex w-full flex-col gap-2">
          <div className="min-h-11">
            <SupportContactDialog
              contact={expiredSupportContact}
              className="w-full"
            />
          </div>
          <div className="invitation-secondary-track" aria-hidden="true" />
        </div>
      </>
    )
  }

  const copy = visibleRequest ? statusCopy(visibleRequest) : null
  const canSubmit = lifecycle === "published" || lifecycle === "edit_window_expired"
  const statusBlock = copy && copy.label !== "Suntingan diluluskan" && (
    <div className={`mt-3 rounded-lg border p-2.5 text-xs leading-5 ${copy.tone}`}>
      <p className="font-semibold">{copy.label}</p>
      <p className="mt-1">
        {compactStatus && copy.label !== "Menunggu semakan"
          ? "Buka Butiran untuk melihat sebab."
          : copy.detail}
      </p>
    </div>
  )
  const trigger = (
    <DialogTrigger asChild>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
      >
        Mohon Suntingan
      </Button>
    </DialogTrigger>
  )

  const requestDialog = (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && setOpen(nextOpen)}>
      {statusBlock &&
        (statusTargetId
          ? statusTarget
            ? createPortal(statusBlock, statusTarget)
            : null
          : statusBlock)}
      {canSubmit && trigger}
      <DialogContent busy={isPending}>
        <DialogHeader>
          <DialogTitle>Mohon Suntingan</DialogTitle>
          <DialogDescription>
            Terangkan perubahan yang diperlukan. Permintaan ini masuk ke
            semakan pentadbir; ia tidak membuka suntingan secara automatik.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label
            htmlFor={`edit-request-reason-${cardId}`}
            className="text-sm font-medium"
          >
            Sebab permintaan
          </label>
          <Textarea
            id={`edit-request-reason-${cardId}`}
            value={reason}
            onChange={(event) => {
              if (event.target.value !== reason) requestIdRef.current = null
              setReason(event.target.value)
              setError("")
            }}
            maxLength={500}
            rows={5}
            autoFocus
            disabled={isPending}
            placeholder="Contoh: Tukar masa majlis kepada 8:00 malam."
            aria-describedby={`edit-request-help-${cardId}`}
          />
          <div
            id={`edit-request-help-${cardId}`}
            className="flex justify-between gap-3 text-[11px] text-muted-foreground"
          >
            <span>Wajib diisi · maksimum 500 bait</span>
            <span>{byteLength(reason)}/500</span>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button type="button" onClick={submit} disabled={isPending}>
            {isPending ? "Menghantar…" : "Hantar permintaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (!expiredSupportContact) return requestDialog
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="min-h-11">{requestDialog}</div>
      <div className="invitation-secondary-track">
        <SupportContactDialog
          contact={expiredSupportContact}
          variant="outline"
          size="sm"
          className="w-full"
        />
      </div>
    </div>
  )
}
