import { guestEditingNotice, safeCustomerDisplayName } from "@/lib/guest-visibility"
import type { CardData } from "@/lib/types"

export type GuestInvitationRow = {
  id: string
  user_id: string | null
  slug: string
  is_published: boolean
  published_at: string | null
  current_publication_id: string | null
  active_edit_window_id: string | null
  /** A completed replacement cutover makes the predecessor terminal/private. */
  is_retired?: boolean
}

export type PublishedGuestInvitation = {
  state: "published"
  cardId: string
  userId: string | null
  slug: string
  publicationId: string
  data: CardData
}

export type EditingGuestInvitation = {
  state: "editing"
  cardId: string
  userId: string | null
  slug: string
  customerName: string
  notice: string
  expiresAt: string
  expired: boolean
}

export type GuestInvitation = PublishedGuestInvitation | EditingGuestInvitation

export type GuestInvitationDecisionInput = {
  row: GuestInvitationRow
  isPaid: boolean
  availabilityAction: string | null
  publication: { id: string; snapshot: CardData } | null
  editWindow: { expires_at: string } | null
  profileName: string | null
  now?: number
}

/**
 * Runtime-neutral visibility boundary shared by page, metadata, OG, RSVP and
 * asset callers. It never receives a private draft or historical snapshot.
 */
export function selectGuestInvitation({
  row,
  isPaid,
  availabilityAction,
  publication,
  editWindow,
  profileName,
  now = Date.now(),
}: GuestInvitationDecisionInput): GuestInvitation | null {
  if (row.is_retired) return null
  if (!isPaid || availabilityAction === "disabled") return null

  if (
    row.is_published &&
    row.published_at &&
    row.current_publication_id &&
    !row.active_edit_window_id
  ) {
    if (!publication || publication.id !== row.current_publication_id || !publication.snapshot) return null
    return {
      state: "published",
      cardId: row.id,
      userId: row.user_id,
      slug: row.slug,
      publicationId: publication.id,
      data: publication.snapshot,
    }
  }

  if (!row.is_published && row.published_at && row.active_edit_window_id) {
    if (!editWindow?.expires_at || !row.user_id) return null
    const customerName = safeCustomerDisplayName(profileName)
    return {
      state: "editing",
      cardId: row.id,
      userId: row.user_id,
      slug: row.slug,
      customerName,
      notice: guestEditingNotice(customerName),
      expiresAt: editWindow.expires_at,
      expired: new Date(editWindow.expires_at).getTime() <= now,
    }
  }

  return null
}
