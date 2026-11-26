export function EditWindowLockedNotice({
  expiresAt,
  reason = "Tetingkap suntingan telah tamat.",
}: {
  expiresAt?: string | null
  reason?: string
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-12 text-[var(--primary)]">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-white p-7 shadow-sm sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Suntingan terkawal
        </p>
        <h1 className="mt-3 font-[var(--font-cormorant)] text-4xl leading-tight">
          Jemputan dikunci buat sementara
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#6d5d50]">{reason}</p>
        {expiresAt && (
          <p className="mt-3 text-xs text-[#8b7868]">
            Tarikh tamat: {new Date(expiresAt).toLocaleString("ms-MY", {
              timeZone: "Asia/Kuala_Lumpur",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
        <p className="mt-6 border-t border-[#eee7dd] pt-5 text-sm leading-6 text-[#6d5d50]">
          Hubungi sokongan untuk meminta pentadbir membuka tetingkap baharu.
          Draf yang belum diterbitkan kekal tersimpan.
        </p>
      </section>
    </main>
  )
}
