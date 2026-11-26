export default function InvitationLoading() {
  return (
    <div
      aria-label="Memuatkan jemputan"
      role="status"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(110deg, var(--background) 25%, var(--secondary) 50%, var(--background) 75%)",
        backgroundSize: "200% 100%",
        animation: "invite-shimmer 1.8s ease-in-out infinite",
      }}
    >
      <style>{`@keyframes invite-shimmer { to { background-position: -200% 0; } }`}</style>
    </div>
  )
}
