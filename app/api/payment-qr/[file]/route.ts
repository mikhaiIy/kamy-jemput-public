import { supabaseAdmin } from "@/lib/supabase/admin"

// Merchant payment artwork is intentionally readable by customers. This route
// cannot read receipt objects, arbitrary buckets or user-provided paths.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params
  if (!/^[a-f0-9]{64}\.png$/.test(file))
    return new Response(null, { status: 404 })
  const { data, error } = await supabaseAdmin.storage
    .from("payment-qr")
    .download(file)
  if (error || !data) return new Response(null, { status: 404 })
  return new Response(data, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
