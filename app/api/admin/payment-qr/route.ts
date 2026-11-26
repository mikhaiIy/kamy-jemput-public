import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { normalizePaymentQr } from "@/lib/payment-qr"

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Sila log masuk." }, { status: 401 })
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin")
    return Response.json({ error: "Tidak dibenarkan." }, { status: 403 })
  try {
    const reader = request.body?.getReader()
    if (!reader) throw new Error("Borang tidak lengkap.")
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.length
      if (total > 5 * 1024 * 1024 + 65536) {
        await reader.cancel()
        return Response.json(
          { error: "Saiz maksimum imej ialah 5 MB." },
          { status: 413 },
        )
      }
      chunks.push(value)
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData()
    const method = form.get("method")
    if (method !== "bank" && method !== "tng")
      throw new Error("Kaedah tidak sah.")
    const payee = String(form.get("payee") ?? "").trim()
    const provider =
      method === "tng"
        ? "Touch ’n Go"
        : String(form.get("provider") ?? "").trim()
    const instructions = String(form.get("instructions") ?? "").trim()
    const enabled = form.get("enabled") === "on"
    if (
      payee.length > 120 ||
      provider.length > 120 ||
      instructions.length > 2000 ||
      (enabled && (!payee || !provider))
    )
      throw new Error(
        "Lengkapkan nama penerima dan bank sebelum mengaktifkan bayaran.",
      )
    const query =
      method === "bank"
        ? supabaseAdmin
            .from("duitnow_payment_slots")
            .select("*")
            .eq("slot_number", 1)
        : supabaseAdmin.from("tng_payment_config").select("*").eq("id", true)
    const { data: current, error: readError } = await query.single()
    if (readError || !current)
      throw new Error("Tetapan tidak dapat dimuatkan. Cuba semula.")
    let qr = current.qr_image_url as string
    const file = form.get("image")
    if (file instanceof File && file.size > 0) {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const { png, key } = await normalizePaymentQr(bytes)
      const bucket = supabaseAdmin.storage.from("payment-qr")
      const { error: uploadError } = await bucket.upload(key, png, {
        contentType: "image/png",
        upsert: false,
      })
      if (uploadError) {
        const { data: previous, error } = await bucket.download(key)
        if (
          error ||
          !previous ||
          !Buffer.from(await previous.arrayBuffer()).equals(png)
        )
          throw new Error("Muat naik imej gagal. Cuba semula.")
      }
      qr = `/api/payment-qr/${key}`
    }
    if (enabled && !qr)
      throw new Error("Muat naik imej QR sebelum mengaktifkan bayaran.")
    // Replay of a successfully saved form is a no-op; files use content hashes.
    const unchanged =
      current.enabled === enabled &&
      current.payee_name === payee &&
      current.qr_image_url === qr &&
      current.instructions === instructions &&
      (method === "tng" || current.provider === provider)
    if (!unchanged) {
      const { error } =
        method === "bank"
          ? await supabaseAdmin.rpc("admin_update_duitnow_slot", {
              p_admin_id: user.id,
              p_slot_number: 1,
              p_enabled: enabled,
              p_label: "Bank",
              p_payee_name: payee,
              p_provider: provider,
              p_qr_image_url: qr,
              p_instructions: instructions,
            })
          : await supabaseAdmin.rpc("configure_tng", {
              p_admin: user.id,
              p_enabled: enabled,
              p_payee: payee,
              p_qr: qr,
              p_instructions: instructions,
            })
      if (error) throw new Error("Tetapan gagal disimpan. Cuba semula.")
    }
    revalidatePath("/admin/settings/qr")
    revalidatePath("/admin/payments")
    return Response.json({ qr, message: "Tetapan bayaran disimpan." })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && !error.message.includes("Input")
            ? error.message
            : "Imej tidak dapat dibaca. Gunakan JPG, PNG atau WebP yang sah.",
      },
      { status: 400 },
    )
  }
}
