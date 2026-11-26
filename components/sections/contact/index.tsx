"use client"

import { z } from "zod"
import { useState } from "react"
import { defineSection } from "@/lib/sections/types"
import { colorsFor } from "@/lib/sections/theme"
import type { SectionRenderer, SectionFormComponent } from "@/lib/sections/types"
import { SectionShell } from "../_shared"

const List: SectionRenderer<"contact"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  // Tolerate legacy/empty data: some cards on disk still carry the old
  // `{ contacts }` shape from earlier branch state.
  const items =
    (Array.isArray(data.items) ? data.items : undefined) ??
    ((data as unknown as { contacts?: typeof data.items }).contacts) ??
    []
  if (!items.length) return null
  return (
    <SectionShell theme={theme} title="Hubungi">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((ct, i) => (
          <a
            key={i}
            href={`tel:${ct.phone}`}
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              background: i === 0 ? c.accent : "transparent",
              color: i === 0 ? "#fff" : c.text,
              border: `1.5px solid ${i === 0 ? "transparent" : c.border}`,
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{ct.name}</div>
              {ct.role && (
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 1 }}>
                  {ct.role}
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{ct.phone}</div>
          </a>
        ))}
      </div>
    </SectionShell>
  )
}

const ContactForm: SectionFormComponent<"contact"> = ({ data, onChange }) => {
  const [items, setItems] = useState(data.items)

  function commit(next: typeof items) {
    setItems(next)
    onChange({ items: next })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <div
          key={i}
          // se-contact-row lets the narrow mobile sheet pan the row sideways
          // instead of clipping the phone number and the role.
          className="se-contact-row"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr auto",
            gap: 8,
          }}
        >
          <input
            value={item.name}
            placeholder="Nama"
            onChange={(e) =>
              commit(items.map((it, idx) => (idx === i ? { ...it, name: e.target.value } : it)))
            }
            style={input}
          />
          <input
            value={item.phone}
            placeholder="Telefon"
            onChange={(e) =>
              commit(items.map((it, idx) => (idx === i ? { ...it, phone: e.target.value } : it)))
            }
            style={input}
          />
          <input
            value={item.role || ""}
            placeholder="Peranan (pilihan)"
            onChange={(e) =>
              commit(items.map((it, idx) => (idx === i ? { ...it, role: e.target.value } : it)))
            }
            style={input}
          />
          <button
            type="button"
            onClick={() => commit(items.filter((_, idx) => idx !== i))}
            style={removeBtn}
            aria-label="Buang"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...items, { name: "", phone: "", role: "" }])}
        style={addBtn}
      >
        + Tambah Kenalan
      </button>
    </div>
  )
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1.5px solid #e2d8cc",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "var(--font-jakarta), sans-serif",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
}

const removeBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "1px solid #e2d8cc",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  fontSize: 18,
  color: "#9a8878",
}

const addBtn: React.CSSProperties = {
  padding: "8px 14px",
  border: "1.5px dashed #c9984a",
  borderRadius: 8,
  background: "transparent",
  color: "#c9984a",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--font-jakarta), sans-serif",
}

export const contactModule = defineSection<"contact">({
  type: "contact",
  label: { en: "Contact", ms: "Hubungi" },
  schema: z.object({
    items: z.array(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        role: z.string().optional(),
      })
    ),
  }),
  variants: { list: List },
  variantLabels: { list: "Senarai" },
  defaultVariant: "list",
  defaultData: {
    items: [{ name: "Sarah", phone: "+60 12-345 6789", role: "Pengantin" }],
  },
  appliesTo: "all",
  customForm: ContactForm,
})
