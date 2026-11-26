import Link from "next/link"

export const metadata = {
  title: "Jemputan tidak dijumpai — kamy jemput",
}

export default function InvitationNotFound() {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        background: "var(--background)",
      }}
    >
      <div
        style={{
          maxWidth: 460,
          textAlign: "center",
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "40px 28px",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>💌</div>
        <h1
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 32,
            fontWeight: 600,
            color: "var(--primary)",
            margin: "0 0 12px",
            lineHeight: 1.2,
          }}
        >
          Jemputan tidak dijumpai
        </h1>
        <p
          style={{
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 14,
            color: "var(--muted-foreground)",
            lineHeight: 1.6,
            margin: "0 0 28px",
          }}
        >
          Pautan ini tidak sah, atau tuan rumah telah menutup jemputan ini.
          Sila semak semula pautan yang dihantar kepada anda.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 42,
            padding: "0 22px",
            background: "var(--primary)",
            color: "var(--background)",
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Ke laman utama kamy jemput
        </Link>
      </div>
    </div>
  )
}
