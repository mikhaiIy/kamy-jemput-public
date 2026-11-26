import { notFound } from "next/navigation"
import { CardRenderer } from "@/components/CardRenderer"
import { requireAdmin } from "@/lib/auth/require-admin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { CardData } from "@/lib/types"

export const metadata = {
  title: "Pratonton jemputan — kamy jemput",
  robots: { index: false, follow: false },
}

/** Bare, administrator-only viewport: drafts never use the public invite URL. */
export default async function AdminInvitationPreview({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const { data: card, error } = await supabaseAdmin
    .from("cards")
    .select("id, user_id, custom_data,custom_data_draft,revision_draft,current_publication_id")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!card) notFound()
  let currentPublicationData: CardData | null = null
  if (card.current_publication_id) {
    const { data: publication, error: publicationError } = await supabaseAdmin
      .from("card_publications")
      .select("snapshot")
      .eq("id", card.current_publication_id)
      .eq("card_id", card.id)
      .maybeSingle()
    if (publicationError) throw publicationError
    currentPublicationData = (publication?.snapshot as CardData | null) ?? null
  }
  // The card id is passed only for protected image rendering; no RSVP context
  // is enabled by this bare preview.
  return (
    <CardRenderer
      cardId={card.id}
      userId={card.user_id}
      data={(card.revision_draft ?? card.custom_data_draft ?? currentPublicationData ?? card.custom_data) as CardData}
    />
  )
}
