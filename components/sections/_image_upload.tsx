"use client"

import { useState, type ChangeEvent, type CSSProperties } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  buildCardAssetReference,
  CARD_ASSET_MIME_TYPES,
  MAX_CARD_ASSET_BYTES,
  normalizeCardAssetReference,
} from "@/lib/card-assets"

/**
 * Shared photo-upload field for the editor.
 *
 * Lives under components/sections/ (not inside SectionEditor.tsx) so Section
 * customForms can reuse it without importing the editor — that would create a
 * circular import (SectionEditor → registry → section module → SectionEditor).
 *
 * Uploads to the private `card-assets` bucket under
 * `cardId/sectionType/random-name.ext` and hands back a stable application
 * asset reference. Bytes are read later through the authenticated app route.
 */
export function ImageUploadField({
  cardId,
  userId,
  sectionType,
  value,
  onChange,
  compact = false,
}: {
  cardId: string
  userId: string
  sectionType: string
  value: string
  onChange: (url: string) => void
  /** Smaller preview, for fields inside repeating lists (gallery blocks etc.) */
  compact?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const previewSrc = value
    ? normalizeCardAssetReference(value, { cardId, userId }) ?? ""
    : ""

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_CARD_ASSET_BYTES) {
      setErr("Saiz fail melebihi 5MB.")
      return
    }
    if (!(CARD_ASSET_MIME_TYPES as readonly string[]).includes(file.type)) {
      setErr("Format foto mesti JPEG, PNG, WebP atau GIF.")
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1]
      const fileName = `${globalThis.crypto.randomUUID()}.${extension}`
      const path = `${cardId}/${sectionType}/${fileName}`
      const { error } = await supabase.storage
        .from("card-assets")
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: "no-store",
        })
      if (error) throw error
      onChange(buildCardAssetReference(cardId, sectionType, fileName))
    } catch (e) {
      console.error(e)
      setErr("Muat naik gagal.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {previewSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt="Pratonton"
          style={{
            width: "100%",
            maxHeight: compact ? 120 : 220,
            objectFit: "cover",
            borderRadius: 8,
            marginBottom: 8,
            border: "1px solid #e2d8cc",
          }}
        />
      )}
      <label style={fileLabelStyle}>
        {busy ? "Memuat naik…" : value ? "Tukar Foto" : "Muat Naik Foto"}
        <input
          type="file"
          accept="image/*"
          onChange={onPick}
          disabled={busy}
          style={{ display: "none" }}
          data-user-id={userId}
        />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          style={{
            marginLeft: 8,
            padding: "8px 12px",
            background: "transparent",
            border: "1px solid #e2d8cc",
            borderRadius: 8,
            color: "#9a8878",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Buang
        </button>
      )}
      {err && <div style={errorTextStyle}>{err}</div>}
    </div>
  )
}

const fileLabelStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  background: "#2c1a4a",
  color: "#fff",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
}

const errorTextStyle: CSSProperties = {
  fontSize: 12,
  color: "#c0392b",
}
