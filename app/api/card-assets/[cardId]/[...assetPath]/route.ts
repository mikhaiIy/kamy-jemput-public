import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  CARD_ASSETS_BUCKET,
  collectCardAssetPaths,
  isCardAssetId,
  isAllowedCardAssetMimeType,
  MAX_CARD_ASSET_BYTES,
  normalizeCardAssetRoutePath,
} from "@/lib/card-assets"
import type { CardData } from "@/lib/types"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { loadGuestInvitationByCardId } from "@/lib/public-invitation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

const NOT_FOUND_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
}

function notFoundResponse(): Response {
  return new Response("Not found", { status: 404, headers: NOT_FOUND_HEADERS })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cardId: string; assetPath: string[] }> },
) {
  const { cardId, assetPath } = await params
  if (!isCardAssetId(cardId)) return notFoundResponse()

  const sessionClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  const { data: card, error: cardError } = await supabaseAdmin
    .from("cards")
    .select("id, user_id, custom_data, custom_data_draft, revision_draft, is_published, published_at, current_publication_id, active_edit_window_id, orders!inner(status)")
    .eq("id", cardId)
    .maybeSingle()
  if (cardError || !card) return notFoundResponse()

  const dbPath = normalizeCardAssetRoutePath(
    cardId,
    assetPath,
    card.user_id as string | null,
  )
  if (!dbPath) return notFoundResponse()

  const order = Array.isArray(card.orders) ? card.orders[0] : card.orders
  const isPublishedPaid = card.is_published === true && order?.status === "paid"

  let currentPublicationData: CardData | null = null
  if (card.current_publication_id) {
    const { data: currentPublication, error: publicationError } = await supabaseAdmin
      .from("card_publications")
      .select("snapshot")
      .eq("id", card.current_publication_id)
      .eq("card_id", card.id)
      .maybeSingle<{ snapshot: CardData }>()
    if (publicationError || !currentPublication?.snapshot) return notFoundResponse()
    currentPublicationData = currentPublication.snapshot
  }

  let isAdmin = false
  if (user) {
    const { data: profile } = await sessionClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    isAdmin = profile?.role === "admin"
  }

  const isOwner = Boolean(user && user.id === card.user_id)
  const context = { cardId, userId: card.user_id as string | null }
  const ownerOrAdmin = isOwner || isAdmin
  const isLegacyCover = dbPath.relativePath.startsWith("covers/")
  if (ownerOrAdmin && isLegacyCover) {
    // Legacy covers/<user_id>/<file> objects predate card-scoped paths. They
    // are safe only when the current card explicitly references the object.
    // Otherwise a customer with multiple cards could probe another card's
    // historical cover by using this card's endpoint.
    const referencedByCard = new Set([
      ...collectCardAssetPaths(card.custom_data as CardData | null, context),
      ...collectCardAssetPaths(card.custom_data_draft as CardData | null, context),
      ...collectCardAssetPaths(card.revision_draft as CardData | null, context),
      ...collectCardAssetPaths(currentPublicationData, context),
    ])
    if (!referencedByCard.has(dbPath.objectPath)) return notFoundResponse()
  }
  if (!ownerOrAdmin) {
    // Guest reads use the same current-publication pointer as HTML/metadata/
    // RSVP. The card row and its old first snapshot are never the membership
    // source for this branch.
    if (!isPublishedPaid || !card.published_at || !card.current_publication_id) {
      return notFoundResponse()
    }
    const invitation = await loadGuestInvitationByCardId(cardId)
    if (!invitation || invitation.state !== "published") return notFoundResponse()
    const referencedPaths = collectCardAssetPaths(invitation.data, {
      cardId,
      userId: invitation.userId,
    })
    if (!referencedPaths.has(dbPath.objectPath)) return notFoundResponse()
  }

  const { data: file, error: downloadError } = await supabaseAdmin.storage
    .from(CARD_ASSETS_BUCKET)
    .download(dbPath.objectPath)
  if (downloadError || !file) return notFoundResponse()

  // The service-role Storage download response is the trusted object boundary
  // here. Validate the returned MIME and byte count, not the caller's suffix.
  const contentType = isAllowedCardAssetMimeType(file.type) ? file.type : null
  const size = file.size
  if (!contentType || !Number.isSafeInteger(size) || size < 0 || size > MAX_CARD_ASSET_BYTES) {
    return notFoundResponse()
  }

  const fileName = dbPath.objectPath.split("/").at(-1) ?? "image"
  const headers = new Headers(NOT_FOUND_HEADERS)
  headers.set("Content-Type", contentType)
  headers.set("Content-Length", String(size))
  headers.set("Cache-Control", "no-store, max-age=0")
  headers.set("Content-Disposition", `inline; filename="${fileName}"`)
  headers.set("Referrer-Policy", "no-referrer")
  headers.set("Vary", "Cookie")

  return new Response(file.stream(), { status: 200, headers })
}
