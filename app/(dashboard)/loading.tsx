export default function DashboardLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }} className="animate-pulse">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ width: 220, height: 40, borderRadius: 8, background: "var(--border)" }} />
            <div style={{ width: 170, height: 16, borderRadius: 6, background: "#f0e9df" }} />
          </div>
          <div style={{ width: 150, height: 40, borderRadius: 8, background: "var(--border)" }} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" style={{ marginBottom: 32 }}>
          {Array.from({ length: 3 }, (_, index) => <div key={index} style={{ height: 112, border: "1px solid var(--border)", borderRadius: 14, background: "#fff" }} />)}
        </div>
        <div style={{ height: 260, border: "1px solid var(--border)", borderRadius: 14, background: "#fff" }} />
      </div>
    </div>
  )
}
