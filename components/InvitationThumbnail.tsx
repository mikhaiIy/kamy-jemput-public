"use client"

import Link from "next/link"
import { useState } from "react"
import { ExternalLink, Mail } from "lucide-react"

/** Scaled mobile viewport. The owner/admin route enforces access independently. */
export function InvitationThumbnail({
  src,
  href,
  title,
}: {
  src: string
  href: string
  title: string
}) {
  const [failed, setFailed] = useState(false)
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="invitation-thumbnail group"
      aria-label={`Buka pratonton ${title}`}
    >
      <span className="invitation-thumbnail-speaker" aria-hidden />
      <span className="invitation-thumbnail-screen" aria-hidden="true" inert>
        {failed ? (
          <span className="flex h-full flex-col items-center justify-center gap-3 bg-secondary p-4 text-center text-xs text-muted-foreground">
            <Mail size={24} />
            Pratonton tidak tersedia
          </span>
        ) : (
          <iframe
            src={src}
            title={`Pratonton ${title}`}
            loading="lazy"
            scrolling="no"
            tabIndex={-1}
            onError={() => setFailed(true)}
            className="invitation-thumbnail-iframe"
          />
        )}
      </span>
      <span className="invitation-thumbnail-link">
        <ExternalLink size={12} aria-hidden /> Buka pratonton
      </span>
    </Link>
  )
}
