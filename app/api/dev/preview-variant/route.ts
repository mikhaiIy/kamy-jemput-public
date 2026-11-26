import type { NextRequest } from "next/server"

// Historical dev-only endpoint. It is intentionally a read/write dead end:
// even a non-production request must not mutate cards.custom_data or the
// current immutable publication. Use a local fixture or the editor preview
// surface when experimenting with a variant.
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "not available in production" }, { status: 404 })
  }
  void request
  return Response.json(
    { error: "dev variant mutation is disabled for protected invitation data" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  )
}
