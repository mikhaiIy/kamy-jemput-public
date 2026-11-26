export function GuestEditWindowNotice({ notice }: { notice: string }) {
  return (
    <main
      aria-live="polite"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 20px",
        background: "var(--background)",
        color: "var(--primary)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          maxWidth: 360,
          margin: 0,
          fontFamily: "var(--font-cormorant), Georgia, serif",
          fontSize: "clamp(28px, 7vw, 42px)",
          lineHeight: 1.12,
        }}
      >
        {notice}
      </p>
    </main>
  )
}
