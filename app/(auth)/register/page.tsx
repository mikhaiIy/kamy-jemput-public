"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { friendlyAuthError } from "@/lib/auth/errors"
import { KamyLogo } from "@/components/KamyLogo"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleGoogleSignUp() {
    setError("")
    setGoogleLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=/dashboard`,
      },
    })
    if (error) {
      setError(friendlyAuthError(error.message))
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!consent) {
      setError("Anda perlu bersetuju dengan Dasar Privasi untuk mencipta akaun.")
      return
    }

    if (password.length < 8) {
      setError("Kata laluan mestilah sekurang-kurangnya 8 aksara.")
      return
    }

    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (signUpError) {
      setError(friendlyAuthError(signUpError.message))
      setLoading(false)
      return
    }

    if (!signUpData.session) {
      setConfirmationSent(true)
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase.from("users").update({ name }).eq("id", user.id)
    }

    router.push("/dashboard")
    router.refresh()
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
            Cipta akaun percuma anda
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
          {confirmationSent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <p style={{ fontFamily: "var(--font-jakarta), sans-serif", fontSize: 15, fontWeight: 600, color: "var(--primary)" }}>Semak e-mel anda untuk pengesahan</p>
              <p style={{ fontFamily: "var(--font-jakarta), sans-serif", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>Kami telah menghantar pautan pengesahan ke {email}. Sila sahkan e-mel sebelum log masuk.</p>
            </div>
          ) : <>
          {error && (
            <div role="alert" id="register-error"
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

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            style={{
              width: "100%",
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "transparent",
              color: "var(--primary)",
              border: "1.5px solid var(--border)",
              borderRadius: 8,
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: googleLoading ? "not-allowed" : "pointer",
              marginBottom: 16,
            }}
          >
            <GoogleIcon />
            {googleLoading ? "Menyambung ke Google..." : "Daftar dengan Google"}
          </button>

          <div style={{ position: "relative", margin: "0 0 16px", textAlign: "center" }}>
            <div style={{ height: 1, background: "var(--border)" }} />
            <span
              style={{
                position: "absolute",
                top: -9,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#fff",
                padding: "0 12px",
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 11,
                color: "var(--muted-foreground)",
              }}
            >
              ATAU
            </span>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}
          >
            <FieldLabel label="Nama Penuh" required>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama anda"
                aria-invalid={!!error}
                aria-describedby={error ? "register-error" : undefined}
                style={inputStyle}
              />
            </FieldLabel>
            <FieldLabel label="E-mel" required>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="anda@contoh.com"
                aria-invalid={!!error}
                aria-describedby={error ? "register-error" : undefined}
                style={inputStyle}
              />
            </FieldLabel>
            <FieldLabel label="Kata Laluan" required>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 aksara"
                aria-invalid={!!error}
                aria-describedby={error ? "register-error" : undefined}
                style={inputStyle}
              />
            </FieldLabel>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                cursor: "pointer",
                marginBottom: 2,
              }}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                style={{ marginTop: 3, accentColor: "var(--primary)", width: 15, height: 15 }}
              />
              <span
                style={{
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  lineHeight: 1.55,
                }}
              >
                Saya bersetuju dengan{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}
                >
                  Dasar Privasi
                </Link>{" "}
                dan{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}
                >
                  Terma Perkhidmatan
                </Link>{" "}
                kamy (PDPA)
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !consent}
              style={{
                height: 44,
                background: loading || !consent ? "var(--muted-foreground)" : "var(--primary)",
                color: "var(--background)",
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                cursor: loading || !consent ? "not-allowed" : "pointer",
                opacity: !consent ? 0.6 : 1,
              }}
            >
              {loading ? "Mendaftar..." : "Daftar Sekarang"}
            </button>
          </form>
          </>}
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
          Sudah ada akaun?{" "}
          <Link
            href="/login"
            style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}
          >
            Log masuk
          </Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function FieldLabel({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
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
        {label}
        {required && <span style={{ color: "#c0392b" }}> *</span>}
      </span>
      {children}
    </label>
  )
}

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
