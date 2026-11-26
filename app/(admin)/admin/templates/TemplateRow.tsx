"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

interface TemplateRowProps {
  id: string
  name: string
  category: string
  priceMyr: number
  isActive: boolean
}

export function TemplateRow({
  id,
  name,
  category,
  priceMyr,
  isActive,
}: TemplateRowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState((priceMyr / 100).toFixed(2))
  const [message, setMessage] = useState("")
  const [confirmDisable, setConfirmDisable] = useState(false)

  async function toggleActive() {
    setMessage("")
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/templates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !isActive }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          setMessage(body?.error || "Status template tidak dapat dikemas kini.")
          return
        }
        setConfirmDisable(false)
        router.refresh()
      } catch {
        setMessage("Status template tidak dapat dikemas kini.")
      }
    })
  }

  async function savePrice() {
    const price = Math.round(Number(priceInput) * 100)
    if (!Number.isFinite(price) || price <= 0) {
      setMessage("Masukkan harga RM yang sah.")
      return
    }

    setMessage("")
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/templates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price_myr: price }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          setMessage(body?.error || "Harga tidak dapat disimpan.")
          return
        }
        setEditingPrice(false)
        setMessage("Disimpan ✓")
        router.refresh()
      } catch {
        setMessage("Harga tidak dapat disimpan.")
      }
    })
  }

  return (
    <tr className="hover:bg-muted/50">
      <td className="font-medium">
        <p>{name}</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{id}</p>
      </td>
      <td className="px-4 py-3 text-muted-foreground capitalize">{category}</td>
      <td className="px-4 py-3">
        {editingPrice ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              aria-label={`Harga RM untuk ${name}`}
              disabled={isPending}
              className="admin-field w-28"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") savePrice()
                if (e.key === "Escape") setEditingPrice(false)
              }}
            />
            <button
              onClick={savePrice}
              disabled={isPending}
              className="text-xs text-green-600 hover:text-green-800 font-medium"
            >
              Simpan
            </button>
            <button
              onClick={() => setEditingPrice(false)}
              className="text-xs text-muted-foreground hover:text-muted-foreground"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setPriceInput((priceMyr / 100).toFixed(2))
              setMessage("")
              setEditingPrice(true)
            }}
            className="text-foreground hover:text-primary font-medium underline decoration-dotted underline-offset-4"
            title="Klik untuk edit harga"
          >
            RM {(priceMyr / 100).toFixed(2)}
            <span className="text-muted-foreground text-xs ml-1">✎</span>
          </button>
        )}
        {message && (
          <p
            role="status"
            className={`text-xs mt-1 ${message === "Disimpan ✓" ? "text-green-600" : "text-red-600"}`}
          >
            {message}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() =>
            isActive ? setConfirmDisable(true) : void toggleActive()
          }
          role="switch"
          aria-checked={isActive}
          aria-label={`Aktifkan ${name}`}
          disabled={isPending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isActive ? "bg-primary" : "bg-gray-300"
          } ${isPending ? "opacity-50" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="ml-2 text-xs text-muted-foreground">
          {isActive ? "Aktif" : "Tidak aktif"}
        </span>
      </td>
      <td>
        <Link
          className="admin-link whitespace-nowrap"
          href={`/templates/preview/${id}`}
          target="_blank"
        >
          Lihat reka bentuk ↗
        </Link>
        <Dialog
          open={confirmDisable}
          onOpenChange={(v) => {
            if (!isPending) setConfirmDisable(v)
          }}
        >
          <DialogContent busy={isPending}
            className="admin-workspace min-h-0"
            onEscapeKeyDown={(e) => {
              if (isPending) e.preventDefault()
            }}
            onPointerDownOutside={(e) => {
              if (isPending) e.preventDefault()
            }}
          >
            <DialogTitle>Nyahaktifkan {name}?</DialogTitle>
            <DialogDescription>
              Template ini akan disembunyikan daripada galeri pelanggan.
              Jemputan sedia ada kekal.
            </DialogDescription>
            <DialogFooter>
              <button
                className="admin-secondary"
                disabled={isPending}
                onClick={() => setConfirmDisable(false)}
              >
                Batal
              </button>
              <button
                className="admin-button"
                disabled={isPending}
                onClick={toggleActive}
              >
                {isPending ? "Menyimpan…" : "Nyahaktifkan"}
              </button>
            </DialogFooter>
            {message && (
              <p role="alert" className="text-sm text-red-700">
                {message}
              </p>
            )}
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  )
}
