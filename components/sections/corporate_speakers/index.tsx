"use client"

import { z } from "zod"
import { useState } from "react"
import { defineSection } from "@/lib/sections/types"
import { cardImageReferenceSchema } from "@/lib/card-image-reference"
import { colorsFor, fontFor } from "@/lib/sections/theme"
import type { SectionRenderer, SectionFormComponent } from "@/lib/sections/types"
import { SectionShell } from "../_shared"
import { ImageUploadField } from "../_image_upload"

const Grid: SectionRenderer<"corporate_speakers"> = ({ data, theme }) => {
  const c = colorsFor(theme)
  const speakers = Array.isArray(data.speakers) ? data.speakers : []
  if (!speakers.length) return null
  return (
    <SectionShell theme={theme} title="Speakers">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {speakers.map((s, i) => (
          <div
            key={i}
            style={{
              background: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 12,
              padding: 14,
              textAlign: "center",
            }}
          >
            {s.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.photoUrl}
                alt={s.name}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  objectFit: "cover",
                  marginBottom: 8,
                  border: `2px solid ${c.gold}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: `${c.gold}22`,
                  marginBottom: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: c.muted,
                  fontSize: 22,
                }}
              >
                👤
              </div>
            )}
            <p
              style={{
                fontFamily: fontFor(theme, "display"),
                fontSize: 14,
                fontWeight: 600,
                color: c.accent,
                margin: "0 0 2px",
              }}
            >
              {s.name}
            </p>
            <p style={{ fontSize: 11, color: c.muted, margin: 0 }}>{s.role}</p>
            {s.bio && (
              <p
                style={{
                  fontSize: 11,
                  color: c.text,
                  opacity: 0.7,
                  margin: "6px 0 0",
                  lineHeight: 1.4,
                }}
              >
                {s.bio}
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  )
}

const SpeakersForm: SectionFormComponent<"corporate_speakers"> = ({
  data,
  onChange,
  cardId,
  userId,
}) => {
  const [items, setItems] = useState(data.speakers)
  function commit(next: typeof items) {
    setItems(next)
    onChange({ speakers: next })
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((sp, i) => (
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
          <input
            value={sp.name}
            placeholder="Nama Penuh"
            onChange={(e) =>
              commit(items.map((it, idx) => (idx === i ? { ...it, name: e.target.value } : it)))
            }
            style={inStyle}
          />
          <input
            value={sp.role}
            placeholder="Jawatan / Title"
            onChange={(e) =>
              commit(items.map((it, idx) => (idx === i ? { ...it, role: e.target.value } : it)))
            }
            style={inStyle}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#5a4a3a" }}>
              Foto (pilihan)
            </label>
            <ImageUploadField
              cardId={cardId ?? ""}
              userId={userId ?? ""}
              sectionType="corporate_speakers"
              value={sp.photoUrl ?? ""}
              onChange={(url) =>
                commit(items.map((it, idx) => (idx === i ? { ...it, photoUrl: url } : it)))
              }
              compact
            />
          </div>
          <textarea
            value={sp.bio ?? ""}
            placeholder="Bio ringkas (pilihan)"
            rows={2}
            onChange={(e) =>
              commit(items.map((it, idx) => (idx === i ? { ...it, bio: e.target.value } : it)))
            }
            style={{ ...inStyle, height: "auto", resize: "vertical" }}
          />
          <button
            type="button"
            onClick={() => commit(items.filter((_, idx) => idx !== i))}
            style={removeBtn}
          >
            Buang
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...items, { name: "", role: "", bio: "", photoUrl: "" }])}
        style={addBtn}
      >
        + Tambah Speaker
      </button>
    </div>
  )
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
const removeBtn: React.CSSProperties = {
  alignSelf: "flex-end",
  padding: "6px 10px",
  border: "1px solid #e2d8cc",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
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
}

export const corporateSpeakersModule = defineSection<"corporate_speakers">({
  type: "corporate_speakers",
  label: { en: "Speakers", ms: "Penceramah" },
  tier: "premium",
  schema: z.object({
    speakers: z.array(
      z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        bio: z.string().optional(),
        photoUrl: cardImageReferenceSchema.optional(),
      })
    ),
  }),
  variants: { grid: Grid },
  variantLabels: { grid: "Grid" },
  defaultVariant: "grid",
  defaultData: {
    speakers: [
      { name: "Dr. Ahmad bin Ali", role: "Keynote Speaker", bio: "", photoUrl: "" },
    ],
  },
  appliesTo: ["corporate_launch", "workshop_seminar", "corporate_dinner"],
  customForm: SpeakersForm,
})
