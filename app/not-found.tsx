import Link from "next/link"
import { KamyLogo } from "@/components/KamyLogo"

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: "var(--background)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
        <KamyLogo size="md" />
        <div
          style={{
            marginTop: 32,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "48px 32px",
            boxShadow: "0 16px 40px color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "var(--accent)",
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.16em",
            }}
          >
            404
          </p>
          <h1
            style={{
              margin: "0 0 12px",
              color: "var(--primary)",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: 42,
              fontWeight: 600,
              lineHeight: 1.1,
            }}
          >
            Halaman tidak dijumpai
          </h1>
          <p style={{ margin: "0 0 28px", color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.7 }}>
            Maaf, halaman yang anda cari mungkin telah dipindahkan atau pautannya tidak lagi sah.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 42,
              padding: "0 22px",
              borderRadius: 8,
              background: "var(--primary)",
              color: "var(--background)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Kembali ke laman utama
          </Link>
        </div>
      </div>
    </main>
  )
}
