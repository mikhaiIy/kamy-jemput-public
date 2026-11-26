import { Resend } from "resend"
import { OrderConfirmedEmail } from "@/components/emails/OrderConfirmedEmail"
import { RSVPNotificationEmail } from "@/components/emails/RSVPNotificationEmail"
import * as React from "react"

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not set")
  return new Resend(key)
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@example.com"

export async function sendOrderConfirmedEmail({
  to,
  cardSlug,
  eventName,
}: {
  to: string
  cardSlug: string
  eventName: string
}) {
  const cardUrl = `${APP_URL}/i/${cardSlug}`

  await getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your invitation card is ready 🎉`,
    react: React.createElement(OrderConfirmedEmail, { cardUrl, eventName }),
  })
}

export async function sendRSVPNotificationEmail({
  to,
  guestName,
  eventName,
  attending,
  pax,
  cardId,
}: {
  to: string
  guestName: string
  eventName: string
  attending: boolean
  pax: number
  cardId: string
}) {
  const rsvpUrl = `${APP_URL}/dashboard/cards/${cardId}/rsvp`

  await getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${guestName} just RSVPed to your invitation`,
    react: React.createElement(RSVPNotificationEmail, {
      guestName,
      eventName,
      attending,
      pax,
      rsvpUrl,
    }),
  })
}
