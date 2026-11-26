"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { updateCustomOrderAction } from "./actions"

const STATUSES = [
  { value: "new", label: "Baru" },
  { value: "in_review", label: "Disemak" },
  { value: "quoted", label: "Sebut Harga" },
  { value: "closed_won", label: "Berjaya" },
  { value: "closed_lost", label: "Tertutup" },
] as const

type Status = (typeof STATUSES)[number]["value"]

export function StatusUpdateForm({
  id,
  currentStatus,
  currentNotes,
}: {
  id: string
  currentStatus: Status
  currentNotes: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>(currentStatus)
  const [notes, setNotes] = useState(currentNotes)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  function save() {
    setSaved(false)
    setError("")
    startTransition(async () => {
      try {
        await updateCustomOrderAction(id, { status, adminNotes: notes })
        setSaved(true)
        router.refresh()
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Perubahan tidak dapat disimpan. Sila cuba lagi.",
        )
      }
    })
  }

  return (
    <div className="space-y-4">
      <label className="text-xs flex flex-col gap-1">
        <span className="text-muted-foreground font-medium">Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="admin-field"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs flex flex-col gap-1">
        <span className="text-muted-foreground font-medium">Nota admin</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Nota dalaman (tidak dilihat oleh pelanggan)…"
          className="admin-field w-full"
        />
      </label>

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="admin-button"
      >
        {pending ? "Menyimpan…" : saved ? "Disimpan ✓" : "Simpan"}
      </button>
      {error && (
        <p role="alert" className="basis-full text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
