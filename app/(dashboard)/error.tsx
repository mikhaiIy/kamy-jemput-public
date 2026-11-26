"use client"

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, background: "var(--background)" }}>
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <p style={{ margin: "0 0 8px", color: "var(--accent)", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em" }}>
          TERDAPAT GANGGUAN
        </p>
        <h1 style={{ margin: 0, color: "var(--primary)", fontFamily: "var(--font-cormorant), serif", fontSize: 36, fontWeight: 600 }}>
          Dashboard tidak dapat dimuatkan
        </h1>
        <p style={{ margin: "12px 0 0", color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.7 }}>
          Kami tidak dapat memuatkan maklumat anda buat masa ini. Sila cuba semula.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: 28, border: 0, borderRadius: 8, padding: "12px 20px", background: "var(--primary)", color: "var(--background)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Cuba semula
        </button>
      </div>
    </div>
  )
}
