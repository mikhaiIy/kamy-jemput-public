import type { ReactNode } from "react"
import {
  buildPaymentSupportMessage,
  type PaymentSupportContact,
} from "@/lib/payment-support"

type Props = {
  contact?: PaymentSupportContact | null
  /** The caller supplies this only when its server-side eligibility guard passes. */
  stripeAction?: ReactNode
  className?: string
}

/**
 * Customer-safe payment support copy. It intentionally renders links from the
 * validated channel model instead of interpolating persisted HTML/URLs.
 */
export function PaymentSupportMessage({
  contact,
  stripeAction,
  className = "",
}: Props) {
  const message = buildPaymentSupportMessage(contact)
  return (
    <div
      className={`min-w-0 break-words rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm leading-relaxed text-[#5f536c] ${className}`}
      data-payment-support-message
    >
      <p className="break-words">
        {message.email && message.whatsapp ? (
          <>
            Ada masalah dengan bayaran ini. Sila hubungi{" "}
            <a
              href={message.email.href}
              className="break-all font-semibold text-[var(--primary)] underline underline-offset-2"
            >
              {message.email.value}
            </a>{" "}
            atau WhatsApp{" "}
            <a
              href={message.whatsapp.href}
              target="_blank"
              rel="noreferrer"
              className="break-all font-semibold text-[var(--primary)] underline underline-offset-2"
            >
              {message.whatsapp.value}
            </a>
            .
          </>
        ) : message.email ? (
          <>
            Ada masalah dengan bayaran ini. Sila hubungi{" "}
            <a
              href={message.email.href}
              className="break-all font-semibold text-[var(--primary)] underline underline-offset-2"
            >
              {message.email.value}
            </a>
            .
          </>
        ) : message.whatsapp ? (
          <>
            Ada masalah dengan bayaran ini. Sila WhatsApp{" "}
            <a
              href={message.whatsapp.href}
              target="_blank"
              rel="noreferrer"
              className="break-all font-semibold text-[var(--primary)] underline underline-offset-2"
            >
              {message.whatsapp.value}
            </a>
            .
          </>
        ) : (
          message.text
        )}
      </p>
      {message.fallback && stripeAction ? (
        <div className="mt-3">{stripeAction}</div>
      ) : null}
    </div>
  )
}
