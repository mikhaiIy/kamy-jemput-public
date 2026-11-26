"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function adminDeleteCardAction(
  cardId: string,
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Sila log masuk semula." }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin")
    return { error: "Anda tidak dibenarkan melakukan tindakan ini." }

  const { error } = await supabaseAdmin.from("cards").delete().eq("id", cardId)
  if (error)
    return {
      error:
        "Jemputan ini tidak dapat dipadamkan. Rekod bayaran, resit atau penerbitan yang dilindungi perlu dikekalkan.",
    }

  revalidatePath("/admin/cards")
  revalidatePath("/admin/orders")
  redirect("/admin/cards")
}
