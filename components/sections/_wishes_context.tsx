"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export type Wish = {
  guestName: string
  message: string
  createdAt: string
  /** Present on realtime payloads; SSR wishes are already pointer-scoped. */
  publicationId?: string
}

const WishesContext = createContext<Wish[]>([])

/**
 * Stateful provider for the guestbook section. Seeds with `initial` (the
 * SSR-rendered wishes fetched by the public /i/[slug] page) and subscribes
 * to a Supabase Realtime broadcast channel keyed by the current immutable
 * publication. A card id alone is not a sufficient visibility boundary:
 * after a later publication, old channels must not receive new guestbook
 * events.
 *
 * The RSVP submit endpoint emits the broadcast — see
 * `app/api/rsvp/[cardId]/route.ts`. Broadcast (not Postgres Changes) is
 * used to avoid loosening RLS on `rsvp_responses`.
 */
export function WishesProvider({
  cardId,
  publicationId,
  initial,
  children,
}: {
  cardId?: string
  publicationId?: string
  initial: Wish[]
  children: ReactNode
}) {
  const [wishes, setWishes] = useState<Wish[]>(initial)

  useEffect(() => {
    if (!cardId || !publicationId) return
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`wishes:${cardId}:${publicationId}`)
      .on("broadcast", { event: "new_wish" }, ({ payload }: { payload: unknown }) => {
        const w = payload as Wish
        // Broadcast is intentionally public. Require the immutable publication
        // identity in the payload as well as in the topic so a stale or forged
        // event cannot be adopted by a current guestbook surface.
        if (
          w?.publicationId !== publicationId ||
          !w?.message ||
          !w?.guestName ||
          typeof w.createdAt !== "string"
        ) return
        setWishes((prev) => {
          // Dedupe in case the page-load fetch and the broadcast race.
          if (
            prev.some(
              (p) =>
                p.createdAt === w.createdAt && p.guestName === w.guestName
            )
          ) {
            return prev
          }
          return [w, ...prev]
        })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [cardId, publicationId])

  return (
    <WishesContext.Provider value={wishes}>{children}</WishesContext.Provider>
  )
}

export function useWishes(): Wish[] {
  return useContext(WishesContext)
}
