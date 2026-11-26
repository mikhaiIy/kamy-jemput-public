"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { LogoutButton } from "./LogoutButton"

type NavbarMenuProps = {
  isAdmin: boolean
  user: boolean
}

export function NavbarMenu({ isAdmin, user }: NavbarMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    // Desktop hides the navigation links already present in the Navbar.
    const firstFocusable = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("a, button:not(:disabled)") ?? [],
    ).find((element) => element.getClientRects().length > 0)
    firstFocusable?.focus()

    function handlePointerDown(event: PointerEvent) {
      // A portalled logout error dialog owns dismissal while it is open.
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [open])

  const closeMenu = () => setOpen(false)

  return (
    <div
      ref={rootRef}
      className={cn("sm:relative", !user && "sm:hidden")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && rootRef.current?.contains(event.target as Node)) {
          event.preventDefault()
          setOpen(false)
          buttonRef.current?.focus()
        }
      }}
      onBlurCapture={(event) => {
        const next = event.relatedTarget
        if (next instanceof Element && next.closest('[role="dialog"]')) return
        if (next instanceof Node && !event.currentTarget.contains(next)) closeMenu()
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="navbar-menu"
        aria-label={open ? "Tutup menu navigasi dan akaun" : "Buka menu navigasi dan akaun"}
        onClick={() => setOpen((current) => !current)}
        className="flex size-11 items-center justify-center rounded-lg text-primary transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
      </button>

      {/* Keep LogoutButton mounted so dismissing the menu cannot discard a
          pending sign-out or its error dialog. */}
      <div
        id="navbar-menu"
        ref={menuRef}
        hidden={!open}
        className={cn(
          "absolute top-[calc(100%+8px)] right-4 left-4 flex-col gap-1 rounded-xl border border-border bg-card p-2.5 shadow-lg shadow-primary/10 sm:right-0 sm:left-auto sm:w-60",
          open ? "flex" : "hidden",
        )}
      >
        <div className="flex flex-col gap-1 sm:hidden">
          <MenuNavLink href="/templates" onClick={closeMenu}>Templates</MenuNavLink>
          {isAdmin && <MenuNavLink href="/admin" onClick={closeMenu}>Admin</MenuNavLink>}
          {user ? (
            <MenuNavLink href="/dashboard" onClick={closeMenu}>Dashboard</MenuNavLink>
          ) : (
            <>
              <MenuNavLink href="/login" onClick={closeMenu}>Log masuk</MenuNavLink>
              <MenuNavLink href="/register" onClick={closeMenu} primary>
                Mula Sekarang
              </MenuNavLink>
            </>
          )}
        </div>
        {user && (
          <div role="group" aria-labelledby="navbar-account-heading" className="mt-2 border-t border-border pt-2 sm:mt-0 sm:border-0 sm:pt-0">
            <p id="navbar-account-heading" className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">Akaun</p>
            <LogoutButton className="w-full justify-start" fallbackFocusRef={buttonRef} />
          </div>
        )}
      </div>
    </div>
  )
}

function MenuNavLink({
  children,
  href,
  onClick,
  primary = false,
}: {
  children: React.ReactNode
  href: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "text-muted-foreground hover:bg-secondary hover:text-primary",
      )}
    >
      {children}
    </Link>
  )
}
