"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { friendlyAuthError } from "@/lib/auth/errors"
import { signInDestination, safeRedirectPath } from "@/lib/auth/redirect"
import { KamyLogo } from "@/components/KamyLogo"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"))

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(friendlyAuthError(error.message))
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single()
    router.push(signInDestination(profile?.role, redirectTo))
    router.refresh()
  }

  async function handleGoogleLogin() {
    setError("")
    setGoogleLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${redirectTo ? `?${new URLSearchParams({ redirectTo })}` : ""}`,
      },
    })
    if (error) {
      setError(friendlyAuthError(error.message))
      setGoogleLoading(false)
    }
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
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "inline-block",
              marginBottom: 8,
            }}
          >
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
            Log masuk ke akaun anda
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
          {error && (
            <div
              role="alert"
              id="login-error"
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
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <FieldLabel label="E-mel" required>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="anda@contoh.com"
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                style={inputStyle}
              />
            </FieldLabel>
            <FieldLabel label="Kata Laluan" required>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                style={inputStyle}
              />
            </FieldLabel>
            <div style={{ textAlign: "right", marginTop: -6 }}>
              <Link
                href="/forgot-password"
                style={{
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  textDecoration: "none",
                }}
              >
                Lupa kata laluan?
              </Link>
            </div>
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
              {loading ? "Log masuk..." : "Log Masuk"}
            </button>
          </form>

          <div
            style={{
              position: "relative",
              margin: "16px 0",
              textAlign: "center",
            }}
          >
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

          <button
            type="button"
            onClick={handleGoogleLogin}
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
            }}
          >
            <GoogleIcon />
            {googleLoading
              ? "Menyambung ke Google..."
              : "Teruskan dengan Google"}
          </button>
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
          Belum ada akaun?{" "}
          <Link
            href="/register"
            style={{
              color: "var(--primary)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Daftar percuma
          </Link>
        </p>
      </div>
    </div>
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

function GoogleIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--background)",
          }}
        >
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
