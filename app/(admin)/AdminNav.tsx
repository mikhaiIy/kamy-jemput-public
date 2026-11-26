"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingBag,
  Mail,
  ReceiptText,
  LayoutTemplate,
  PencilRuler,
  Settings2,
  ArrowUpRight,
  Menu,
  MessageSquareText,
} from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { KamyLogo } from "@/components/KamyLogo"
import { LogoutButton } from "@/components/LogoutButton"

const items = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/admin/cards", label: "Jemputan pelanggan", icon: Mail },
  { href: "/admin/orders", label: "Pesanan", icon: ShoppingBag },
  { href: "/admin/payments", label: "Semakan bayaran", icon: ReceiptText },
  { href: "/admin/edit-requests", label: "Mohon Suntingan", icon: MessageSquareText },
  {
    href: "/admin/templates",
    label: "Pengurusan template",
    icon: LayoutTemplate,
  },
  { href: "/admin/custom-orders", label: "Tempahan khas", icon: PencilRuler },
  { href: "/admin/settings", label: "Tetapan", icon: Settings2 },
]

export function AdminNav({
  email,
  pendingEditRequests = 0,
}: {
  email: string
  pendingEditRequests?: number
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const navigation = (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <Link
        href="/admin"
        aria-label="kamy jemput — Ringkasan admin"
        onClick={() => setOpen(false)}
        className="px-3 pb-9 pt-3"
      >
        <KamyLogo size="md" />
        <span className="admin-eyebrow mt-3 block">Ruang pentadbir</span>
      </Link>
      <p className="admin-eyebrow mb-3 px-3">Pengurusan</p>
      <nav aria-label="Navigasi admin" className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin"
              ? pathname === href
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className="admin-nav-link"
            >
              <Icon size={17} strokeWidth={1.7} aria-hidden />
              <span className="min-w-0 flex-1">{label}</span>
              {href === "/admin/edit-requests" && pendingEditRequests > 0 && (
                <span
                  className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary-foreground"
                  aria-label={`${pendingEditRequests} permintaan menunggu semakan`}
                >
                  {pendingEditRequests > 99 ? "99+" : pendingEditRequests}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="mt-8 border-t border-border pt-6">
        <p className="admin-eyebrow mb-3 px-3">Cipta & uji</p>
        <Link href="/dashboard" className="admin-nav-link">
          <LayoutDashboard size={17} aria-hidden />
          Dashboard pelanggan
          <ArrowUpRight size={13} className="ml-auto" aria-hidden />
        </Link>
        <Link href="/templates" className="admin-nav-link">
          <LayoutTemplate size={17} aria-hidden />
          Galeri template
          <ArrowUpRight size={13} className="ml-auto" aria-hidden />
        </Link>
        <p className="px-3 pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Buka paparan pelanggan untuk mencipta dan menguji jemputan.
        </p>
      </div>
      <div className="mt-auto border-t border-border px-3 pt-5">
        <p className="text-xs font-semibold">Pentadbir</p>
        <p
          className="mb-2 mt-1 truncate text-[11px] text-muted-foreground"
          title={email}
        >
          {email}
        </p>
        <LogoutButton className="w-full justify-start" />
      </div>
    </div>
  )
  return (
    <>
      <aside className="admin-sidebar fixed inset-y-0 left-0 z-30 hidden md:block">
        {navigation}
      </aside>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className="admin-secondary fixed left-4 top-4 z-30 shadow-sm md:hidden"
            aria-label="Buka navigasi admin"
          >
            <Menu size={18} />
            Menu
          </button>
        </DialogTrigger>
        <DialogContent
          className="admin-workspace inset-y-0 left-0 top-0 h-dvh max-h-none w-[280px] max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-0 p-0"
          overlayClassName="z-40"
        >
          <DialogTitle className="sr-only">Navigasi admin</DialogTitle>
          <DialogDescription className="sr-only">
            Pilih halaman pengurusan atau buka paparan pelanggan.
          </DialogDescription>
          {navigation}
        </DialogContent>
      </Dialog>
    </>
  )
}
