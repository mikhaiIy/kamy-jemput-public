"use client"

import { useState } from "react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { friendlyAuthError } from "@/lib/auth/errors"
import { KamyLogo } from "@/components/KamyLogo"

const inputStyle: React.CSSProperties = {
  height: 40,
  padding: "0 12px",
  fontFamily: "var(--font-jakarta), sans-serif",
  fontSize: 14,
  color: "var(--foreground)",
  background: "#fff",
  border: "1.5px solid var(--border)",
  borderRadius: 8,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?redirectTo=/reset-password`,
    })

    setLoading(false)

    if (error) {
      setError(friendlyAuthError(error.message))
      return
    }

    setSent(true)
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-block", marginBottom: 8 }}>
            <KamyLogo size="md" />
          </Link>
          <p
            style={{
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: 14,
              color: "var(--muted-foreground)",
              marginTop: 8,
            }}
          >
            Tetapkan semula kata laluan anda
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "28px 24px",
            boxShadow: "0 4px 20px color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <p
                style={{
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--primary)",
                  marginBottom: 8,
                }}
              >
                Semak e-mel anda
              </p>
              <p
                style={{
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  lineHeight: 1.6,
                }}
              >
                Kami telah menghantar pautan tetapan semula kata laluan ke{" "}
                <strong style={{ color: "var(--primary)" }}>{email}</strong>. Sila semak folder inbox
                atau spam anda.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div role="alert" id="forgot-password-error"
                  style={{
                    marginBottom: 16,
                    padding: "10px 14px",
                    background: "#fff0ee",
                    border: "1px solid #f5c6c0",
                    borderRadius: 8,
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 13,
                    color: "#c0392b",
                  }}
                >
                  {error}
                </div>
              )}

              <p
                style={{
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  marginBottom: 20,
                  lineHeight: 1.6,
                }}
              >
                Masukkan e-mel anda dan kami akan menghantar pautan untuk menetapkan semula kata
                laluan.
              </p>

              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-jakarta), sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--muted-foreground)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    E-mel <span style={{ color: "#c0392b" }}>*</span>
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="anda@contoh.com"
                    aria-invalid={!!error}
                    aria-describedby={error ? "forgot-password-error" : undefined}
                    style={inputStyle}
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    height: 44,
                    background: loading ? "var(--muted-foreground)" : "var(--primary)",
                    color: "var(--background)",
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 8,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Menghantar..." : "Hantar Pautan Tetapan Semula"}
                </button>
              </form>
            </>
          )}
        </div>

        <p
          style={{
            textAlign: "center",
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 13,
            color: "var(--muted-foreground)",
            marginTop: 16,
          }}
        >
          <Link
            href="/login"
            style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}
          >
            ← Kembali ke Log Masuk
          </Link>
        </p>
      </div>
    </div>
  )
}
