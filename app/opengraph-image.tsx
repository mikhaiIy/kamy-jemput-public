import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "kamy jemput — Jemputan Digital yang Indah"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#2c1a4a",
          color: "#faf8f4",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "2px solid #c9984a",
            height: 430,
            position: "absolute",
            width: 1000,
          }}
        />
        <div style={{ color: "#c9984a", fontSize: 26, letterSpacing: "0.34em", textTransform: "uppercase" }}>
          jemputan digital
        </div>
        <div style={{ fontFamily: "serif", fontSize: 96, fontStyle: "italic", marginTop: 24 }}>
          kamy jemput
        </div>
        <div style={{ background: "#c9984a", height: 2, marginTop: 32, width: 180 }} />
        <div style={{ fontSize: 28, letterSpacing: "0.08em", marginTop: 28 }}>
          Dibuat dengan penuh kasih di Malaysia
        </div>
      </div>
    ),
    size
  )
}
