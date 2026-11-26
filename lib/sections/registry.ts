import type { SectionType, SectionInstance } from "@/lib/types"
import type { SectionModule } from "./types"

import { landingModule } from "@/components/sections/landing"
import { welcomeModule } from "@/components/sections/welcome"
import { quoteModule } from "@/components/sections/quote"
import { eventInfoModule } from "@/components/sections/event_info"
import { programModule } from "@/components/sections/program"
import { mapModule } from "@/components/sections/map"
import { calendarModule } from "@/components/sections/calendar"
import { countdownModule } from "@/components/sections/countdown"
import { rsvpModule } from "@/components/sections/rsvp"
import { thankYouModule } from "@/components/sections/thank_you"
import { contactModule } from "@/components/sections/contact"
import { childInfoModule } from "@/components/sections/child_info"
import { wishlistModule } from "@/components/sections/wishlist"
import { guestbookModule } from "@/components/sections/guestbook"
import { dressCodeModule } from "@/components/sections/dress_code"
import { agendaMultiDayModule } from "@/components/sections/agenda_multi_day"
import { corporateSpeakersModule } from "@/components/sections/corporate_speakers"
import { galleryModule } from "@/components/sections/gallery"
import { loveStoryModule } from "@/components/sections/love_story"

type SectionRegistry = {
  [K in SectionType]: SectionModule<K>
}

export const sectionRegistry: SectionRegistry = {
  landing: landingModule,
  welcome: welcomeModule,
  quote: quoteModule,
  event_info: eventInfoModule,
  program: programModule,
  map: mapModule,
  calendar: calendarModule,
  countdown: countdownModule,
  rsvp: rsvpModule,
  thank_you: thankYouModule,
  contact: contactModule,
  child_info: childInfoModule,
  wishlist: wishlistModule,
  guestbook: guestbookModule,
  dress_code: dressCodeModule,
  agenda_multi_day: agendaMultiDayModule,
  corporate_speakers: corporateSpeakersModule,
  gallery: galleryModule,
  love_story: loveStoryModule,
}

export const SECTION_TYPES: SectionType[] = Object.keys(
  sectionRegistry
) as SectionType[]

export function getSectionModule<T extends SectionType>(
  type: T
): SectionModule<T> {
  return sectionRegistry[type]
}

/** Build a default `SectionInstance` for a given type, at a given order. */
export function defaultSectionInstance<T extends SectionType>(
  type: T,
  order: number
): SectionInstance<T> {
  const m = sectionRegistry[type]
  return {
    type,
    variant: m.defaultVariant,
    enabled: true,
    order,
    data: structuredClone(m.defaultData),
  }
}
