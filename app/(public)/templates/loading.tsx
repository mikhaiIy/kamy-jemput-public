export default function TemplatesLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-12">
      <div className="h-10 w-56 rounded bg-[var(--border)]" />
      <div className="mt-3 h-5 w-80 max-w-full rounded bg-[#f0e9df]" />
      <div className="mt-9 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <div className="aspect-[4/3] bg-[#f0e9df]" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/5 rounded bg-[var(--border)]" />
              <div className="h-4 w-full rounded bg-[#f0e9df]" />
              <div className="h-4 w-2/3 rounded bg-[#f0e9df]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
