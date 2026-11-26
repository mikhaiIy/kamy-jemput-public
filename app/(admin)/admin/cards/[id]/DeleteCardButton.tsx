"use client"
import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { adminDeleteCardAction } from "./actions"
export function DeleteCardButton({ cardId }: { cardId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!pending) {
          setOpen(v)
          setError("")
        }
      }}
    >
      <DialogTrigger asChild>
        <button className="admin-secondary text-destructive">Padam jemputan</button>
      </DialogTrigger>
      <DialogContent busy={pending} className="admin-workspace min-h-0">
        <DialogTitle>
          {error ? "Jemputan tidak boleh dipadamkan" : "Padam jemputan ini?"}
        </DialogTitle>
        <DialogDescription>
          {error ||
            "Jemputan dan respons RSVP akan dipadamkan secara kekal. Tindakan ini tidak boleh dibatalkan."}
        </DialogDescription>
        <div className="flex justify-end gap-3">
          {error ? (
            <button className="admin-button" onClick={() => setOpen(false)}>
              Faham
            </button>
          ) : (
            <>
              <button
                className="admin-secondary"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Batal
              </button>
              <button
                className="admin-button !border-destructive !bg-destructive"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    try {
                      const result = await adminDeleteCardAction(cardId)
                      if (result.error) setError(result.error)
                    } catch {
                      setError(
                        "Tindakan tidak dapat diselesaikan. Semak sambungan dan cuba semula.",
                      )
                    }
                  })
                }
              >
                {pending ? "Memadam…" : "Padam jemputan"}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
