export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-10">
      <div className="mb-8 h-8 w-56 rounded bg-gray-200" />
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="grid grid-cols-4 gap-4 border-b bg-muted px-4 py-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-4 rounded bg-gray-200" />)}
        </div>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="grid grid-cols-4 gap-4 border-b px-4 py-5 last:border-0">
            {Array.from({ length: 4 }, (_, cell) => <div key={cell} className="h-4 rounded bg-muted" />)}
          </div>
        ))}
      </div>
    </div>
  )
}
