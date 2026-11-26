"use client"

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center bg-background px-6 py-16">
      <div className="max-w-md text-center">
        <p className="mb-2 text-xs font-bold tracking-[0.16em] text-accent">
          RALAT SISTEM
        </p>
        <h1 className="text-3xl font-semibold text-primary">
          Halaman admin tidak dapat dimuatkan
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sila cuba semula untuk memuatkan data terkini.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Cuba semula
        </button>
      </div>
    </div>
  )
}
