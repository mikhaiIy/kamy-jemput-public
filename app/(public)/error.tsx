"use client"

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[var(--background)] px-6 py-16">
      <div className="max-w-md text-center">
        <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[var(--accent)]">TERDAPAT GANGGUAN</p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-semibold text-[var(--primary)]">
          Maaf, ada yang tidak kena
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
          Sila cuba semula. Jika masalah berterusan, kembali ke laman utama dan cuba lagi kemudian.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
        >
          Cuba semula
        </button>
      </div>
    </div>
  )
}
