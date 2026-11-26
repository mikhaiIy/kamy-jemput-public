"use client"

import type { ManualPaymentState } from "@/lib/payment-receipts"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  QrCode,
  ReceiptText,
  Upload,
} from "lucide-react"
import { ReceiptViewer } from "@/components/ReceiptViewer"
import { PhonePreview } from "@/components/PhonePreview"
import { PaymentMethodDialog } from "@/components/PaymentMethodDialog"
import { CopyLinkButton } from "@/components/CopyLinkButton"
import { PaymentSupportMessage } from "@/components/PaymentSupportMessage"
import type { PaymentSupportContact } from "@/lib/payment-support"
import type { CardLifecycle } from "@/lib/types"
import {
  formatMyrFromSen,
  manualPaymentMessage,
  manualPaymentNeedsSupport,
  PAYMENT_METHOD_LABEL_MS,
  type DuitNowReviewView,
  type DuitNowSlotView,
  type ManualOutcome,
  type PaymentMethod,
  type TransferSubmissionView,
} from "@/lib/payments"

type TngConfig = {
  enabled: boolean
  payee_name: string
  qr_image_url: string
  instructions: string
}

interface Props {
  qrPage: boolean
  initialManual: ManualPaymentState
  tng: TngConfig
  orderId: string
  initialOrderStatus: "pending" | "paid" | "failed"
  initialLifecycle: CardLifecycle
  initialCardId: string | null
  paymentMethod: PaymentMethod | null
  paymentCompletedAt: string | null
  initialCardSlug: string | null
  priceMyr: number
  slots: DuitNowSlotView[]
  initialSubmission: TransferSubmissionView | null
  initialReview: DuitNowReviewView | null
  stripeStatus: string | null
  appUrl: string
  manualPaidDraft: boolean
  supportContact: PaymentSupportContact
  stripeAvailable: boolean
  initialEditWindow: { id: string; expires_at: string } | null
}

const panelStyle = {
  maxWidth: 520,
  width: "100%",
  background: "#fff",
  border: "1px solid var(--border)",
  borderRadius: 20,
  padding: "48px 40px",
} as const

const headingStyle = {
  fontFamily: "var(--font-cormorant), serif",
  fontSize: 30,
  fontWeight: 600,
  color: "var(--primary)",
  margin: "0 0 12px",
} as const

const bodyStyle = {
  fontFamily: "var(--font-jakarta), sans-serif",
  fontSize: 14,
  color: "var(--muted-foreground)",
  lineHeight: 1.6,
} as const

const secondaryLinkStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 48,
  background: "transparent",
  color: "var(--primary)",
  border: "1.5px solid var(--border)",
  fontFamily: "var(--font-jakarta), sans-serif",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 10,
  textDecoration: "none",
} as const

export function CheckoutStatusClient({
  qrPage,
  initialManual,
  tng,
  orderId,
  initialOrderStatus,
  initialLifecycle,
  initialCardId,
  paymentMethod,
  paymentCompletedAt,
  initialCardSlug,
  priceMyr,
  slots,
  initialSubmission,
  initialReview,
  stripeStatus,
  appUrl,
  manualPaidDraft,
  supportContact: initialSupportContact,
  stripeAvailable,
  initialEditWindow,
}: Props) {
  const [choiceOpen, setChoiceOpen] = useState(true)
  const [manual, setManual] = useState(initialManual)
  const [orderStatus, setOrderStatus] = useState(initialOrderStatus)
  const [cardSlug, setCardSlug] = useState(initialCardSlug)
  const [paidDraft, setPaidDraft] = useState(manualPaidDraft || initialManual.paidDraft)
  const [lifecycle, setLifecycle] = useState<CardLifecycle>(initialLifecycle)
  const [needsManualCheck, setNeedsManualCheck] = useState(false)
  const [submission, setSubmission] = useState(initialSubmission)
  const [review, setReview] = useState(initialReview)
  // A rejected submission remains immutable history. While the customer is
  // deliberately preparing a replacement, polling must not rehydrate that old
  // reviewed record over the payment-method choice.
  const [retryMode, setRetryMode] = useState(false)
  const retryModeRef = useRef(false)
  // Winning-payment metadata: seeded from the server render and adopted from
  // every poll that reports `paid`, so a Stripe webhook or a confirmed DuitNow
  // review landing after page load still shows the correct winner.
  const [paidMethod, setPaidMethod] = useState<PaymentMethod | null>(
    paymentMethod,
  )
  const [paidCompletedAt, setPaidCompletedAt] = useState<string | null>(
    paymentCompletedAt,
  )
  const [supportContact, setSupportContact] = useState(initialSupportContact)
  const [stripeEnabled, setStripeEnabled] = useState(stripeAvailable)
  const [editWindow, setEditWindow] = useState(initialEditWindow)

  // Payment-choice state (only used while pending with no live submission).
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const refresh = useCallback(
    async (adoptSubmission = false) => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          cache: "no-store",
        })
        if (!res.ok) throw new Error("status check failed")
        const json = await res.json()
        if (json.manual) setManual(json.manual)
        if (json.manual?.paidDraft === true) setPaidDraft(true)
        if (json.supportContact) setSupportContact(json.supportContact)
        if (typeof json.stripeAvailable === "boolean") {
          setStripeEnabled(json.stripeAvailable)
        }
        if (json.status) setOrderStatus(json.status)
        if (
          json.lifecycle === "editing" ||
          json.lifecycle === "paid_draft" ||
          json.lifecycle === "publishing" ||
          json.lifecycle === "published" ||
          json.lifecycle === "unavailable" ||
          json.lifecycle === "edit_window" ||
          json.lifecycle === "edit_window_expired"
        ) {
          setLifecycle(json.lifecycle)
        }
        if (json.editWindowId && typeof json.editWindowExpiresAt === "string") {
          setEditWindow({ id: json.editWindowId, expires_at: json.editWindowExpiresAt })
        } else if (json.lifecycle !== "edit_window" && json.lifecycle !== "edit_window_expired") {
          setEditWindow(null)
        }
        if (json.lifecycle === "unavailable") {
          setNeedsManualCheck(false)
        }
        if (json.status === "paid") {
          setCardSlug(json.cardSlug ?? null)
          setNeedsManualCheck(false)
          // Only trust the two known winning methods; anything else is treated as
          // absent metadata rather than rendered verbatim.
          setPaidMethod(
            json.paymentMethod === "stripe" ||
              json.paymentMethod === "duitnow" ||
              json.paymentMethod === "tng"
              ? json.paymentMethod
              : null,
          )
          setPaidCompletedAt(
            typeof json.paymentCompletedAt === "string"
              ? json.paymentCompletedAt
              : null,
          )
        }
        if (json.duitnow && (adoptSubmission || !retryModeRef.current)) {
          setSubmission(json.duitnow.submission ?? null)
          setReview(json.duitnow.review ?? null)
          if (adoptSubmission) {
            retryModeRef.current = false
            setRetryMode(false)
          }
        }
        return true
      } catch {
        setNeedsManualCheck(true)
        return false
      }
    },
    [orderId],
  )

  // Poll until the invitation's availability is resolved: keep polling for a
  // paid-but-unpublished order (Publishing recovery), stop once the card link
  // exists or the invitation is Unavailable. Never polls uselessly forever.
  useEffect(() => {
    if (lifecycle === "unavailable" || lifecycle === "edit_window_expired") return
    if (orderStatus === "failed") return
    if (orderStatus === "paid" && (cardSlug || paidDraft)) return

    const interval = setInterval(
      () => void refresh(),
      stripeStatus ? 2000 : 5000,
    )
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setNeedsManualCheck(true)
    }, 300_000)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [orderStatus, cardSlug, paidDraft, refresh, stripeStatus, lifecycle])

  async function startStripeCheckout() {
    setSubmitError("")
    if (!stripeEnabled) {
      setSubmitError("Pembayaran Stripe tidak tersedia buat masa ini.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { url } = (await res.json()) as { url: string }
      window.location.href = url
    } catch {
      setSubmitError("Pembayaran Stripe tidak dapat dimulakan. Sila cuba lagi.")
      setSubmitting(false)
    }
  }

  const isSuccess = orderStatus === "paid"
  const isUnavailable = lifecycle === "unavailable"
  const isEditWindow = lifecycle === "edit_window"
  const isExpiredEditWindow = lifecycle === "edit_window_expired"
  const isCancelled = stripeStatus === "cancel"
  const cardReady = isSuccess && !!cardSlug
  const isPaidDraft = isSuccess && lifecycle === "paid_draft"
  // This flag comes from the server-derived lifecycle. Only the two
  // unpublished editing states may inherit editable wording from a receipt;
  // published/disabled histories stay read-only even when they have extras.
  const invitationEditable =
    lifecycle === "editing" ||
    lifecycle === "paid_draft"

  if (isPaidDraft && !isUnavailable) {
    return <ReceiptPaymentPanel
      orderId={orderId} manual={manual} slots={slots} tng={tng}
      price={priceMyr} refresh={() => refresh(true)} startStripe={startStripeCheckout}
      stripeBusy={submitting} stripeError={submitError} statusStale={needsManualCheck}
      cardId={initialCardId} cancelled={false} paidDraft supportContact={supportContact}
      stripeAvailable={stripeEnabled} invitationEditable={invitationEditable}
    />
  }

  if (isEditWindow || isExpiredEditWindow) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={panelStyle}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✦</div>
          <h1 style={headingStyle}>
            {isEditWindow ? "Suntingan diluluskan" : "Suntingan telah dikunci"}
          </h1>
          <p style={{ ...bodyStyle, marginBottom: 12 }}>
            {isEditWindow
              ? "Pentadbir telah membuka tetingkap tujuh hari. Jemputan kekal peribadi sehingga anda menerbitkan perubahan."
              : "Tetingkap tujuh hari telah tamat. Draf anda kekal tersimpan sehingga pentadbir membuka tetingkap baharu."}
          </p>
          {editWindow?.expires_at && (
            <p style={{ ...bodyStyle, fontSize: 12, marginBottom: 24 }}>
              Tamat: {new Date(editWindow.expires_at).toLocaleString("ms-MY", {
                timeZone: "Asia/Kuala_Lumpur",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {isEditWindow && initialCardId && (
              <Link
                href={`/dashboard/cards/${initialCardId}/edit`}
                style={{ ...secondaryLinkStyle, background: "var(--primary)", color: "var(--background)", borderColor: "var(--primary)" }}
              >
                Sambung Suntingan
              </Link>
            )}
            {isExpiredEditWindow && (
              <a
                href="mailto:support@kamyjemput.my?subject=Minta%20bukaan%20suntingan%20baharu"
                style={{ ...secondaryLinkStyle, background: "var(--primary)", color: "var(--background)", borderColor: "var(--primary)" }}
              >
                Hubungi Sokongan
              </a>
            )}
            <Link href="/dashboard" style={secondaryLinkStyle}>
              Pergi ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isUnavailable) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ ...panelStyle, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h1 style={headingStyle}>Jemputan Tidak Tersedia</h1>
          <p style={{ ...bodyStyle, marginBottom: 32 }}>
            Jemputan ini dinyahterbitkan oleh pasukan kami. Sila hubungi
            sokongan untuk maklumat lanjut.
          </p>
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 48,
              background: "var(--primary)",
              color: "var(--background)",
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            Pergi ke Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------ paid
  if (isSuccess) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          flexDirection: "column",
          gap: 32,
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={panelStyle}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h1 style={headingStyle}>{isPaidDraft ? "Bayaran diterima" : "Pembayaran Berjaya!"}</h1>
          {paidMethod && (
            <p style={{ ...bodyStyle, marginTop: -6, marginBottom: 12 }}>
              Kaedah bayaran: {PAYMENT_METHOD_LABEL_MS[paidMethod]}
              {paidCompletedAt &&
                ` · ${new Date(paidCompletedAt).toLocaleString("ms-MY", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
            </p>
          )}
          <p style={{ ...bodyStyle, marginBottom: 32 }}>
            {isPaidDraft
              ? manualStatusMessage(manual, false)
              : cardReady
                ? "Kad jemputan anda sudah siap. Pautan telah dihantar ke e-mel anda."
                : "Pembayaran anda diterima. Kad anda sedang disediakan..."}
          </p>

          {manualPaymentNeedsSupport({
            outcome: (manual.review?.outcome ?? "pending") as ManualOutcome,
            method: manual.attempt?.method ?? "duitnow",
            reason: manual.review?.reason ?? "",
            receivedSen: manual.receivedSen,
            creditedSen: manual.creditedSen,
            remainingSen: manual.remainingSen,
            excessSen: manual.excessSen,
          }) && <PaymentSupportMessage contact={supportContact} className="mb-5" />}

          <CurrentReceipt orderId={orderId} manual={manual} supportContact={supportContact} />
          {manual.excessSen > 0 && (
            <p role="status" className="mb-3">
              Lebihan {formatMyrFromSen(manual.excessSen)} direkodkan untuk
              bantuan bayaran balik manual.
            </p>
          )}
          {cardReady && cardSlug && (
            <div
              style={{
                background: "var(--secondary)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                Pautan Kad Anda
              </p>
              <CopyLinkButton url={`${appUrl}/i/${cardSlug}`} />
            </div>
          )}

          {isPaidDraft && initialCardId && (
            <Link
              href={`/dashboard/cards/${initialCardId}/edit`}
              style={{
                ...secondaryLinkStyle,
                background: "var(--primary)",
                color: "var(--background)",
                borderColor: "var(--primary)",
                marginBottom: 10,
              }}
            >
              Sunting Draf Berbayar
            </Link>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cardReady && cardSlug && (
              <Link
                href={`/i/${cardSlug}`}
                target="_blank"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 48,
                  background: "var(--primary)",
                  color: "var(--background)",
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                Lihat Kad Anda ↗
              </Link>
            )}
            <Link href="/dashboard" style={secondaryLinkStyle}>
              Pergi ke Dashboard
            </Link>
          </div>

        </div>
      </div>
    )
  }

  if (
    orderStatus === "pending" &&
    !manual.attempt &&
    !submission &&
    stripeStatus === "success"
  ) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Mengesahkan bayaran</h1>
        <p role="status" className="my-4 text-sm">
          Kami sedang mengesahkan bayaran anda. Jangan buat bayaran sekali lagi.
        </p>
        <button className="underline" onClick={() => void refresh()}>
          Semak status semula
        </button>
      </div>
    )
  }
  if (
    orderStatus === "pending" &&
    !qrPage &&
    !manual.attempt &&
    (!submission || retryMode)
  ) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Teruskan ke pembayaran</h1>
        {isCancelled && (
          <p role="status" className="mt-3 text-sm">
            Pembayaran Stripe dibatalkan.
          </p>
        )}
        <button
          className="my-6 rounded-lg bg-[var(--primary)] px-6 py-3 text-white"
          onClick={() => setChoiceOpen(true)}
        >
          Pilih cara bayaran
        </button>
        <Link
          href={
            initialCardId
              ? `/dashboard/cards/${initialCardId}/edit`
              : "/dashboard"
          }
          className="block text-sm underline"
        >
          Kembali
        </Link>
        <PaymentMethodDialog
          open={choiceOpen}
          onOpenChange={setChoiceOpen}
          orderId={orderId}
          stripeAvailable={stripeEnabled}
        />
      </div>
    )
  }

  if (
    orderStatus === "pending" &&
    (manual.attempt || !submission || retryMode)
  ) {
    return (
      <ReceiptPaymentPanel
        orderId={orderId}
        manual={manual}
        slots={slots}
        tng={tng}
        price={priceMyr}
        refresh={() => refresh(true)}
        startStripe={startStripeCheckout}
        stripeBusy={submitting}
        stripeError={submitError}
        statusStale={needsManualCheck}
        cardId={initialCardId}
        cancelled={stripeStatus === "cancel"}
        supportContact={supportContact}
        stripeAvailable={stripeEnabled}
        invitationEditable={invitationEditable}
      />
    )
  }

  // -------------------------------------------------------------- cancelled
  if (isCancelled && !submission) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={panelStyle}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>😕</div>
          <h1 style={headingStyle}>Pembayaran Dibatalkan</h1>
          <p style={{ ...bodyStyle, marginBottom: 32 }}>
            Tiada caj dibuat. Anda boleh cuba semula bila-bila masa.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stripeEnabled && <button
              type="button"
              onClick={() => void startStripeCheckout()}
              disabled={submitting}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 48,
                background: "var(--primary)",
                color: "var(--background)",
                border: "none",
                borderRadius: 10,
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cuba Stripe semula
            </button>}
            <Link
              href={
                initialCardId
                  ? `/dashboard/cards/${initialCardId}/edit`
                  : "/dashboard"
              }
              style={secondaryLinkStyle}
            >
              {initialCardId ? "Kembali ke Editor" : "Kembali ke Dashboard"}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ------------------------------------------------- submitted, awaiting review
  if (submission && !review) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={panelStyle}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⏳</div>
          <h1 style={headingStyle}>Menunggu Semakan Manual</h1>
          <p style={{ ...bodyStyle, marginBottom: 20 }}>
            Rujukan pindahan anda telah diterima. Pasukan kami akan menyemak dan
            mengesahkan secara manual — pengesahan ini bukan automatik.
          </p>
          <div
            style={{
              background: "var(--secondary)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 24,
              textAlign: "left",
            }}
          >
            <DetailRow
              label="Jumlah"
              value={formatMyrFromSen(submission.amountSen)}
            />
            <DetailRow
              label="Slot DuitNow"
              value={
                submission.slot.label || `Slot ${submission.slot.slotNumber}`
              }
            />
            <DetailRow
              label="Penerima"
              value={`${submission.slot.payeeName} — ${submission.slot.provider}`}
            />
            <DetailRow
              label="Rujukan anda"
              value={submission.transferReference}
            />
            <DetailRow
              label="Dihantar"
              value={new Date(submission.createdAt).toLocaleString("ms-MY", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
          </div>
          {needsManualCheck && (
            <button
              type="button"
              onClick={() => void refresh()}
              style={{
                width: "100%",
                height: 48,
                marginBottom: 10,
                background: "var(--primary)",
                color: "var(--background)",
                border: "none",
                borderRadius: 10,
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Semak semula
            </button>
          )}
          {initialCardId && (
            <Link
              href={`/dashboard/cards/${initialCardId}/edit`}
              style={{
                ...secondaryLinkStyle,
                background: "var(--primary)",
                color: "var(--background)",
                borderColor: "var(--primary)",
                marginBottom: 10,
              }}
            >
              Sunting Jemputan
            </Link>
          )}
          <Link href="/dashboard" style={secondaryLinkStyle}>
            Pergi ke Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------- rejected
  if (submission && review?.outcome === "rejected") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={panelStyle}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
          <h1 style={headingStyle}>Rujukan Tidak Disahkan</h1>
          <p style={{ ...bodyStyle, marginBottom: 16 }}>
            Rujukan pindahan anda tidak dapat disahkan. Anda boleh menghantar
            rujukan baharu selepas membuat pindahan yang betul.
          </p>
          {review.note && (
            <div
              style={{
                background: "#fdf3e7",
                border: "1px solid #ecd9c0",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0 0 4px",
                }}
              >
                Nota semakan
              </p>
              <p
                style={{
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 13,
                  color: "#5a4a3a",
                  margin: 0,
                }}
              >
                {review.note}
              </p>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                retryModeRef.current = true
                setRetryMode(true)
                setSubmission(null)
                setReview(null)
                setSubmitError("")
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 48,
                background: "var(--primary)",
                color: "var(--background)",
                border: "none",
                borderRadius: 10,
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Hantar rujukan baharu
            </button>
            {initialCardId && (
              <Link
                href={`/dashboard/cards/${initialCardId}/edit`}
                style={secondaryLinkStyle}
              >
                Sunting Jemputan
              </Link>
            )}
            <Link href="/dashboard" style={secondaryLinkStyle}>
              Pergi ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------- failed order / not payable
  if (orderStatus === "failed") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={panelStyle}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>😕</div>
          <h1 style={headingStyle}>Pesanan Gagal</h1>
          <p style={{ ...bodyStyle, marginBottom: 32 }}>
            Pesanan ini tidak dapat diproses.
          </p>
          <PaymentSupportMessage contact={supportContact} className="mb-5" />
          <Link href="/dashboard" style={secondaryLinkStyle}>
            Pergi ke Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <p role="status">
      Memuatkan statusu bayaran…{" "}
      <button onClick={() => void refresh()}>Semak semula</button>
    </p>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "3px 0",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jakarta), sans-serif",
          fontSize: 12,
          color: "var(--muted-foreground)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-jakarta), sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--primary)",
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  )
}

function CurrentReceipt({
  orderId,
  manual,
  supportContact,
}: {
  orderId: string
  manual: ManualPaymentState
  supportContact: PaymentSupportContact
}) {
  if (!manual.receipt) return null
  return (
    <div className="my-4 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
      <p className="font-semibold">Resit bayaran anda</p>
      {manual.receipt.access === "available" ? (
        <ReceiptViewer
          orderId={orderId}
          receiptId={manual.receipt.id}
          description="Resit semasa anda"
          supportContact={supportContact}
        />
      ) : (
        <>
          <p>Resit tidak tersedia. Muat naik pengganti.</p>
          <PaymentSupportMessage contact={supportContact} className="mt-3" />
        </>
      )}
    </div>
  )
}

function manualStatusMessage(
  manual: ManualPaymentState,
  invitationEditable = false,
): string {
  const outcome = (manual.review?.outcome ?? "pending") as ManualOutcome
  return manualPaymentMessage(
    {
      outcome,
      method: manual.attempt?.method ?? "duitnow",
      reason: manual.review?.reason ?? "",
      receivedSen: manual.receivedSen,
      creditedSen: manual.creditedSen,
      remainingSen: manual.remainingSen,
      excessSen: manual.excessSen,
      paidDraft: manual.paidDraft,
    },
    invitationEditable,
  )
}

function ReceiptPaymentPanel({
  orderId,
  manual,
  slots,
  tng,
  price,
  refresh,
  startStripe,
  stripeBusy,
  stripeError,
  statusStale,
  cardId,
  cancelled,
  supportContact,
  stripeAvailable,
  invitationEditable,
  paidDraft = false,
}: {
  orderId: string
  manual: ManualPaymentState
  slots: DuitNowSlotView[]
  tng: TngConfig
  price: number
  refresh: () => Promise<boolean>
  startStripe: () => Promise<void>
  stripeBusy: boolean
  stripeError: string
  statusStale: boolean
  cardId: string | null
  cancelled: boolean
  supportContact: PaymentSupportContact
  stripeAvailable: boolean
  invitationEditable: boolean
  paidDraft?: boolean
}) {
  const [method, setMethod] = useState<"duitnow" | "tng">(
    manual.attempt?.method ?? "duitnow",
  )
  const slotNumber = 1
  const [reference, setReference] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState("")
  const operation = useRef<string | null>(null)
  const busy = progress !== null
  const replacing =
    manual.attempt?.state === "submitted" || manual.attempt?.state === "rejected"
  const topUp = manual.attempt?.state === "insufficient"
  const selectedMethod =
    replacing || topUp || manual.receivedSen > 0
      ? manual.attempt!.method
      : method
  const slot = slots.find((s) => s.slotNumber === slotNumber)
  const recipient = replacing || topUp || manual.receivedSen > 0
    ? manual.attempt!.slot_snapshot
    : selectedMethod === "tng"
      ? tng.enabled
        ? {
            payeeName: tng.payee_name,
            qrImageUrl: tng.qr_image_url,
            provider: "Touch ’n Go",
            instructions: tng.instructions,
          }
        : undefined
      : slot
  const canStripe =
    stripeAvailable &&
    !paidDraft &&
    manual.receivedSen === 0 &&
    manual.attempt?.state !== "submitted"

  async function submit() {
    if (!file) {
      setError("Sila pilih satu resit.")
      return
    }
    if (file.size > 5 * 1024 * 1024 || file.size === 0) {
      setError("Resit mesti berukuran 1 bait hingga 5 MB.")
      return
    }
    operation.current ??= crypto.randomUUID()
    const form = new FormData()
    form.set("receipt", file)
    form.set("operationId", operation.current)
    form.set("method", selectedMethod)
    form.set("slotNumber", String(slotNumber))
    form.set("reference", reference)
    if (replacing) {
      form.set("attemptId", manual.attempt!.id)
      form.set("expectedReceiptId", manual.receipt!.id)
    }
    setError("")
    setProgress(0)
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", `/api/orders/${orderId}/status`)
        xhr.timeout = 120000
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onerror = xhr.ontimeout = () =>
          reject(
            new Error(
              "Sambungan gagal. Cuba semula dengan fail pilihan yang sama.",
            ),
          )
        xhr.onload = () => {
          let body
          try {
            body = JSON.parse(xhr.responseText)
          } catch {
            reject(new Error("Respons tidak dapat dibaca. Cuba semula."))
            return
          }
          if (xhr.status < 200 || xhr.status >= 300)
            reject(new Error(body.error || "Muat naik gagal."))
          else resolve()
        }
        xhr.send(form)
      })
      if (!(await refresh())) {
        setError(
          "Resit diterima, tetapi status belum dapat dimuatkan. Semak status semula atau cuba semula dengan fail yang sama.",
        )
        return
      }
      setReplacingFile(false)
      setFile(null)
      setReference("")
      operation.current = null
    } catch (e) {
      setError(e instanceof Error ? e.message : "Muat naik gagal. Cuba semula.")
    } finally {
      setProgress(null)
    }
  }
  const resetOperation = () => {
    operation.current = null
  }
  const awaiting = manual.attempt?.state === "submitted"
  const [replacingFile, setReplacingFile] = useState(false)
  const [qrFailed, setQrFailed] = useState(false)
  const [additionalReceipt, setAdditionalReceipt] = useState(false)
  const showUpload = !awaiting || replacingFile
  return (
    <div className="min-h-[80vh] bg-[var(--background)] px-5 py-8 sm:py-12 text-[var(--primary)]">
      <div className="mx-auto w-full max-w-[1400px]">
        <Link
          href={cardId ? `/dashboard/cards/${cardId}/edit` : "/dashboard"}
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)]"
        >
          <ArrowLeft size={16} aria-hidden />{" "}
          {cardId ? "Kembali ke editor" : "Dashboard"}
        </Link>
        <header className="mb-8 mt-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[.16em] text-[#83728f] uppercase">
              Bayaran jemputan
            </p>
            <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-semibold sm:text-5xl">
              {paidDraft
                ? "Draf berbayar anda"
                : awaiting
                ? "Resit anda telah diterima"
                : topUp ? "Lengkapkan baki bayaran" : "Bayar dengan DuitNow QR"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {paidDraft
                ? "Draf ini boleh disunting. Jika ada bayaran tambahan, muat naik resit untuk semakan sokongan."
                : awaiting
                ? "Kami akan menyemak bayaran anda. Sementara itu, anda boleh menyunting jemputan; perubahan ini tidak mengubah resit atau rekod semakan."
                : topUp
                ? `Bayar baki ${formatMyrFromSen(manual.remainingSen)} menggunakan QR di bawah, kemudian hantar resit baharu. Anda juga boleh terus menyunting jemputan; rekod bayaran kekal tidak berubah.`
                : "Imbas kod QR, buat bayaran, kemudian muat naik resit anda."}
            </p>
          </div>
          {!paidDraft && <div className="sm:text-right">
            <p className="text-xs text-[var(--muted-foreground)]">
              {manual.receivedSen > 0 ? "Baki bayaran" : "Jumlah bayaran"}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {formatMyrFromSen(manual.receivedSen > 0 ? manual.remainingSen : price)}
            </p>
          </div>}
        </header>
        <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
        {paidDraft && cardId && (
          <Link href={`/dashboard/cards/${cardId}/edit`} className="mb-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white">
            Sunting Draf Berbayar <ArrowRight size={16} aria-hidden />
          </Link>
        )}
        {manual.receivedSen > 0 && (
          <dl className="mb-8 grid grid-cols-1 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[["Harga jemputan", price], ["Bayaran diterima", manual.receivedSen], ["Baki bayaran", manual.remainingSen]].map(([label, amount]) => (
              <div key={label} className="px-6 py-5 sm:px-8">
                <dt className="text-sm text-[var(--muted-foreground)]">{label}</dt>
                <dd className="mt-2 text-2xl font-semibold tabular-nums">{formatMyrFromSen(Number(amount))}</dd>
              </div>
            ))}
          </dl>
        )}
        {cancelled && (
          <p role="status" className="mb-5 rounded-xl bg-white p-4 text-sm">
            Pembayaran Stripe dibatalkan. Anda boleh membayar menggunakan QR.
          </p>
        )}
        {manual.attempt && (
          <div
            role="status"
            className={`mb-6 rounded-xl border p-4 text-sm leading-relaxed ${manual.review?.outcome === "rejected" ? "border-red-200 bg-red-50 text-red-900" : manual.review?.outcome === "confirmed" ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
          >
            {manualStatusMessage(manual, invitationEditable)}
            {manualPaymentNeedsSupport({
              outcome: (manual.review?.outcome ?? "pending") as ManualOutcome,
              method: manual.attempt.method,
              reason: manual.review?.reason ?? "",
              receivedSen: manual.receivedSen,
              creditedSen: manual.creditedSen,
              remainingSen: manual.remainingSen,
              excessSen: manual.excessSen,
            }) && <PaymentSupportMessage contact={supportContact} className="mt-3" />}
          </div>
        )}
        <div className={`grid items-start gap-6 ${!paidDraft || additionalReceipt ? "lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" : ""}`}>
          {(!paidDraft || additionalReceipt) && (
          <section
            aria-label="Kod QR bayaran"
            className="min-w-0 rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-10"
          >
            <h2 className="mb-2 text-xl font-semibold">{awaiting || paidDraft ? "Kaedah bayaran anda" : "1. Buat bayaran"}</h2>
            {!awaiting && !paidDraft && <p className="mb-7 text-sm leading-relaxed text-[var(--muted-foreground)]">Masukkan jumlah <strong className="text-[var(--primary)]">{formatMyrFromSen(manual.receivedSen > 0 ? manual.remainingSen : price)}</strong> semasa membayar kepada penerima di bawah.</p>}
            {!replacing && !topUp && manual.receivedSen === 0 && !paidDraft ? (
              <fieldset disabled={busy || stripeBusy}>
                <legend className="mb-4 text-sm font-semibold">
                  Pilih QR bayaran
                </legend>
                <div className="mb-7 grid grid-cols-2 gap-2">
                  {(
                    [
                      ["duitnow", "Bank"],
                      ["tng", "Touch ’n Go"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selectedMethod === value}
                      onClick={() => {
                        setMethod(value)
                        setQrFailed(false)
                        resetOperation()
                      }}
                      className={`min-h-12 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${selectedMethod === value ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : (
              <p className="mb-6 text-sm font-semibold">
                {selectedMethod === "tng" ? "Touch ’n Go" : "Bank · DuitNow QR"}
              </p>
            )}
            {recipient?.qrImageUrl && !qrFailed ? (
              <div className="text-center">
                <div className="mx-auto max-w-[320px] rounded-2xl border-2 border-[#b91c65] bg-white p-5">
                  <p className="mb-3 text-sm font-bold tracking-wide text-[#b91c65]">
                    {selectedMethod === "tng" ? "Touch ’n Go" : "DuitNow QR"}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={recipient.qrImageUrl}
                    src={recipient.qrImageUrl}
                    onError={() => setQrFailed(true)}
                    alt={`Kod QR bayaran kepada ${recipient.payeeName}`}
                    width={224}
                    height={224}
                    className="aspect-square w-full object-contain"
                  />
                </div>
                <p className="mt-5 font-semibold">{recipient.payeeName}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {recipient.provider}
                </p>
                {recipient.instructions && (
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[var(--muted-foreground)]">
                    {recipient.instructions}
                  </p>
                )}
              </div>
            ) : (
              <div
                role="status"
                className="rounded-xl bg-[var(--muted)] px-6 py-12 text-center"
              >
                <QrCode
                  className="mx-auto mb-4 text-[#a392b1]"
                  size={36}
                  aria-hidden
                />
                <p className="font-semibold">QR ini belum tersedia</p>
                <PaymentSupportMessage contact={supportContact} className="mt-5 text-left" />
              </div>
            )}
          </section>
          )}
          <section aria-label="Resit bayaran" className="min-w-0 rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-[#f1edf5] p-2.5">
                <ReceiptText size={20} aria-hidden />
              </div>
              <h2 className="text-lg font-semibold">
                {paidDraft ? "Resit bayaran anda" : awaiting ? "Menunggu semakan" : "2. Hantar resit bayaran"}
              </h2>
            </div>
            <CurrentReceipt orderId={orderId} manual={manual} supportContact={supportContact} />
            {awaiting && !showUpload && (
              <>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  Anda boleh kembali ke editor jemputan sementara kami menyemak resit.
                  Perubahan jemputan tidak mengubah resit atau rekod semakan.
                </p>
                <button
                  type="button"
                  onClick={() => setReplacingFile(true)}
                  className="mt-6 text-sm font-semibold underline underline-offset-4"
                >
                  Tersalah fail? Gantikan resit
                </button>
              </>
            )}
            {paidDraft && !additionalReceipt && <>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">Bayaran telah lengkap. Resit di atas ialah bukti bayaran untuk jemputan di sebelah.</p>
              <button type="button" onClick={() => setAdditionalReceipt(true)} className="mt-6 text-sm font-semibold underline underline-offset-4">Ada resit tambahan untuk sokongan?</button>
            </>}
            {showUpload && (!paidDraft || additionalReceipt) && (
              <fieldset
                disabled={busy || stripeBusy}
                className="space-y-5 disabled:opacity-60"
              >
                <legend className="sr-only">Muat naik resit bayaran</legend>
                <label className="relative flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-[#bbaac9] bg-[var(--background)] px-4 py-8 text-center transition hover:bg-[var(--muted)] focus-within:outline-2 focus-within:outline-offset-4">
                  <Upload
                    size={24}
                    className="mb-3 text-[#8d729e]"
                    aria-hidden
                  />
                  <span className="max-w-full break-all text-sm font-semibold">
                    {file
                      ? file.name
                      : replacing
                        ? "Pilih resit pengganti"
                        : topUp || paidDraft
                          ? "Pilih resit bayaran tambahan"
                        : "Pilih fail resit"}
                  </span>
                  <span className="mt-2 text-xs text-[var(--muted-foreground)]">
                    PDF, JPG, PNG atau WebP · Maksimum 5 MB
                  </span>
                  <input
                    key={file ? "selected" : "empty"}
                    aria-label="Pilih fail resit"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null)
                      resetOperation()
                    }}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Nombor rujukan{" "}
                  <span className="font-normal text-[var(--muted-foreground)]">(pilihan)</span>
                  <input
                    className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-3 outline-none focus:border-[#6f438e] focus:ring-2 focus:ring-[#eee5f5]"
                    value={reference}
                    maxLength={64}
                    onChange={(e) => {
                      setReference(e.target.value)
                      resetOperation()
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!file || !recipient?.qrImageUrl || qrFailed}
                  onClick={() => void submit()}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-40"
                >
                  {busy
                    ? "Memuat naik…"
                    : replacing
                      ? "Hantar resit pengganti"
                      : topUp || paidDraft
                        ? "Hantar resit tambahan"
                      : "Hantar resit"}
                  <ArrowRight size={16} aria-hidden />
                </button>
                <p className="text-center text-xs leading-relaxed text-[var(--muted-foreground)]">
                  Resit anda hanya boleh dilihat oleh anda dan pentadbir.
                </p>
              </fieldset>
            )}
            {busy && (
              <div role="status" className="mt-4 text-sm">
                <progress
                  aria-label="Kemajuan muat naik"
                  className="w-full accent-[var(--primary)]"
                  max={100}
                  value={progress ?? 0}
                />
                {progress === 100
                  ? "Mengesahkan penerimaan resit…"
                  : `Memuat naik resit… ${progress}%`}
              </div>
            )}
            {(error || stripeError) && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error || stripeError}
              </p>
            )}
            {statusStale && (
              <p role="status" className="mt-4 text-sm text-amber-800">
                Status belum dapat dikemas kini. Sila semak semula.
              </p>
            )}
            {(awaiting || statusStale) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void refresh()}
                className="mt-5 block text-sm font-semibold underline underline-offset-4"
              >
                Semak status semula
              </button>
            )}
          </section>
        </div>
        </div>
        {cardId && <aside className="mx-auto w-full max-w-[360px] xl:sticky xl:top-24" aria-label="Pratonton jemputan untuk bayaran ini">
          <h2 className="mb-2 text-xl font-semibold">Jemputan anda</h2>
          <p className="mb-6 text-sm leading-relaxed text-[var(--muted-foreground)]">Bayaran dan resit ini adalah untuk jemputan ini. Pratonton memaparkan draf terakhir yang disimpan.</p>
          <PhonePreview mode="phone">
            <iframe src={`/dashboard/cards/${cardId}/preview`} title="Pratonton jemputan anda" className="h-full w-full border-0" />
          </PhonePreview>
        </aside>}
        </div>
        {canStripe && (
          <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            Ingin guna kad?{" "}
            <button
              type="button"
              disabled={busy || stripeBusy}
              onClick={() => void startStripe()}
              className="font-semibold text-[var(--primary)] underline underline-offset-4"
            >
              {stripeBusy ? "Membuka Stripe…" : "Bayar dengan Stripe"}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
