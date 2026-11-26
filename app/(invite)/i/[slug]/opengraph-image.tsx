import { ImageResponse } from "next/og"
import { getCardEventName, isSectionCard, type CardData, type SectionDataMap } from "@/lib/types"
import { loadGuestInvitationBySlug } from "@/lib/public-invitation"

export const runtime = "edge"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const alt = "Jemputan digital oleh kamy jemput"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

function getEventDate(data: CardData) {
  if (!isSectionCard(data)) return data.eventDate

  const eventInfo = data.sections.find((section) => section.type === "event_info")
  if (eventInfo) return (eventInfo.data as SectionDataMap["event_info"]).date

  const landing = data.sections.find((section) => section.type === "landing")
  return (landing?.data as SectionDataMap["landing"] | undefined)?.eventDate
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

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // The OG surface must use the same current-publication selector as the page,
  // metadata, RSVP and asset route. This also fails closed for disabled cards,
  // expired/corrupt windows and missing current pointers.
  const invitation = await loadGuestInvitationBySlug(slug)
  const cardData: CardData | undefined = invitation?.state === "published"
    ? invitation.data
    : undefined
  const editNotice = invitation?.state === "editing" ? invitation.notice : undefined
  const isEditing = invitation?.state === "editing"
  const isMissing = !invitation
  const eventName = cardData ? getCardEventName(cardData) : editNotice || "kamy jemput"
  const eventDate = cardData ? formatEventDate(getEventDate(cardData)) : undefined

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: isMissing || isEditing ? "#2c1a4a" : "#faf8f4",
          color: isMissing || isEditing ? "#faf8f4" : "#2c1a4a",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "72px 110px",
          position: "relative",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", background: "#c9984a", height: 18, left: 0, position: "absolute", top: 0, width: "100%" }} />
        <div style={{ display: "flex", color: "#c9984a", fontSize: 24, letterSpacing: "0.3em", textTransform: "uppercase" }}>
          {isMissing ? "jemputan digital" : isEditing ? "kamy jemput" : "anda dijemput"}
        </div>
        <div style={{ display: "flex", fontFamily: "serif", fontSize: isEditing ? 50 : 76, lineHeight: 1.08, marginTop: 28 }}>
          {eventName}
        </div>
        {eventDate && <div style={{ display: "flex", color: "#725f50", fontSize: 32, marginTop: 32 }}>{eventDate}</div>}
        <div style={{ display: "flex", justifyContent: "center", borderTop: "2px solid #c9984a", marginTop: 44, paddingTop: 24, width: 360 }}>
          <div style={{ display: "flex", color: isMissing || isEditing ? "#faf8f4" : "#2c1a4a", fontFamily: "serif", fontSize: 34, fontStyle: "italic" }}>kamy jemput</div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  )
}
