import { MalayWeddingCard } from "@/components/card-previews/MalayWeddingCard"
import { ChineseWeddingCard } from "@/components/card-previews/ChineseWeddingCard"
import { GeneralWeddingCard } from "@/components/card-previews/GeneralWeddingCard"
import { MalayWedding } from "@/components/templates/MalayWedding"
import { ChineseWedding } from "@/components/templates/ChineseWedding"
import { Minimalist } from "@/components/templates/Minimalist"
import { Birthday } from "@/components/templates/Birthday"
import { Corporate } from "@/components/templates/Corporate"
import { SectionInvitationCard } from "@/components/SectionInvitationCard"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { LegacyCardData, SectionCardData } from "@/lib/types"
import { isLegacyPreviewId, type LegacyPreviewId } from "@/lib/preview-templates"
import { notFound } from "next/navigation"

const BASE_DEMO: Omit<LegacyCardData, "templateId"> = {
  eventName: "Sarah & Adam",
  brideName: "Sarah Putri",
  groomName: "Adam Rahman",
  eventDate: "2026-12-26",
  eventTime: "19:00",
  venue: "Dewan Seri Budiman",
  venueAddress: "Jalan Ampang, 50450 Kuala Lumpur, Malaysia",
  hostNames: "Keluarga Baharudin & Keluarga Rahman",
  rsvpEnabled: true,
  rsvpDeadline: "2026-12-15",
  additionalMessage:
    "Dengan penuh kegembiraan kami menjemput anda bersama keluarga hadir ke majlis perkahwinan kami.",
  program: [
    { time: "6:00 PM", event: "Ketibaan tetamu" },
    { time: "7:00 PM", event: "Majlis persandingan" },
    { time: "8:00 PM", event: "Jamuan makan malam" },
    { time: "9:30 PM", event: "Hiburan & fotografi" },
  ],
  contacts: [
    { name: "Sarah", phone: "+60 12-345 6789", role: "Pengantin Perempuan" },
    { name: "Adam", phone: "+60 11-234 5678", role: "Pengantin Lelaki" },
  ],
}

const CHINESE_DEMO: Omit<LegacyCardData, "templateId"> = {
  ...BASE_DEMO,
  brideName: "陈雅仪",
  groomName: "李俊明",
  eventName: "Emily & Alex",
  hostNames: "陈家 & 李家",
  brideParent: "陈国强 & 林淑华",
  groomParent: "李伟明 & 王美玲",
  additionalMessage: "爱情是两颗心的默契，是相守一生的承诺",
  program: [
    { time: "6:00 PM", event: "宾客入座 Guest Arrival" },
    { time: "7:00 PM", event: "婚礼仪式 Ceremony" },
    { time: "8:00 PM", event: "晚宴 Dinner Banquet" },
    { time: "9:30 PM", event: "敬酒 Toast" },
  ],
}

const GENERAL_DEMO: Omit<LegacyCardData, "templateId"> = {
  ...BASE_DEMO,
  brideName: "Isabella Moore",
  groomName: "James Harrington",
  eventName: "Isabella & James",
  hostNames: "The Moore Family & The Harrington Family",
  additionalMessage:
    "Join us as we celebrate the beginning of forever. Your presence is the greatest gift.",
  program: [
    { time: "4:00 PM", event: "Guest Arrival" },
    { time: "5:00 PM", event: "Ceremony" },
    { time: "6:30 PM", event: "Cocktail Hour" },
    { time: "8:00 PM", event: "Reception Dinner" },
  ],
  contacts: [
    { name: "Isabella", phone: "+60 12-345 6789", role: "Bride" },
    { name: "James", phone: "+60 11-234 5678", role: "Groom" },
  ],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LEGACY_PREVIEW_MAP: Record<LegacyPreviewId, { Component: React.ComponentType<any>; demo: Omit<LegacyCardData, "templateId"> }> = {
  "malay-wedding-v2": { Component: MalayWeddingCard, demo: BASE_DEMO },
  "chinese-wedding-v2": { Component: ChineseWeddingCard, demo: CHINESE_DEMO },
  "general-wedding": { Component: GeneralWeddingCard, demo: GENERAL_DEMO },
  "malay-wedding": { Component: MalayWedding, demo: BASE_DEMO },
  "chinese-wedding": { Component: ChineseWedding, demo: CHINESE_DEMO },
  minimalist: { Component: Minimalist, demo: BASE_DEMO },
  birthday: {
    Component: Birthday,
    demo: { ...BASE_DEMO, eventName: "Aisyah's Sweet 16", hostNames: "Keluarga Baharudin" },
  },
  corporate: {
    Component: Corporate,
    demo: {
      ...BASE_DEMO,
      eventName: "Annual Tech Summit 2026",
      hostNames: "Kamy Technologies Sdn Bhd",
      venue: "Kuala Lumpur Convention Centre",
    },
  },
}

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Try DB first — v2 templates have type + theme + sections
  const supabase = await createSupabaseServerClient()
  const { data: template } = await supabase
    .from("templates")
    .select("type, theme, sections")
    .eq("id", id)
    .single()

  if (template?.type && template.theme && template.sections) {
    const sectionData: SectionCardData = {
      templateId: id,
      theme: template.theme,
      sections: template.sections,
    }
    return <SectionInvitationCard data={sectionData} />
  }

  // Fall back to legacy preview components
  if (!isLegacyPreviewId(id)) {
    notFound()
  }

  const entry = LEGACY_PREVIEW_MAP[id]

  const { Component, demo } = entry
  const data: LegacyCardData = { ...demo, templateId: id }
  return <Component {...data} />
}
