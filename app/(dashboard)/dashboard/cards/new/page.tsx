import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createDraftCardAction } from "@/app/actions/order"

export const metadata = {
  title: "Sesuaikan Kad — kamy jemput",
}

export default async function NewCardPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const { template: templateId } = await searchParams

  if (!templateId) {
    redirect("/templates")
  }

  const supabase = await createSupabaseServerClient()

  const { data: template } = await supabase
    .from("templates")
    .select("id, type, theme, sections")
    .eq("id", templateId)
    .eq("is_active", true)
    .single()

  if (!template) {
    redirect("/templates")
  }

  // Every active template is Section-v2 since migration 009. If a template
  // row lacks v2 fields it's a misconfiguration — fail closed.
  if (!template.type || !template.theme || !template.sections) {
    redirect("/templates")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirectTo=/dashboard/cards/new?template=${templateId}`)
  }

  // Reuse an existing unpaid draft. Besides refreshes, Next may prefetch this
  // route, so creating immediately on every GET would leave duplicate orders.
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", user.id)
    .eq("template_id", templateId)
    .eq("status", "pending")

  if (pendingOrders?.length) {
    const { data: existingCard } = await supabase
      .from("cards")
      .select("id")
      .eq("user_id", user.id)
      .eq("template_id", templateId)
      .eq("is_published", false)
      .in(
        "order_id",
        pendingOrders.map((order) => order.id)
      )
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (existingCard) {
      redirect(`/dashboard/cards/${existingCard.id}/edit`)
    }
  }

  // Create the draft card up front so the editor has a stable cardId for
  // image uploads and DB-backed draft auto-save before payment.
  const { cardId } = await createDraftCardAction(templateId)
  redirect(`/dashboard/cards/${cardId}/edit`)
}
