import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type Body = {
  eventType?: string
  brief?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  budgetBand?: string
  referenceLinks?: string
}

const ALLOWED_EVENT_TYPES = new Set([
  "wedding_malay",
  "wedding_chinese",
  "wedding_indian",
  "wedding_general",
  "open_house",
  "engagement",
  "aqiqah",
  "birthday",
  "anniversary",
  "khenduri",
  "corporate",
  "other",
])

const ALLOWED_BUDGETS = new Set(["under_100", "100_300", "300_700", "above_700"])

export async function POST(request: Request) {
  let body: Body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Minimal validation. The form already enforces required + types client-side;
  // this is the server backstop.
  if (
    !body.eventType ||
    !ALLOWED_EVENT_TYPES.has(body.eventType) ||
    !body.brief ||
    body.brief.trim().length < 10 ||
    !body.contactName ||
    !body.contactName.trim() ||
    !body.contactPhone ||
    !body.contactPhone.trim()
  ) {
    return Response.json({ error: "Maklumat tidak lengkap" }, { status: 400 })
  }
  if (body.budgetBand && !ALLOWED_BUDGETS.has(body.budgetBand)) {
    return Response.json({ error: "Invalid budget band" }, { status: 400 })
  }

  // Optionally bind to a logged-in user — not required to submit.
  let userId: string | null = null
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    /* keep userId null for anonymous submission */
  }

  const { error } = await supabaseAdmin.from("custom_orders").insert({
    user_id: userId,
    event_type: body.eventType,
    brief: body.brief.trim(),
    contact_name: body.contactName.trim(),
    contact_phone: body.contactPhone.trim(),
    contact_email: body.contactEmail?.trim() || null,
    budget_band: body.budgetBand || null,
    reference_links: body.referenceLinks?.trim() || null,
    status: "new",
  })

  if (error) {
    console.error("Custom order insert failed:", error)
    return Response.json({ error: "Gagal menyimpan tempahan" }, { status: 500 })
  }

  return Response.json({ ok: true })
}
