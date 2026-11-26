import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { KamyLogo } from "./KamyLogo"
import { NavbarMenu } from "./NavbarMenu"
import styles from "./Navbar.module.css"

export async function Navbar() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from("users").select("role").eq("id", user.id).single()
    : { data: null }
  const isAdmin = profile?.role === "admin"

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "color-mix(in srgb, var(--background) 96%, transparent)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <nav
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: "var(--navbar-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" className={styles.logoLink} style={{ textDecoration: "none" }}>
          <KamyLogo size="sm" />
        </Link>

        <div className="flex items-center gap-2">
          <div style={{ alignItems: "center", gap: 4 }} className="flex max-sm:hidden">
            <NavLink href="/templates">Templates</NavLink>

            {user ? (
              <>
                {isAdmin && <NavLink href="/admin">Admin</NavLink>}
                <NavLink href="/dashboard">Dashboard</NavLink>
              </>
            ) : (
              <>
                <NavLink href="/login">Log masuk</NavLink>
                <Link
                  href="/register"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 34,
                    padding: "0 18px",
                    background: "var(--primary)",
                    color: "var(--background)",
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.01em",
                  }}
                >
                  Mula Sekarang
                </Link>
              </>
            )}
          </div>
          <NavbarMenu isAdmin={isAdmin} user={!!user} />
        </div>
      </nav>
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        fontFamily: "var(--font-jakarta), sans-serif",
        fontSize: 14,
        fontWeight: 500,
        color: "var(--muted-foreground)",
        padding: "6px 12px",
        borderRadius: 6,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  )
}
