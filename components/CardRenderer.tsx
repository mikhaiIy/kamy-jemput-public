import { isSectionCard, type CardData, type LegacyCardData } from "@/lib/types"
import { MalayWedding } from "./templates/MalayWedding"
import { ChineseWedding } from "./templates/ChineseWedding"
import { Minimalist } from "./templates/Minimalist"
import { Birthday } from "./templates/Birthday"
import { Corporate } from "./templates/Corporate"
import { SectionInvitationCard } from "./SectionInvitationCard"
import { resolveCardDataAssetUrls } from "@/lib/card-assets"

const TEMPLATE_MAP: Record<string, React.FC<LegacyCardData>> = {
  "malay-wedding": MalayWedding,
  "chinese-wedding": ChineseWedding,
  minimalist: Minimalist,
  birthday: Birthday,
  corporate: Corporate,
}

interface CardRendererProps {
  data: CardData
  cardId?: string
  userId?: string | null
}

export function CardRenderer({ data, cardId, userId }: CardRendererProps) {
  if (isSectionCard(data)) {
    return <SectionInvitationCard cardId={cardId} userId={userId} data={data} />
  }
  const Template = TEMPLATE_MAP[data.templateId]

  if (!Template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Template not found: {data.templateId}</p>
        </div>
      </div>
    )
  }

  const renderedData = cardId
    ? resolveCardDataAssetUrls(data, { cardId, userId })
    : data
  return <Template {...renderedData} />
}

export const AVAILABLE_TEMPLATE_IDS = Object.keys(TEMPLATE_MAP)
