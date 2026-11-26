import * as React from "react"

interface OrderConfirmedEmailProps {
  cardUrl: string
  eventName: string
}

export function OrderConfirmedEmail({ cardUrl, eventName }: OrderConfirmedEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ background: "#2c1a4a", padding: "32px", textAlign: "center" }}>
        <h1 style={{ color: "white", margin: 0, fontSize: "24px" }}>Your invitation is ready! 🎉</h1>
      </div>
      <div style={{ padding: "32px", background: "#ffffff" }}>
        <p style={{ fontSize: "16px", color: "#374151" }}>
          Great news! Your digital invitation card for <strong>{eventName}</strong> has been published and is
          ready to share with your guests.
        </p>
        <div style={{ textAlign: "center", margin: "32px 0" }}>
          <a
            href={cardUrl}
            style={{
              background: "#2c1a4a",
              color: "white",
              padding: "14px 28px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            View Your Invitation Card
          </a>
        </div>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          Share this link with your guests:
          <br />
          <a href={cardUrl} style={{ color: "#2c1a4a" }}>
            {cardUrl}
          </a>
        </p>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          You can track RSVPs from your dashboard. We&apos;ll also send you a notification each time a guest
          responds.
        </p>
      </div>
      <div style={{ background: "#f9fafb", padding: "16px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
          © {new Date().getFullYear()} Kamy Jemput. All rights reserved.
        </p>
      </div>
    </div>
  )
}
