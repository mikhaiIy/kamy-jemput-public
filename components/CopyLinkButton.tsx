"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CopyLinkButtonProps {
  url: string
  compact?: boolean
}

export function CopyLinkButton({ url, compact = false }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement("input")
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (compact)
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        aria-live="polite"
      >
        {copied ? (
          <Check size={13} aria-hidden />
        ) : (
          <Copy size={13} aria-hidden />
        )}
        {copied ? "Disalin!" : "Salin pautan"}
      </Button>
    )

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 12,
          color: "var(--muted-foreground)",
          background: "var(--secondary)",
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          wordBreak: "break-all",
          flex: 1,
          minWidth: 0,
        }}
      >
        {url}
      </span>
      <button
        onClick={handleCopy}
        style={{
          height: 34,
          padding: "0 14px",
          background: copied ? "#27ae60" : "var(--primary)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontFamily: "var(--font-jakarta), sans-serif",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        {copied ? "✓ Disalin!" : "Salin Pautan"}
      </button>
    </div>
  )
}
