"use client"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useRef, useState, type RefObject } from "react"
import { LoaderCircle, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export function LogoutButton({
  className,
  fallbackFocusRef,
}: {
  className?: string
  fallbackFocusRef?: RefObject<HTMLButtonElement | null>
}) {
  const router = useRouter()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleLogout() {
    setIsPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push("/")
      router.refresh()
    } catch {
      setError(true)
      setIsPending(false)
    }
  }

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        className={cn(
          "rounded-lg px-3 font-medium text-muted-foreground hover:text-primary",
          className,
        )}
        onClick={handleLogout}
        disabled={isPending}
        aria-busy={isPending || undefined}
      >
        {isPending ? (
          <LoaderCircle size={16} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <LogOut size={16} className="shrink-0 text-primary/70" aria-hidden />
        )}
        <span aria-live="polite">{isPending ? "Logout…" : "Logout"}</span>
      </Button>
      <Dialog open={error} onOpenChange={setError}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            const button = buttonRef.current
            const target = button && !button.disabled && button.getClientRects().length
              ? button
              : fallbackFocusRef?.current
            if (target) {
              event.preventDefault()
              target.focus()
            }
          }}
        >
          <DialogTitle>Log keluar tidak berjaya</DialogTitle>
          <DialogDescription>
            Semak sambungan anda dan cuba lagi.
          </DialogDescription>
          <Button
            onClick={() => {
              setError(false)
              void handleLogout()
            }}
          >
            Cuba lagi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
