"use client"

import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PaymentSupportMessage } from "@/components/PaymentSupportMessage"
import type { PaymentSupportContact } from "@/lib/payment-support"
import type { CardEditRequestSummary } from "@/lib/types"

type Props = {
  cardId: string
  title: string
  eventDate: string | null
  lifecycleLabel: string
  overview?: string | null
  deadline?: {
    label: string
    detail: string
  } | null
  unavailableReason?: string | null
  replacement?: {
    heading: string
    reason: string
    detail: string
  } | null
  request?: CardEditRequestSummary | null
  manualPayment?: {
    message: string
    needsSupport: boolean
    supportContact: PaymentSupportContact
  } | null
}

const requestLabels: Record<CardEditRequestSummary["status"], string> = {
  pending: "Menunggu semakan",
  approved: "Suntingan diluluskan",
  rejected: "Permintaan ditolak",
  stale: "Permintaan tidak lagi tersedia",
}

const dateTimeFormatter = new Intl.DateTimeFormat("ms-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  dateStyle: "medium",
  timeStyle: "short",
})

function formatRequestTime(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : dateTimeFormatter.format(parsed)
}

function requestDetail(request: CardEditRequestSummary) {
  if (request.status === "pending") {
    return "Permintaan sedang menunggu semakan pentadbir."
  }
  if (request.status === "approved") {
    return "Tetingkap suntingan diluluskan untuk jemputan ini."
  }
  return (
    request.decision_reason ||
    (request.status === "rejected"
      ? "Pentadbir menolak permintaan ini."
      : "Jemputan berubah sebelum permintaan dapat disemak.")
  )
}

export function InvitationDetailsDialog({
  cardId,
  title,
  eventDate,
  lifecycleLabel,
  overview,
  deadline,
  unavailableReason,
  replacement,
  request,
  manualPayment,
}: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 min-h-8 shrink-0 gap-1 px-2 text-xs text-primary"
          aria-label={`Buka butiran ${title}`}
        >
          <Info size={14} aria-hidden />
          Butiran
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg break-words">
        <DialogHeader>
          <DialogTitle>Butiran jemputan</DialogTitle>
          <DialogDescription>
            Status dan maklumat lengkap untuk jemputan ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 break-words text-sm">
          <section aria-labelledby={`details-title-${cardId}`}>
            <h3
              id={`details-title-${cardId}`}
              className="break-words text-base font-semibold text-primary"
            >
              {title}
            </h3>
            <dl className="mt-2 grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-primary">Status</dt>
                <dd>{lifecycleLabel}</dd>
              </div>
              <div>
                <dt className="font-semibold text-primary">Tarikh majlis</dt>
                <dd>{eventDate || "Tarikh belum ditetapkan"}</dd>
              </div>
            </dl>
            {overview ? (
              <p className="mt-3 leading-6 text-muted-foreground">{overview}</p>
            ) : null}
          </section>

          {deadline ? (
            <section className="border-t border-border pt-4">
              <h3 className="font-semibold text-primary">Suntingan</h3>
              <p className="mt-1 leading-6 text-muted-foreground">
                {deadline.label}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {deadline.detail}
              </p>
            </section>
          ) : null}

          {unavailableReason ? (
            <section className="border-t border-border pt-4">
              <h3 className="font-semibold text-primary">Maklumat sokongan</h3>
              <p className="mt-1 leading-6 text-muted-foreground">
                {unavailableReason}
              </p>
            </section>
          ) : null}

          {replacement ? (
            <section className="border-t border-border pt-4">
              <h3 className="font-semibold text-primary">
                {replacement.heading}
              </h3>
              <p className="mt-1 leading-6 text-muted-foreground">
                Sebab: {replacement.reason}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {replacement.detail}
              </p>
            </section>
          ) : null}

          {request ? (
            <section className="border-t border-border pt-4">
              <h3 className="font-semibold text-primary">Mohon Suntingan</h3>
              <p className="mt-1 leading-6 text-muted-foreground">
                {requestLabels[request.status]}. {requestDetail(request)}
              </p>
              <dl className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                <div>
                  <dt className="font-semibold text-primary">Sebab anda</dt>
                  <dd className="mt-0.5 break-words">{request.reason}</dd>
                </div>
                {request.decision_reason ? (
                  <div>
                    <dt className="font-semibold text-primary">
                      Maklum balas pentadbir
                    </dt>
                    <dd className="mt-0.5 break-words">
                      {request.decision_reason}
                    </dd>
                  </div>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  {formatRequestTime(request.submitted_at) ? (
                    <div>
                      <dt className="font-semibold text-primary">Dihantar</dt>
                      <dd>{formatRequestTime(request.submitted_at)}</dd>
                    </div>
                  ) : null}
                  {formatRequestTime(request.decided_at) ? (
                    <div>
                      <dt className="font-semibold text-primary">Diputuskan</dt>
                      <dd>{formatRequestTime(request.decided_at)}</dd>
                    </div>
                  ) : null}
                </div>
              </dl>
            </section>
          ) : null}

          {manualPayment ? (
            <section className="border-t border-border pt-4">
              <h3 className="font-semibold text-primary">Maklumat bayaran</h3>
              <p className="mt-1 leading-6 text-muted-foreground">
                {manualPayment.message}
              </p>
              {manualPayment.needsSupport ? (
                <PaymentSupportMessage
                  contact={manualPayment.supportContact}
                  className="mt-3 text-xs"
                />
              ) : null}
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
