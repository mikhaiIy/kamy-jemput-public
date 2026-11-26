import type { LegacyCardData } from "@/lib/types"

export function Corporate({
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
    <div className="min-h-screen bg-[#0f1f3d] text-white font-sans">
      {/* Top accent */}
      <div className="h-1.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400" />

      {/* Header */}
      <div className="text-center pt-12 pb-6 px-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 border border-blue-400/30 mb-4">
          <span className="text-3xl">🏢</span>
        </div>
        <p className="text-blue-300 text-xs tracking-[0.3em] uppercase">Corporate Invitation</p>
      </div>

      {/* Cover photo */}
      {coverPhotoUrl && (
        <div className="px-8 mb-6">
          <div className="w-full aspect-[16/9] rounded-lg overflow-hidden border border-blue-500/30 shadow-lg shadow-blue-900/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPhotoUrl} alt="Cover" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Event name */}
      <div className="text-center px-8 py-4">
        <h1 className="text-2xl font-semibold text-white tracking-tight leading-tight">
          {eventName}
        </h1>
      </div>

      {/* Host */}
      {hostNames && (
        <div className="text-center px-8 py-2">
          <p className="text-blue-300/60 text-xs tracking-widest uppercase mb-1">Organised by</p>
          <p className="text-blue-100 text-sm">{hostNames}</p>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4 px-8 my-6">
        <div className="flex-1 h-px bg-blue-800" />
        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
        <div className="flex-1 h-px bg-blue-800" />
      </div>

      {/* Details */}
      <div className="mx-8 space-y-4 bg-blue-900/30 rounded-xl p-6 border border-blue-800/50">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="text-base">📅</span>
          </div>
          <div>
            <p className="text-blue-300/60 text-xs uppercase tracking-wide mb-0.5">Date & Time</p>
            <p className="text-white font-medium text-sm">{formattedDate}</p>
            {eventTime && <p className="text-blue-200/70 text-sm">{eventTime}</p>}
          </div>
        </div>

        <div className="w-full h-px bg-blue-800/50" />

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="text-base">📍</span>
          </div>
          <div>
            <p className="text-blue-300/60 text-xs uppercase tracking-wide mb-0.5">Venue</p>
            <p className="text-white font-medium text-sm">{venue}</p>
            {venueAddress && (
              <p className="text-blue-200/70 text-sm mt-0.5">{venueAddress}</p>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      {additionalMessage && (
        <div className="mx-8 mt-6 border-l-2 border-blue-500/40 pl-4">
          <p className="text-blue-200/70 text-sm italic leading-relaxed">{additionalMessage}</p>
        </div>
      )}

      <div className="pb-12" />
      <div className="h-1.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400" />
    </div>
  )
}
