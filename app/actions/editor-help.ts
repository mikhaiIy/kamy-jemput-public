"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type EditorHelpActionResult = { ok: true } | { ok: false; error: string }

/**
 * Marks the Section editor help tour as completed for the signed-in account
 * by stamping `users.section_editor_tour_completed_at` (migration 017).
 *
 * Deliberately isolated from the draft pipeline: this action accepts no card
 * id and no draft payload, never reads or writes any `cards` data, and does
 * not revalidate anything — the Section editor's draft save path
 * (`PATCH /api/cards/[id]/draft`) is untouched by tour interactions. This is
 * the sole completion persistence path for the tour.
 *
 * Idempotent: the timestamp is only written while it is still NULL, so
 * repeated finish/dismiss/replay completions never reset the original
 * completion time. The service-role client is used because migration 016
 * intentionally revokes direct client writes to `public.users`; the RLS-aware
 * session check above scopes the write to the caller's own row.
 */
export async function completeSectionEditorTourAction(): Promise<EditorHelpActionResult> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const { count, error } = await supabaseAdmin
    .from("users")
    .update(
      { section_editor_tour_completed_at: new Date().toISOString() },
      { count: "exact" }
    )
    .eq("id", user.id)
    .is("section_editor_tour_completed_at", null)
    .select("id")

  if (error) return { ok: false, error: error.message }

  // One row updated: the marker was just stamped for this account.
  if (count === 1) return { ok: true }

  // Zero rows with no error means the NULL-only predicate matched nothing:
  // either the marker is already set (expected idempotent replay — success)
  // or the caller has no public user profile row at all (failure).
  const { count: existing, error: selectError } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("id", user.id)

  if (selectError) return { ok: false, error: selectError.message }
  if ((existing ?? 0) >= 1) return { ok: true }
  return { ok: false, error: "User profile row not found" }
}
