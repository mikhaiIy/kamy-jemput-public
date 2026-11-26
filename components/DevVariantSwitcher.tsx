"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Variant = {
  id: string
  label: string
  hint: string
  swatch: string
}

const VARIANTS: Variant[] = [
  { id: "walimah",          label: "Walimah",          hint: "Malay / Islamic",   swatch: "linear-gradient(135deg,#1f6b4f,#c9a227 70%,#7c1f3a)" },
  { id: "romance_envelope", label: "Romance",          hint: "General wedding",   swatch: "linear-gradient(135deg,#a9646f,#c4a882 70%,#6f8268)" },
  { id: "double_happiness", label: "Double Happiness", hint: "Chinese 囍",         swatch: "linear-gradient(135deg,#c1272d,#d4af37 70%,#7a0f12)" },
  { id: "marigold",         label: "Marigold",         hint: "Indian",            swatch: "linear-gradient(135deg,#d2691e,#e0a92e 70%,#b0182b)" },
  { id: "confetti_pop",     label: "Confetti Pop",     hint: "Birthday / joyful", swatch: "linear-gradient(135deg,#ff5d8f,#ffd166 70%,#7ee0c6)" },
  { id: "boardroom_badge",  label: "Boardroom",        hint: "Corporate",         swatch: "linear-gradient(135deg,#26303f,#9aa3ad 70%,#3b82f6)" },
]

/**
 * Floating dev-only panel that lets you swap the rendered RSVP variant
 * (and the card's palette/fonts) without touching the editor. The page
 * server-renders the card, so we POST to /api/dev/preview-variant which
 * mutates the DB, then call router.refresh() to re-fetch.
 *
 * The parent only mounts this in non-production, so this component itself
 * doesn't need to re-check — but it does guard the network call defensively.
 */
export function DevVariantSwitcher({
  slug,
  initialVariant,
}: {
  slug: string
  initialVariant: string
}) {
  const router = useRouter()
  // Keep the compact control out of the RSVP form's way on small screens.
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(initialVariant)
  const [pending, setPending] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function pick(variantId: string) {
    setPending(variantId)
    setErr(null)
    try {
      const res = await fetch("/api/dev/preview-variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, variant: variantId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setActive(variantId)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed")
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open RSVP variant switcher"
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(20,18,28,0.88)",
          backdropFilter: "blur(14px) saturate(150%)",
          WebkitBackdropFilter: "blur(14px) saturate(150%)",
          color: "#fff",
          cursor: "pointer",
          fontSize: 22,
          lineHeight: 1,
          zIndex: 9999,
          boxShadow: "0 12px 28px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset",
          transition: "transform 160ms ease",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
        }}
      >
        ✦
      </button>

      {/* Panel */}
      <div
        aria-hidden={!open}
        style={{
          position: "fixed",
          right: 16,
          bottom: 80,
          width: 268,
          padding: 14,
          borderRadius: 18,
          background: "rgba(20,18,28,0.86)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
          color: "#fff",
          fontFamily: "var(--font-jakarta), system-ui, sans-serif",
          zIndex: 9998,
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(12px)",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms ease, transform 200ms ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
              fontWeight: 700,
            }}
          >
            RSVP variants
          </span>
          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            dev only
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {VARIANTS.map((v) => {
            const isActive = v.id === active
            const isPending = v.id === pending
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => pick(v.id)}
                disabled={!!pending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: `1px solid ${isActive ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.06)"}`,
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  color: "#fff",
                  cursor: pending ? "wait" : "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "background 140ms ease, border-color 140ms ease",
                  opacity: pending && !isPending ? 0.4 : 1,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: v.swatch,
                    flexShrink: 0,
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
                  }}
                />
                <span style={{ flex: 1, display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.005em" }}>
                    {v.label}
                  </span>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)" }}>
                    {v.hint}
                  </span>
                </span>
                {isPending ? (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>…</span>
                ) : isActive ? (
                  <span style={{ fontSize: 11, color: "#7ee0c6" }}>●</span>
                ) : null}
              </button>
            )
          })}
        </div>

        {err && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              background: "rgba(192,57,43,0.18)",
              color: "#ffb6ad",
              fontSize: 11,
              borderRadius: 8,
              border: "1px solid rgba(192,57,43,0.35)",
            }}
          >
            {err}
          </div>
        )}

        <p
          style={{
            margin: "12px 0 0",
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.02em",
            lineHeight: 1.5,
          }}
        >
          Mutates this card&apos;s palette + RSVP variant. Scroll to the bottom
          to see the form.
        </p>
      </div>
    </>
  )
}
