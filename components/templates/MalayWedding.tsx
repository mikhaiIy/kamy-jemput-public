import type { LegacyCardData } from "@/lib/types"

export function MalayWedding({
  eventName,
  eventDate,
  eventTime,
  venue,
  venueAddress,
  hostNames,
  coverPhotoUrl,
  additionalMessage,
}: LegacyCardData) {
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("ms-MY", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : ""

  return (
    <div className="min-h-screen bg-[#fdf6ec] font-serif">
      <div
        style={{
          background: "linear-gradient(160deg,#6b2505,#c9984a)",
          padding: "48px 24px 40px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,.7)",
            marginBottom: 16,
          }}
        >
          Majlis Perkahwinan
        </p>
        <h1
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: 36,
            fontWeight: 400,
            color: "#fff",
            margin: "0 0 8px",
          }}
        >
          {eventName || "Nama Pasangan"}
        </h1>
        <div
          style={{
            width: 60,
            height: 1,
            background: "rgba(255,255,255,.4)",
            margin: "0 auto 12px",
          }}
        />
        {eventDate && (
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,.75)",
              letterSpacing: "0.08em",
            }}
          >
            {new Date(eventDate).toLocaleDateString("ms-MY", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      {coverPhotoUrl && (
        <div style={{ width: "100%", height: 220, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverPhotoUrl}
            alt="Cover"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      <div
        style={{
          background: "#fff",
          margin: 20,
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,.06)",
          border: "1px solid #f0e6d0",
        }}
      >
        {hostNames && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: "#9a7a68" }}>Keluarga yang berbahagia</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#3a2010" }}>{hostNames}</p>
          </div>
        )}
        <div
          style={{
            borderTop: "1px solid #f0e6d0",
            paddingTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {[
            { label: "Tarikh", value: formattedDate },
            { label: "Masa", value: eventTime },
            { label: "Tempat", value: venue },
            { label: "Alamat", value: venueAddress },
          ]
            .filter((r) => r.value)
            .map((row) => (
              <div key={row.label}>
                <p
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    color: "#c9984a",
                    margin: "0 0 2px",
                  }}
                >
                  {row.label}
                </p>
                <p style={{ fontSize: 14, color: "#3a2010", margin: 0 }}>{row.value}</p>
              </div>
            ))}
        </div>
      </div>

      {additionalMessage && (
        <div style={{ padding: "0 24px 32px", textAlign: "center" }}>
          <p
            style={{
              fontStyle: "italic",
              fontSize: 14,
              color: "#6a4f3a",
              lineHeight: 1.7,
            }}
          >
            &ldquo;{additionalMessage}&rdquo;
          </p>
        </div>
      )}

      <div
        style={{
          textAlign: "center",
          padding: "24px 0 40px",
          borderTop: "1px solid #f0e6d0",
        }}
      >
        <p style={{ fontSize: 10, color: "#9a8878", letterSpacing: "0.1em" }}>
          kamy jemput
        </p>
      </div>
    </div>
  )
}
