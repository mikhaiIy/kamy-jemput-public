"use client"

import { z } from "zod"
import { useState } from "react"
import { defineSection } from "@/lib/sections/types"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer, SectionFormComponent } from "@/lib/sections/types"
import { SectionShell } from "../_shared"

const Tabbed: SectionRenderer<"wishlist"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const banks = Array.isArray(data.banks) ? data.banks : []
  const qrCodes = Array.isArray(data.qrCodes) ? data.qrCodes : []
  const [tab, setTab] = useState<"bank" | "qr">(
    banks.length > 0 ? "bank" : "qr"
  )

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
  }

  return (
    <SectionShell theme={theme} title="Hadiah">
      {data.note && (
        <p style={{ textAlign: "center", fontSize: 13, color: c.muted, margin: "0 0 12px" }}>
          {data.note}
        </p>
      )}
      <div
        style={{
          display: "flex",
          background: c.card,
          borderRadius: 10,
          padding: 3,
          border: `1px solid ${c.border}`,
          marginBottom: 14,
        }}
      >
        {(["bank", "qr"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              background: tab === k ? c.accent : "transparent",
              color: tab === k ? "#fff" : c.text,
              opacity: tab === k ? 1 : 0.6,
              fontFamily: fontFor(theme, "body"),
            }}
          >
            {k === "bank" ? "Pindahan Bank" : "QR / e-Wallet"}
          </button>
        ))}
      </div>
      {tab === "bank" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {banks.map((b, i) => (
            <div
              key={i}
              style={{
                background: c.card,
                border: `1px solid ${c.border}`,
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: c.accent }}>
                  🏦 {b.bank}
                </span>
                <button
                  type="button"
                  onClick={() => copy(b.accNumber)}
                  style={copyBtn(c)}
                >
                  Salin
                </button>
              </div>
              <p style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, margin: "4px 0", letterSpacing: "0.08em", color: c.text }}>
                {b.accNumber}
              </p>
              <p style={{ fontSize: 11, color: c.muted, margin: 0 }}>{b.accName}</p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {qrCodes.map((q, i) => (
            <div
              key={i}
              style={{
                background: c.card,
                border: `1px solid ${c.border}`,
                borderRadius: 12,
                padding: "12px 16px",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: c.accent, margin: "0 0 4px" }}>
                {q.method}
              </p>
              <p style={{ fontSize: 12, color: c.text, margin: 0 }}>{q.name}</p>
              <p style={{ fontFamily: "monospace", fontSize: 12, color: c.muted }}>{q.phone}</p>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  )
}

function copyBtn(c: ReturnType<typeof colorsFor>): React.CSSProperties {
  return {
    fontSize: 11,
    color: c.gold,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  }
}

const WishlistForm: SectionFormComponent<"wishlist"> = ({ data, onChange }) => {
  const [tab, setTab] = useState<"bank" | "qr" | "note">("bank")
  const [banks, setBanks] = useState(data.banks)
  const [qrs, setQrs] = useState(data.qrCodes)
  const [note, setNote] = useState(data.note ?? "")

  function commit(b = banks, q = qrs, n = note) {
    onChange({ banks: b, qrCodes: q, note: n })
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["bank", "qr", "note"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            style={tabBtn(tab === k)}
          >
            {k === "bank" ? "Bank" : k === "qr" ? "QR" : "Nota"}
          </button>
        ))}
      </div>
      {tab === "bank" && (
        <RepeatingList
          items={banks}
          fields={[
            { key: "bank", label: "Nama Bank" },
            { key: "accNumber", label: "Nombor Akaun" },
            { key: "accName", label: "Nama Akaun" },
          ]}
          onChange={(next) => {
            setBanks(next)
            commit(next)
          }}
          addLabel="+ Tambah Akaun Bank"
          empty={{ bank: "", accNumber: "", accName: "" }}
        />
      )}
      {tab === "qr" && (
        <RepeatingList
          items={qrs}
          fields={[
            { key: "method", label: "Kaedah (DuitNow / Touch'n Go / GrabPay)" },
            { key: "name", label: "Nama" },
            { key: "phone", label: "Telefon / ID" },
          ]}
          onChange={(next) => {
            setQrs(next)
            commit(banks, next)
          }}
          addLabel="+ Tambah QR / e-Wallet"
          empty={{ method: "", name: "", phone: "" }}
        />
      )}
      {tab === "note" && (
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            commit(banks, qrs, e.target.value)
          }}
          placeholder="Nota tambahan untuk tetamu (pilihan)…"
          rows={3}
          style={taStyle}
        />
      )}
    </div>
  )
}

function RepeatingList<T extends Record<string, string>>({
  items,
  fields,
  onChange,
  addLabel,
  empty,
}: {
  items: T[]
  fields: { key: keyof T; label: string }[]
  onChange: (next: T[]) => void
  addLabel: string
  empty: T
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: 10,
            border: "1px solid #e2d8cc",
            borderRadius: 8,
          }}
        >
          {fields.map((f) => (
            <input
              key={String(f.key)}
              value={item[f.key]}
              placeholder={f.label}
              onChange={(e) =>
                onChange(
                  items.map((it, idx) =>
                    idx === i ? { ...it, [f.key]: e.target.value } : it
                  )
                )
              }
              style={inStyle}
            />
          ))}
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            style={removeBtnStyle}
          >
            Buang
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { ...empty }])}
        style={addBtnStyle}
      >
        {addLabel}
      </button>
    </div>
  )
}

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 16,
    border: `1.5px solid ${active ? "#2c1a4a" : "#e2d8cc"}`,
    background: active ? "#2c1a4a" : "transparent",
    color: active ? "#fff" : "#5a4838",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "var(--font-jakarta), sans-serif",
  }
}
const inStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1.5px solid #e2d8cc",
  borderRadius: 8,
  fontSize: 13,
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "var(--font-jakarta), sans-serif",
}
const taStyle: React.CSSProperties = { ...inStyle, height: "auto", resize: "vertical", minHeight: 80 }
const removeBtnStyle: React.CSSProperties = {
  alignSelf: "flex-end",
  padding: "6px 10px",
  border: "1px solid #e2d8cc",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  fontSize: 11,
  color: "#9a8878",
}
const addBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  border: "1.5px dashed #c9984a",
  borderRadius: 8,
  background: "transparent",
  color: "#c9984a",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
}

export const wishlistModule = defineSection<"wishlist">({
  type: "wishlist",
  label: { en: "Wishlist / Gift", ms: "Hadiah / DuitRaya" },
  tier: "free",
  schema: z.object({
    banks: z.array(
      z.object({
        bank: z.string().min(1),
        accNumber: z.string().min(1),
        accName: z.string().min(1),
      })
    ),
    qrCodes: z.array(
      z.object({
        method: z.string().min(1),
        name: z.string().min(1),
        phone: z.string().min(1),
      })
    ),
    note: z.string().optional(),
  }),
  variants: { tabbed: Tabbed },
  variantLabels: { tabbed: "Tab" },
  defaultVariant: "tabbed",
  defaultData: {
    banks: [{ bank: "Maybank", accNumber: "123456789012", accName: "Sarah" }],
    qrCodes: [{ method: "DuitNow", name: "Sarah", phone: "+60123456789" }],
    note: "",
  },
  appliesTo: "all",
  customForm: WishlistForm,
})
