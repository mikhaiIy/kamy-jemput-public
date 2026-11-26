import { notFound } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { InvitationCard } from "@/components/InvitationCard"
import { GuestEditWindowNotice } from "@/components/GuestEditWindowNotice"
import { colorsFor } from "@/lib/sections/theme"
import { getCardEventName, isSectionCard, type CardData, type SectionDataMap } from "@/lib/types"
import { loadGuestInvitationBySlug } from "@/lib/public-invitation"

export const dynamic = "force-dynamic"
export const revalidate = 0

function getEventDetails(data: CardData) {
  if (!isSectionCard(data)) {
    return { date: data.eventDate, venue: data.venue }
  }

  const eventInfo = data.sections.find((section) => section.type === "event_info")
  if (eventInfo) {
    const details = eventInfo.data as SectionDataMap["event_info"]
    return { date: details.date, venue: details.venue }
  }

  const landing = data.sections.find((section) => section.type === "landing")
  return { date: (landing?.data as SectionDataMap["landing"] | undefined)?.eventDate, venue: undefined }
}

function formatEventDate(date?: string) {
  if (!date) return undefined

  const parsedDate = new Date(date)
  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString("ms-MY", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const invitation = await loadGuestInvitationBySlug(slug)
  if (!invitation) return { title: { absolute: "Jemputan tidak dijumpai" } }
  if (invitation.state === "editing") {
    return {
      title: invitation.notice,
      description: invitation.notice,
      openGraph: { type: "website", title: invitation.notice, description: invitation.notice },
      twitter: { card: "summary", title: invitation.notice, description: invitation.notice },
    }
  }

  const data = invitation.data as CardData
  const name = getCardEventName(data)
  const { date, venue } = getEventDetails(data)
  const eventDate = formatEventDate(date)
  const descriptionParts = [
    `Anda dijemput ke ${name}`,
    eventDate,
    venue,
  ].filter(Boolean)
  const description = descriptionParts.join(" · ")

  return {
    title: `Jemputan: ${name}`,
    description,
    openGraph: {
      type: "website",
      title: `Jemputan: ${name} — kamy jemput`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `Jemputan: ${name} — kamy jemput`,
      description,
    },
  }
}

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const invitation = await loadGuestInvitationBySlug(slug)
  if (!invitation) notFound()
  if (invitation.state === "editing") {
    return <GuestEditWindowNotice notice={invitation.notice} />
  }

  // RSVP response reads stay on the RLS-aware server client with the prior
  // restricted semantics; nothing about guest visibility changes here.
  const supabase = await createSupabaseServerClient()

  const cardData = invitation.data as CardData

  const { data: rsvpData } = await supabase
    .from("rsvp_responses")
    .select("id, card_id, publication_id, guest_name, guest_contact, attending, pax, message, created_at")
    .eq("card_id", invitation.cardId)
    .eq("publication_id", invitation.publicationId)
    .order("created_at", { ascending: false })

  // Frame the card in a centered, phone-width column so it doesn't stretch to
  // fill a wide desktop browser. The surrounding gutter is a slightly darkened
  // tint of the card's own background, with a soft shadow separating the column
  // — same idea as the editor's "Lebar" live preview. On mobile the column is
  // full width, so recipients on phones see the card edge-to-edge as before.
  const c = isSectionCard(cardData) ? colorsFor(cardData.theme) : null
  const gutterBg = c
    ? `linear-gradient(rgba(0,0,0,0.06), rgba(0,0,0,0.06)), ${c.bg}`
    : "#e9e4db"

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        background: gutterBg,
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          position: "relative",
          boxShadow: "0 0 80px rgba(0,0,0,0.13)",
          borderLeft: "1px solid rgba(0,0,0,0.05)",
          borderRight: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <InvitationCard
          cardId={invitation.cardId}
          userId={invitation.userId}
          data={cardData}
          rsvpResponses={rsvpData || []}
          publicationId={invitation.publicationId}
        />
      </div>
    </div>
  )
}
