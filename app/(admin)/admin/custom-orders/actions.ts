"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

const ALLOWED_STATUS = new Set([
  "new",
  "in_review",
  "quoted",
  "closed_won",
  "closed_lost",
])

export async function updateCustomOrderAction(
  id: string,
  patch: { status: string; adminNotes: string }
) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Admin role check.
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin") {
    throw new Error("Forbidden")
  }

  if (!ALLOWED_STATUS.has(patch.status)) {
    throw new Error("Invalid status")
  }

  const { error } = await supabaseAdmin
    .from("custom_orders")
    .update({
      status: patch.status,
      admin_notes: patch.adminNotes || null,
    })
    .eq("id", id)

  if (error) throw error

  revalidatePath("/admin/custom-orders")
}
