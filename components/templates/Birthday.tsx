import type { LegacyCardData } from "@/lib/types"

export function Birthday({
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
    <div
      className="min-h-screen font-sans"
      style={{
        background: "linear-gradient(135deg, #fce4ec 0%, #f3e5f5 50%, #e3f2fd 100%)",
      }}
    >
      {/* Confetti dots decoration */}
      <div className="relative overflow-hidden">
        <div className="absolute top-4 left-4 text-2xl opacity-40 rotate-12">🎈</div>
        <div className="absolute top-6 right-6 text-xl opacity-40 -rotate-12">🎉</div>
        <div className="absolute top-12 left-12 text-lg opacity-30 rotate-45">⭐</div>
      </div>

      {/* Header */}
      <div className="text-center pt-14 pb-4 px-6">
        <div className="text-5xl mb-3">🎂</div>
        <p className="text-pink-400 text-xs tracking-widest uppercase font-medium">
          You&apos;re Invited!
        </p>
      </div>

      {/* Cover photo */}
      {coverPhotoUrl && (
        <div className="px-8 mb-6">
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border-4 border-white shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPhotoUrl} alt="Cover" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Event name */}
      <div className="text-center px-6 py-4">
        <h1 className="text-3xl font-bold text-purple-700 leading-tight">{eventName}</h1>
      </div>

      {/* Host */}
      {hostNames && (
        <div className="text-center px-6 py-2">
          <p className="text-pink-400 text-xs tracking-wide uppercase mb-1">Join us!</p>
          <p className="text-purple-600 text-base">{hostNames}</p>
        </div>
      )}

      {/* Details card */}
      <div className="mx-6 my-6 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📅</div>
            <div>
              <p className="text-pink-400 text-xs uppercase tracking-wide font-medium">Date & Time</p>
              <p className="text-purple-700 font-semibold">{formattedDate}</p>
              {eventTime && <p className="text-purple-500 text-sm">{eventTime}</p>}
            </div>
          </div>

          <div className="w-full h-px bg-pink-100" />

          <div className="flex items-start gap-3">
            <div className="text-2xl">📍</div>
            <div>
              <p className="text-pink-400 text-xs uppercase tracking-wide font-medium">Venue</p>
              <p className="text-purple-700 font-semibold">{venue}</p>
              {venueAddress && (
                <p className="text-purple-500 text-sm mt-0.5">{venueAddress}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {additionalMessage && (
        <div className="mx-6 mb-6 bg-white/60 rounded-xl px-5 py-4">
          <p className="text-purple-600 text-sm italic text-center leading-relaxed">
            &ldquo;{additionalMessage}&rdquo;
          </p>
        </div>
      )}

      {/* Bottom emojis */}
      <div className="text-center py-6 text-xl space-x-2">
        <span>🎊</span>
        <span>🎈</span>
        <span>🎁</span>
        <span>🎈</span>
        <span>🎊</span>
      </div>
    </div>
  )
}
