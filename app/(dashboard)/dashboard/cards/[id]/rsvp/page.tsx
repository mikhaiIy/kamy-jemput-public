import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, ChevronDown, MailOpen, Users } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CopyLinkButton } from "@/components/CopyLinkButton"
import { getCardEventName, type RSVPResponse, type CardData } from "@/lib/types"

export const metadata = {
  title: "Respons RSVP — kamy jemput",
}

const responseDate = new Intl.DateTimeFormat("ms-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export default async function RSVPDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, slug, custom_data, is_published, current_publication_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (cardError) throw new Error("Maklumat jemputan tidak dapat dimuatkan.")
  if (!card) notFound()

  const [{ data: responses, error: responseError }, publicationResult] = await Promise.all([
    supabase.from("rsvp_responses")
      .select("id, guest_name, guest_contact, attending, pax, message, created_at")
      .eq("card_id", id)
      .order("created_at", { ascending: false }),
    card.current_publication_id
      ? supabase.from("card_publications")
        .select("snapshot")
        .eq("id", card.current_publication_id)
        .eq("card_id", id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (responseError || publicationResult.error) {
    throw new Error("Respons RSVP tidak dapat dimuatkan.")
  }

  const rsvpList = (responses || []) as Pick<RSVPResponse, "id" | "guest_name" | "guest_contact" | "attending" | "pax" | "message" | "created_at">[]
  const attendingResponses = rsvpList.filter((response) => response.attending)
  const totalPax = attendingResponses.reduce((sum, response) => sum + (response.pax || 1), 0)
  const declinedCount = rsvpList.length - attendingResponses.length
  const cardData = (publicationResult.data?.snapshot ?? card.custom_data) as CardData
  const cardEventName = getCardEventName(cardData) || "Jemputan tanpa nama"
  const canShare = card.is_published && Boolean(publicationResult.data)
  const cardUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/i/${card.slug}`

  return (
    <div className="mx-auto min-h-[80vh] max-w-[1120px] px-5 py-7 sm:px-8 sm:py-12">
      <Link href="/dashboard" className="mb-6 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} aria-hidden /> Jemputan saya
      </Link>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Jawapan tetamu</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-primary sm:text-5xl">Respons RSVP</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{cardEventName}</p>
        </div>
        {canShare && (
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton url={cardUrl} compact />
            <Button asChild size="sm">
              <Link href={`/i/${card.slug}`} target="_blank" rel="noopener noreferrer">
                Buka jemputan <ArrowUpRight size={15} aria-hidden />
              </Link>
            </Button>
          </div>
        )}
      </header>

      <section aria-label="Ringkasan kehadiran" className="mb-8 overflow-hidden rounded-2xl border bg-card">
        <div className="grid grid-cols-2 sm:grid-cols-[1.3fr_1fr_1fr]">
          <div className="col-span-2 flex items-center gap-4 border-b p-5 sm:col-span-1 sm:border-r sm:border-b-0 sm:p-6">
            <Users size={28} strokeWidth={1.4} aria-hidden className="shrink-0 text-primary" />
            <div>
              <p className="font-display text-4xl font-semibold leading-none text-primary">{totalPax}</p>
              <h2 className="mt-2 text-xs font-semibold text-primary">Jangkaan tetamu</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Termasuk tetamu tambahan</p>
            </div>
          </div>
          <div className="border-r p-5 sm:p-6">
            <p className="font-display text-3xl font-semibold text-primary">{attendingResponses.length}</p>
            <p className="mt-1 text-xs font-medium">Respons hadir</p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="font-display text-3xl font-semibold text-primary">{declinedCount}</p>
            <p className="mt-1 text-xs font-medium">Respons tidak hadir</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="guest-responses-heading" className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-5 sm:px-6">
          <div>
            <h2 id="guest-responses-heading" className="text-base font-semibold text-primary">Senarai respons <span className="ml-1 text-sm font-normal text-muted-foreground">({rsvpList.length})</span></h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Buka nama tetamu untuk maklumat hubungan dan ucapan.</p>
          </div>
          <span className="text-[11px] text-muted-foreground">Terbaharu dahulu</span>
        </div>
        {rsvpList.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <MailOpen size={32} strokeWidth={1.3} aria-hidden className="mx-auto mb-4 text-primary" />
            <h3 className="font-semibold">Belum ada respons</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {canShare ? "Kongsi pautan jemputan anda untuk mula menerima jawapan tetamu." : "Jawapan tetamu akan muncul di sini selepas jemputan diterbitkan dan dikongsi."}
            </p>
            {canShare && <div className="mt-5"><CopyLinkButton url={cardUrl} compact /></div>}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rsvpList.map((response) => (
              <details key={response.id} className="group">
                <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:gap-5 sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold break-words">{response.guest_name}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{responseDate.format(new Date(response.created_at))}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-5">
                    <Badge variant={response.attending ? "success" : "secondary"}>{response.attending ? "Hadir" : "Tidak hadir"}</Badge>
                    <span className="text-xs text-muted-foreground sm:w-16 sm:text-right">{response.attending ? `${response.pax || 1} tetamu` : "—"}</span>
                  </span>
                  <ChevronDown size={16} aria-hidden className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <dl className="grid gap-5 border-t border-dashed bg-background/60 px-5 py-5 text-sm sm:grid-cols-[1fr_2fr] sm:px-6">
                  <div>
                    <dt className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Maklumat hubungan</dt>
                    <dd className="break-words">{response.guest_contact || "Tidak diberikan"}</dd>
                  </div>
                  <div>
                    <dt className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Ucapan</dt>
                    <dd className="leading-6 whitespace-pre-wrap break-words">{response.message || "Tiada ucapan"}</dd>
                  </div>
                </dl>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
