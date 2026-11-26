"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mail, QrCode } from "lucide-react"

export function SettingsNavigation() {
  const pathname = usePathname()
  const qrActive = pathname.startsWith("/admin/settings/qr")
  const supportActive = pathname.startsWith("/admin/settings/support")
  return (
    <nav aria-label="Kategori tetapan" className="flex gap-2 overflow-x-auto">
      <Link
        href="/admin/settings/qr"
        aria-current={qrActive ? "page" : undefined}
        className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-primary sm:px-4"
      >
        <QrCode size={18} aria-hidden />
        Bayaran QR
      </Link>
      <Link
        href="/admin/settings/support"
        aria-current={supportActive ? "page" : undefined}
        className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-primary sm:px-4"
      >
        <Mail size={18} aria-hidden />
        Hubungi sokongan
      </Link>
    </nav>
  )
}
