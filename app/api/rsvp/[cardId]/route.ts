import { supabaseAdmin } from "@/lib/supabase/admin"
import { sendRSVPNotificationEmail } from "@/lib/resend"
import { loadGuestInvitationByCardId } from "@/lib/public-invitation"
import { getCardEventName } from "@/lib/types"
import type { NextRequest } from "next/server"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await ctx.params

  let body: {
    guestName: string
    guestContact?: string
    attending: boolean
    pax?: number
    message?: string
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { guestName, guestContact, attending, pax = 1, message } = body

  if (!guestName || typeof attending !== "boolean") {
    return Response.json({ error: "guestName and attending are required" }, { status: 400 })
  }

  // Use the same current-publication boundary as the invitation page. A
  // private edit window never reaches this point, so it cannot accept or
  // broadcast guestbook data while the old publication is hidden.
  const invitation = await loadGuestInvitationByCardId(cardId)
  if (!invitation || invitation.state !== "published") {
    return Response.json(
      { error: "Card not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    )
  }

  // Insert RSVP
  const createdAt = new Date().toISOString()
  const { error: rsvpError } = await supabaseAdmin.from("rsvp_responses").insert({
    card_id: cardId,
    publication_id: invitation.publicationId,
    guest_name: guestName,
    guest_contact: guestContact || null,
    attending,
    pax,
    message: message || null,
  })

  if (rsvpError) {
    console.error("RSVP insert error:", rsvpError)
    return Response.json({ error: "Failed to save RSVP" }, { status: 500 })
  }

  // Re-read the current pointer after the committed insert. The database
  // trigger serializes the insert with publication/disable transitions; this
  // second boundary check prevents a response that was committed just before a
  // transition from being broadcast into a stale guestbook channel.
  const currentInvitation = await loadGuestInvitationByCardId(cardId)
  const stillCurrent =
    currentInvitation?.state === "published" &&
    currentInvitation.publicationId === invitation.publicationId

  // Broadcast the wish to any open /i/[slug] page so the guestbook marquee
  // animates the new ucapan in without a reload. Broadcast (not Postgres
  // Changes) so RLS on rsvp_responses stays restrictive. Fire-and-forget —
  // a failure here must not fail the RSVP submission.
  if (stillCurrent && message && message.trim().length > 0) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceKey) {
      fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              topic: `wishes:${cardId}:${invitation.publicationId}`,
              event: "new_wish",
              payload: {
                publicationId: invitation.publicationId,
                guestName,
                message,
                createdAt,
              },
            },
          ],
        }),
      }).catch((err) => {
        console.error("Wishes broadcast failed:", err)
      })
    }
  }

  // Send email notification to card owner (non-blocking)
  if (invitation.userId) {
    try {
      const { data: owner } = await supabaseAdmin
        .from("users")
        .select("email")
        .eq("id", invitation.userId)
        .single()

      if (owner?.email) {
        const eventName = getCardEventName(invitation.data) || "your event"
        await sendRSVPNotificationEmail({
          to: owner.email,
          guestName,
          eventName,
          attending,
          pax,
          cardId,
        })
      }
    } catch (err) {
      console.error("RSVP email notification failed:", err)
      // Non-fatal — don't fail the request
    }
  }

  return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
}
