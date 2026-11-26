import * as React from "react"

interface RSVPNotificationEmailProps {
  guestName: string
  eventName: string
  attending: boolean
  pax: number
  rsvpUrl: string
}

export function RSVPNotificationEmail({
  guestName,
  eventName,
  attending,
  pax,
  rsvpUrl,
}: RSVPNotificationEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ background: "#2c1a4a", padding: "32px", textAlign: "center" }}>
        <h1 style={{ color: "white", margin: 0, fontSize: "24px" }}>New RSVP Response</h1>
      </div>
      <div style={{ padding: "32px", background: "#ffffff" }}>
        <p style={{ fontSize: "16px", color: "#374151" }}>
          <strong>{guestName}</strong> has responded to your invitation for <strong>{eventName}</strong>.
        </p>
        <div
          style={{
            background: attending ? "#dcfce7" : "#fee2e2",
            border: `1px solid ${attending ? "#16a34a" : "#dc2626"}`,
            borderRadius: "8px",
            padding: "16px",
            margin: "16px 0",
          }}
        >
          <p style={{ margin: 0, fontSize: "16px", color: attending ? "#15803d" : "#b91c1c" }}>
            <strong>{attending ? "✅ Will Attend" : "❌ Cannot Attend"}</strong>
            {attending && ` — ${pax} ${pax === 1 ? "person" : "people"}`}
          </p>
        </div>
        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <a
            href={rsvpUrl}
            style={{
              background: "#2c1a4a",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            View All RSVPs
          </a>
        </div>
      </div>
      <div style={{ background: "#f9fafb", padding: "16px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
          © {new Date().getFullYear()} Kamy Jemput. All rights reserved.
        </p>
      </div>
    </div>
  )
}
