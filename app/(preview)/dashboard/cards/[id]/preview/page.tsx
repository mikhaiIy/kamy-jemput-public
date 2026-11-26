import { notFound, redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { CardRenderer } from "@/components/CardRenderer"
import type { CardData } from "@/lib/types"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Pratonton jemputan — kamy jemput",
  robots: { index: false, follow: false },
}

export default async function CustomerInvitationPreview({ params }: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = await createSupabaseServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect("/login")
  const { data: card, error } = await db.from("cards")
    .select("id, user_id, custom_data,custom_data_draft,revision_draft,current_publication_id")
    .eq("id", id).eq("user_id", user.id).maybeSingle()
  if (error) throw error
  if (!card) notFound()
  let currentPublicationData: CardData | null = null
  if (card.current_publication_id) {
    const { data: publication, error: publicationError } = await db
      .from("card_publications")
      .select("snapshot")
      .eq("id", card.current_publication_id)
      .eq("card_id", card.id)
      .maybeSingle()
    if (publicationError) throw publicationError
    currentPublicationData = (publication?.snapshot as CardData | null) ?? null
  }
  // Owner-only saved draft; no public URL or live RSVP context.
  return (
    <CardRenderer
      cardId={card.id}
      userId={card.user_id}
      data={(card.revision_draft ?? card.custom_data_draft ?? currentPublicationData ?? card.custom_data) as CardData}
    />
  )
}
