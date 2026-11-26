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

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Kata laluan mesti sekurang-kurangnya 8 aksara.")
      return
    }

    if (password !== confirm) {
      setError("Kata laluan tidak sepadan. Sila cuba semula.")
      return
    }

    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(friendlyAuthError(error.message))
      return
    }

    setDone(true)
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
            Kata Laluan Baharu
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
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <p
                style={{
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--primary)",
                  marginBottom: 8,
                }}
              >
                Kata laluan berjaya ditukar!
              </p>
              <p
                style={{
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                }}
              >
                Anda kini boleh kembali ke papan pemuka.
              </p>
              <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 40, padding: "0 16px", background: "var(--primary)", color: "var(--background)", borderRadius: 8, textDecoration: "none", fontFamily: "var(--font-jakarta), sans-serif", fontSize: 13, fontWeight: 600 }}>
                Pergi ke Dashboard
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div role="alert" id="reset-password-error"
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
                    Kata Laluan Baharu <span style={{ color: "#c0392b" }}>*</span>
                  </span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 aksara"
                    aria-invalid={!!error}
                    aria-describedby={error ? "reset-password-error" : undefined}
                    style={inputStyle}
                  />
                </label>

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
                    Sahkan Kata Laluan <span style={{ color: "#c0392b" }}>*</span>
                  </span>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Ulangi kata laluan"
                    aria-invalid={!!error}
                    aria-describedby={error ? "reset-password-error" : undefined}
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
                  {loading ? "Menyimpan..." : "Simpan Kata Laluan Baharu"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
