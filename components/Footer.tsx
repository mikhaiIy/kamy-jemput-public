import Link from "next/link"
import { KamyLogo } from "./KamyLogo"
import styles from "./Footer.module.css"

export function Footer() {
  return (
    <footer style={{ background: "var(--primary)", color: "var(--background)", padding: "52px 24px 32px" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 32,
        }}
      >
        <div>
          <KamyLogo dark />
          <p
            style={{
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: 13,
              color: "color-mix(in srgb, var(--background) 82%, transparent)",
              marginTop: 12,
              maxWidth: 220,
              lineHeight: 1.65,
            }}
          >
            Platform jemputan digital untuk Warga Malaysia.
          </p>
        </div>

        <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
          <FooterCol
            title="Produk"
            links={[
              { label: "Templates", href: "/templates" },
              { label: "Harga", href: "/templates" },
            ]}
          />
          <FooterCol
            title="Syarikat"
            links={[
              { label: "Privasi", href: "/privacy" },
              { label: "Terma", href: "/terms" },
            ]}
          />
        </div>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: "24px auto 0",
          paddingTop: 20,
          borderTop: "1px solid color-mix(in srgb, var(--background) 10%, transparent)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 12,
            color: "color-mix(in srgb, var(--background) 72%, transparent)",
          }}
        >
          © {new Date().getFullYear()} kamy. Hak cipta terpelihara.
        </span>
        <span
          style={{
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 12,
            color: "color-mix(in srgb, var(--background) 72%, transparent)",
          }}
        >
          🇲🇾 Dibuat dengan ❤ di Malaysia
        </span>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <p
        style={{
          fontFamily: "var(--font-jakarta), sans-serif",
          fontSize: 11,
          fontWeight: 700,
          color: "color-mix(in srgb, var(--background) 78%, transparent)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {title}
      </p>
      {links.map((l) => (
        <Link
          key={l.label}
          href={l.href}
          className={`${styles.footerLink} transition-colors hover:text-[#f0dfa8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0dfa8] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--primary)]`}
          style={{
            display: "block",
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 13,
            color: "color-mix(in srgb, var(--background) 90%, transparent)",
            marginBottom: 6,
            textDecoration: "none",
          }}
        >
          {l.label}
        </Link>
      ))}
    </div>
  )
}
