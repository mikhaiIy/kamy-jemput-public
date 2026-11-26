import "server-only"

import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  selectGuestInvitation,
  type GuestInvitation,
  type GuestInvitationRow,
} from "@/lib/public-invitation-decision"
import type { CardData } from "@/lib/types"

export type {
  EditingGuestInvitation,
  GuestInvitation,
  PublishedGuestInvitation,
} from "@/lib/public-invitation-decision"

type GuestCardRow = GuestInvitationRow & {
  orders: { status: string } | { status: string }[]
}

function isPaid(row: GuestCardRow): boolean {
  const orders = Array.isArray(row.orders) ? row.orders : [row.orders]
  return orders.some((order) => order?.status === "paid")
}

async function loadBy(
  column: "slug" | "id",
  value: string,
): Promise<GuestInvitation | null> {
  const { data: row, error } = await supabaseAdmin
    .from("cards")
    .select(
      "id, user_id, slug, is_published, published_at, current_publication_id, active_edit_window_id, orders!inner(status)",
    )
    .eq(column, value)
    .eq("orders.status", "paid")
    .maybeSingle<GuestCardRow>()

  if (error || !row || !isPaid(row)) return null

  // Retirement is a terminal fact separate from availability. Check it
  // before loading snapshots or owner/profile data so an old predecessor URL
  // can only reach the generic unavailable boundary.
  const { data: retirement, error: retirementError } = await supabaseAdmin
    .from("card_replacement_cutovers")
    .select("id")
    .eq("predecessor_card_id", row.id)
    .maybeSingle()
  if (retirementError || retirement) return null

  const { data: availability, error: availabilityError } = await supabaseAdmin
    .from("card_availability_actions")
    .select("action")
    .eq("card_id", row.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<{ action: string }>()

  if (availabilityError || availability?.action === "disabled") return null

  let publication: { id: string; snapshot: CardData } | null = null
  let editWindow: { expires_at: string } | null = null
  let profileName: string | null = null

  if (
    row.is_published &&
    row.published_at &&
    row.current_publication_id &&
    !row.active_edit_window_id
  ) {
    const { data, error: publicationError } = await supabaseAdmin
      .from("card_publications")
      .select("id, snapshot")
      .eq("id", row.current_publication_id)
      .eq("card_id", row.id)
      .maybeSingle<{ id: string; snapshot: CardData }>()

    if (publicationError || !data || !data.snapshot) return null
    publication = data
  }

  // Never select a snapshot for the private state. This is the boundary that
  // prevents old event details from entering HTML/RSC/metadata/OG/RSVP data.
  if (!row.is_published && row.published_at && row.active_edit_window_id) {
    const { data: window, error: windowError } = await supabaseAdmin
      .from("card_edit_windows")
      .select("expires_at")
      .eq("id", row.active_edit_window_id)
      .eq("card_id", row.id)
      .maybeSingle<{ expires_at: string }>()
    if (windowError || !window?.expires_at || !row.user_id) return null

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("name")
      .eq("id", row.user_id)
      .maybeSingle<{ name: string | null }>()
    if (profileError) return null

    editWindow = window
    profileName = profile?.name ?? null
  }

  return selectGuestInvitation({
    row,
    isPaid: isPaid(row),
    availabilityAction: availability?.action ?? null,
    publication,
    editWindow,
    profileName,
  })
}

export function loadGuestInvitationBySlug(slug: string) {
  return loadBy("slug", slug)
}

export function loadGuestInvitationByCardId(cardId: string) {
  return loadBy("id", cardId)
}
