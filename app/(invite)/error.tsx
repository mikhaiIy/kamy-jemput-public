"use client"

export default function InviteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--background)" }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>💌</div>
        <h1 style={{ margin: 0, color: "var(--primary)", fontFamily: "var(--font-cormorant), serif", fontSize: 34, fontWeight: 600 }}>
          Jemputan tidak dapat dibuka
        </h1>
        <p style={{ margin: "12px 0 0", color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.7 }}>
          Sila cuba semula sebentar lagi atau semak pautan jemputan anda.
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
