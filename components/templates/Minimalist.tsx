import type { LegacyCardData } from "@/lib/types"

export function Minimalist({
  eventName,
  eventDate,
  eventTime,
  venue,
  venueAddress,
  hostNames,
  coverPhotoUrl,
  additionalMessage,
}: LegacyCardData) {
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("en-MY", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : ""

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      {/* Thin top accent */}
      <div className="h-1 bg-gray-900" />

      {/* Header space */}
      <div className="text-center pt-14 pb-4 px-8">
        <p className="text-gray-400 text-xs tracking-[0.3em] uppercase">You are invited</p>
      </div>

      {/* Cover photo */}
      {coverPhotoUrl ? (
        <div className="px-8 mb-8">
          <div className="w-full aspect-[4/3] overflow-hidden grayscale">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPhotoUrl} alt="Cover" className="w-full h-full object-cover" />
          </div>
        </div>
      ) : (
        <div className="px-8 mb-8">
          <div className="w-full h-px bg-gray-200" />
        </div>
      )}

      {/* Event name */}
      <div className="text-center px-8 py-4">
        <h1 className="text-3xl font-light tracking-wide text-gray-900 leading-tight">
          {eventName}
        </h1>
      </div>

      {/* Host */}
      {hostNames && (
        <div className="text-center px-8 py-2">
          <p className="text-gray-400 text-xs tracking-widest uppercase mb-1">Hosted by</p>
          <p className="text-gray-600 text-sm">{hostNames}</p>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4 px-8 my-6">
        <div className="flex-1 h-px bg-gray-100" />
        <div className="w-1 h-1 bg-gray-400 rounded-full" />
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Details */}
      <div className="px-8 space-y-5">
        <div>
          <p className="text-gray-400 text-xs tracking-widest uppercase mb-1">When</p>
          <p className="text-gray-700 font-medium">{formattedDate}</p>
          {eventTime && <p className="text-gray-500 text-sm">{eventTime}</p>}
        </div>

        <div>
          <p className="text-gray-400 text-xs tracking-widest uppercase mb-1">Where</p>
          <p className="text-gray-700 font-medium">{venue}</p>
          {venueAddress && (
            <p className="text-gray-500 text-sm mt-0.5">{venueAddress}</p>
          )}
        </div>
      </div>

      {/* Message */}
      {additionalMessage && (
        <div className="px-8 mt-8">
          <div className="border-l-2 border-gray-200 pl-4">
            <p className="text-gray-500 text-sm italic leading-relaxed">{additionalMessage}</p>
          </div>
        </div>
      )}

      <div className="pb-12" />
      <div className="h-1 bg-gray-900" />
    </div>
  )
}
