import type { LegacyCardData } from "@/lib/types"

export function ChineseWedding({
  eventName,
  eventDate,
  eventTime,
  venue,
  venueAddress,
  hostNames,
  brideName,
  groomName,
  additionalMessage,
}: LegacyCardData) {
  return (
    <div className="min-h-screen" style={{ background: "#8b0000", fontFamily: "serif", color: "#f5d060" }}>
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 16 }}>囍</div>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(245,208,96,.6)",
            marginBottom: 10,
          }}
        >
          Wedding Invitation · 喜帖
        </p>
        <h1
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: 32,
            fontWeight: 400,
            color: "#f5d060",
            margin: "0 0 6px",
          }}
        >
          {brideName || eventName?.split("&")?.[0]?.trim() || "Pengantin"} ❤{" "}
          {groomName || eventName?.split("&")?.[1]?.trim() || "Pengantin"}
        </h1>
        {eventName && (
          <p style={{ fontSize: 13, color: "rgba(245,208,96,.6)", letterSpacing: "0.06em" }}>
            {eventName}
          </p>
        )}
        {eventDate && (
          <p
            style={{
              fontSize: 12,
              color: "rgba(245,208,96,.5)",
              marginTop: 10,
              letterSpacing: "0.12em",
            }}
          >
            {new Date(eventDate).toLocaleDateString("en-MY", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 24px",
        }}
      >
        <div style={{ flex: 1, height: 1, background: "rgba(245,208,96,.3)" }} />
        <span style={{ color: "#f5d060", fontSize: 14 }}>❧</span>
        <div style={{ flex: 1, height: 1, background: "rgba(245,208,96,.3)" }} />
      </div>

      <div
        style={{
          margin: "20px",
          background: "rgba(139,0,0,.6)",
          border: "1px solid rgba(245,208,96,.2)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        {hostNames && (
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "rgba(245,208,96,.5)" }}>双方家长敬邀</p>
            <p style={{ fontSize: 13, color: "#f5d060", marginTop: 4 }}>{hostNames}</p>
          </div>
        )}
        {[
          {
            label: "日期 Tarikh",
            value: eventDate
              ? new Date(eventDate).toLocaleDateString("en-MY", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "",
          },
          { label: "时间 Masa", value: eventTime },
          { label: "地点 Tempat", value: venue },
          { label: "地址 Alamat", value: venueAddress },
        ]
          .filter((r) => r.value)
          .map((row, i, arr) => (
            <div
              key={row.label}
              style={{
                paddingBottom: i < arr.length - 1 ? 12 : 0,
                marginBottom: i < arr.length - 1 ? 12 : 0,
                borderBottom:
                  i < arr.length - 1 ? "1px solid rgba(245,208,96,.12)" : "none",
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: "0.15em",
                  color: "rgba(245,208,96,.5)",
                  margin: "0 0 2px",
                }}
              >
                {row.label}
              </p>
              <p style={{ fontSize: 14, color: "#f5d060", margin: 0 }}>{row.value}</p>
            </div>
          ))}
      </div>

      {additionalMessage && (
        <div style={{ padding: "12px 24px 28px", textAlign: "center" }}>
          <p
            style={{
              fontStyle: "italic",
              fontSize: 13,
              color: "rgba(245,208,96,.75)",
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
          borderTop: "1px solid rgba(245,208,96,.15)",
        }}
      >
        <div style={{ fontSize: 28, color: "rgba(245,208,96,.5)" }}>囍</div>
        <p
          style={{
            fontSize: 10,
            color: "rgba(245,208,96,.25)",
            letterSpacing: "0.1em",
            marginTop: 4,
          }}
        >
          kamy jemput
        </p>
      </div>
    </div>
  )
}
