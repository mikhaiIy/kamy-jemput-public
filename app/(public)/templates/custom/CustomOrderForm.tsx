"use client"

import { useState, type CSSProperties, type FormEvent } from "react"
import styles from "./CustomOrderForm.module.css"

const EVENT_TYPES = [
  { value: "wedding_malay", label: "Perkahwinan Melayu" },
  { value: "wedding_chinese", label: "Perkahwinan Cina" },
  { value: "wedding_indian", label: "Perkahwinan India" },
  { value: "wedding_general", label: "Perkahwinan Lain" },
  { value: "open_house", label: "Rumah Terbuka" },
  { value: "engagement", label: "Pertunangan" },
  { value: "aqiqah", label: "Aqiqah / Cukur Jambul" },
  { value: "birthday", label: "Hari Jadi" },
  { value: "anniversary", label: "Ulangtahun" },
  { value: "khenduri", label: "Kenduri / Doa Selamat" },
  { value: "corporate", label: "Korporat" },
  { value: "other", label: "Lain-lain" },
]

const BUDGETS = [
  { value: "under_100", label: "Bawah RM 100" },
  { value: "100_300", label: "RM 100 – 300" },
  { value: "300_700", label: "RM 300 – 700" },
  { value: "above_700", label: "RM 700+" },
]

export function CustomOrderForm() {
  const [state, setState] = useState<
    "idle" | "submitting" | "ok" | { err: string }
  >("idle")

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setState("submitting")
    try {
      const res = await fetch("/api/custom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: fd.get("eventType"),
          brief: fd.get("brief"),
          contactName: fd.get("contactName"),
          contactPhone: fd.get("contactPhone"),
          contactEmail: fd.get("contactEmail"),
          budgetBand: fd.get("budgetBand"),
          referenceLinks: fd.get("referenceLinks"),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Hantar gagal")
      }
      setState("ok")
    } catch (err) {
      setState({ err: err instanceof Error ? err.message : "Hantar gagal" })
    }
  }

  if (state === "ok") {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #d8e6d2",
          borderRadius: 14,
          padding: "32px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 36, marginBottom: 8 }}>📨</p>
        <h2 style={{ color: "var(--primary)", margin: "0 0 8px" }}>
          Terima kasih!
        </h2>
        <p style={{ color: "var(--muted-foreground)", margin: 0, fontSize: 14 }}>
          Permintaan anda telah dihantar. Kami akan hubungi anda dalam 2 hari
          bekerja.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Jenis Majlis *">
        <select name="eventType" required className={styles.input} style={inputStyle}>
          <option value="">— Pilih —</option>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Apa yang anda perlukan? *"
        hint="Terangkan reka bentuk, nada (formal/santai), ciri istimewa, dll."
      >
        <textarea
          name="brief"
          required
          rows={5}
          placeholder="Contoh: kad perkahwinan Indian-Muslim, fond floral, dengan ang pao QR, RSVP per-keluarga."
          className={styles.input}
          style={{ ...inputStyle, height: "auto", resize: "vertical", minHeight: 120 }}
        />
      </Field>

      <Field label="Bajet (anggaran)" hint="Untuk membantu kami cadang pilihan yang sesuai.">
        <select name="budgetBand" className={styles.input} style={inputStyle}>
          <option value="">— Pilih (pilihan) —</option>
          {BUDGETS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Pautan rujukan (pilihan)" hint="Pinterest, Behance, contoh kad yang anda suka.">
        <input
          name="referenceLinks"
          type="text"
          placeholder="https://… (satu setiap baris)"
          className={styles.input}
          style={inputStyle}
        />
      </Field>

      <div className={styles.contactRow}>
        <Field label="Nama Penuh *">
          <input name="contactName" required className={styles.input} style={inputStyle} />
        </Field>
        <Field label="Telefon (WhatsApp) *">
          <input
            name="contactPhone"
            required
            type="tel"
            placeholder="+60 12-345 6789"
            className={styles.input}
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="Email (pilihan)">
        <input name="contactEmail" type="email" className={styles.input} style={inputStyle} />
      </Field>

      {typeof state === "object" && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fff0ee",
            border: "1px solid #f5c6c0",
            borderRadius: 8,
            color: "#c0392b",
            fontSize: 13,
          }}
        >
          {state.err}
        </div>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        style={{
          marginTop: 4,
          background: "var(--primary)",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "14px 22px",
          fontSize: 14,
          fontWeight: 700,
          cursor: state === "submitting" ? "not-allowed" : "pointer",
          opacity: state === "submitting" ? 0.6 : 1,
        }}
      >
        {state === "submitting" ? "Menghantar…" : "Hantar Tempahan Khas"}
      </button>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontFamily: "var(--font-jakarta), sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "#3d2c1e",
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span
          style={{
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 11,
            color: "var(--muted-foreground)",
          }}
        >
          {hint}
        </span>
      )}
    </label>
  )
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid var(--border)",
  borderRadius: 8,
  fontFamily: "var(--font-jakarta), sans-serif",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
}
