"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { deleteCardAction } from "@/app/actions/card"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { Button } from "@/components/ui/button"

export function DeleteCardButton({
  cardId,
  checkoutReserved,
}: {
  cardId: string
  checkoutReserved: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteCardAction(cardId)
        if (result.error) setError(result.error)
        else setOpen(false)
      } catch {
        setError("Jemputan tidak dapat dipadamkan. Sila cuba lagi.")
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
        onClick={() => {
          setError("")
          setOpen(true)
        }}
        title={
          checkoutReserved
            ? "Sesi pembayaran akan disahkan sebelum padam"
            : undefined
        }
      >
        <Trash2 size={14} aria-hidden />
        Padam draf
      </Button>
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        busy={isPending}
        destructive
        title="Padam jemputan ini?"
        description="Jemputan ini akan dipadamkan secara kekal. Tindakan ini tidak boleh dibatalkan."
        confirmLabel={isPending ? "Memadam…" : "Padam jemputan"}
        onConfirm={handleDelete}
      >
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </ConfirmationDialog>
    </>
  )
}
