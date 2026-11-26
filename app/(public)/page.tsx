import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const TEMPLATE_PREVIEWS = [
  { id: "malay-wedding", name: "Malay Wedding", emoji: "🪷", bg: "#fdf6ec", accent: "#92450a" },
  { id: "chinese-wedding", name: "Chinese Wedding", emoji: "囍", bg: "#8b0000", accent: "#f5d060" },
  { id: "minimalist", name: "Modern Minimalist", emoji: "○", bg: "#f8f7f5", accent: "#333" },
]

const UPCOMING_TEMPLATE_PREVIEWS = [
  { id: "malay-wedding-v2", name: "Malay Wedding Premium", emoji: "🌸", bg: "#f0e6e8", accent: "#5f8263" },
  { id: "open-house-raya", name: "Open House Raya", emoji: "🌙", bg: "#f3f7ee", accent: "#5a7a45" },
  { id: "aqiqah", name: "Aqiqah", emoji: "🤲", bg: "#f7f5ef", accent: "#7a9e5a" },
  { id: "graduation", name: "Graduation Convocation", emoji: "🎓", bg: "var(--background)", accent: "var(--primary)" },
]

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient()
  const [{ data: { user } }, { data: templates }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("templates").select("id, name, category, thumbnail_url, price_myr").eq("is_active", true).limit(4),
  ])
  const activeTemplates = templates ?? []
  const popularTemplates = [
    ...activeTemplates.map((template) => ({ ...template, isAvailable: true })),
    ...UPCOMING_TEMPLATE_PREVIEWS.filter(
      (template) => !activeTemplates.some((active) => active.id === template.id)
    ).map((template) => ({ ...template, isAvailable: false, price_myr: null })),
  ].slice(0, 4)

  return (
    <div style={{ background: "var(--background)" }}>
      {/* ── Hero ── */}
      <section
        style={{
          background: "linear-gradient(160deg, #f8f3ea 0%, var(--background) 60%, var(--secondary) 100%)",
          padding: "80px 24px 80px",
          textAlign: "center",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#f0dfa8",
              color: "#6b4500",
              fontSize: 11,
              fontWeight: 700,
              padding: "5px 14px",
              borderRadius: 20,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 28,
              fontFamily: "var(--font-jakarta), sans-serif",
            }}
          >
            🇲🇾 Platform Jemputan Digital Malaysia
          </div>

          <h1
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "clamp(42px, 7vw, 72px)",
              fontWeight: 600,
              color: "var(--primary)",
              lineHeight: 1.08,
              margin: "0 0 20px",
              letterSpacing: "-0.01em",
            }}
          >
            Jemputan Digital
            <br />
            <span style={{ color: "var(--accent)" }}>Yang Indah & Bermakna</span>
          </h1>

          <p
            style={{
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: 17,
              color: "var(--muted-foreground)",
              lineHeight: 1.65,
              maxWidth: 520,
              margin: "0 auto 36px",
            }}
          >
            Cipta jemputan digital untuk perkahwinan, hari jadi, dan majlis korporat.
            Kongsi pautan. Jejaki RSVP. Terima hadiah. Semua dalam satu platform.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: 56,
            }}
          >
            <Link
              href="/templates"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 50,
                padding: "0 28px",
                background: "var(--primary)",
                color: "var(--background)",
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Lihat Templates →
            </Link>
            <Link
              href={user ? "/dashboard" : "/register"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 50,
                padding: "0 28px",
                background: "transparent",
                color: "var(--primary)",
                border: "1.5px solid var(--primary)",
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              {user ? "Pergi ke Dashboard →" : "Daftar Percuma"}
            </Link>
          </div>

          {/* Floating template card previews */}
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {TEMPLATE_PREVIEWS.map((t, i) => (
              <Link
                key={t.id}
                href={`/templates/${t.id}`}
                style={{
                  width: 130,
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 12px 40px color-mix(in srgb, var(--primary) 15%, transparent)",
                  transform: `rotate(${(i - 1) * 4}deg) translateY(${i === 1 ? -12 : 0}px)`,
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                <div
                  style={{
                    aspectRatio: "3/4",
                    background: t.bg,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(160deg, ${t.bg} 0%, ${t.accent}22 100%)`,
                    }}
                  />
                  <span style={{ fontSize: 32, position: "relative", zIndex: 1 }}>{t.emoji}</span>
                  <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                    <p
                      style={{
                        fontFamily: "var(--font-cormorant), serif",
                        fontSize: 14,
                        fontWeight: 600,
                        color: t.accent,
                        margin: "0 0 2px",
                      }}
                    >
                      Sarah & Adam
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-jakarta), sans-serif",
                        fontSize: 9,
                        color: t.accent,
                        opacity: 0.7,
                        margin: 0,
                        letterSpacing: "0.08em",
                      }}
                    >
                      26 · 12 · 2026
                    </p>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: t.accent,
                      opacity: 0.5,
                    }}
                  />
                </div>
                <div style={{ padding: "8px 10px", background: "#fff" }}>
                  <p
                    style={{
                      fontFamily: "var(--font-jakarta), sans-serif",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--foreground)",
                      margin: 0,
                    }}
                  >
                    {t.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding: "80px 24px", background: "var(--background)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 40,
              fontWeight: 600,
              color: "var(--primary)",
              textAlign: "center",
              margin: "0 0 8px",
            }}
          >
            Cara Penggunaan
          </h2>
          <p
            style={{
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: 15,
              color: "var(--muted-foreground)",
              textAlign: "center",
              marginBottom: 56,
            }}
          >
            Mudah. Cepat. Bermakna.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 32,
            }}
          >
            {[
              {
                n: "01",
                title: "Pilih Template",
                desc: "Pilih daripada reka bentuk yang cantik, sesuai dengan tema majlis anda.",
              },
              {
                n: "02",
                title: "Sesuaikan & Bayar",
                desc: "Isi butiran majlis, muat naik foto, dan buat pembayaran sekali sahaja.",
              },
              {
                n: "03",
                title: "Kongsi & Pantau RSVP",
                desc: "Dapatkan pautan terus. Pantau siapa yang hadir dari dashboard anda.",
              },
            ].map((s) => (
              <div key={s.n} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "var(--primary)",
                    color: "#fff",
                    fontFamily: "var(--font-cormorant), serif",
                    fontSize: 18,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {s.n}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "var(--font-jakarta), sans-serif",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--foreground)",
                      margin: "0 0 8px",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-jakarta), sans-serif",
                      fontSize: 14,
                      color: "var(--muted-foreground)",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Template Preview ── */}
      <section style={{ padding: "80px 24px", background: "var(--secondary)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 40,
              fontWeight: 600,
              color: "var(--primary)",
              textAlign: "center",
              margin: "0 0 8px",
            }}
          >
            Template Popular
          </h2>
          <p
            style={{
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: 15,
              color: "var(--muted-foreground)",
              textAlign: "center",
              marginBottom: 40,
            }}
          >
            Direka khas untuk kepelbagaian budaya Malaysia
          </p>

          {popularTemplates.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 20,
                marginBottom: 36,
              }}
            >
              {popularTemplates.map((t) => {
                const preview =
                  TEMPLATE_PREVIEWS.find((p) => p.id === t.id) ||
                  UPCOMING_TEMPLATE_PREVIEWS.find((p) => p.id === t.id) ||
                  TEMPLATE_PREVIEWS[0]
                return (
                  <Link
                    key={t.id}
                    href={`/templates/${t.id}`}
                    style={{
                      background: "#fff",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      overflow: "hidden",
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "3/4",
                        background: preview.bg,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        position: "relative",
                      }}
                    >
                      {!t.isAvailable && (
                        <span
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            zIndex: 1,
                            background: "color-mix(in srgb, var(--primary) 88%, transparent)",
                            color: "#fff",
                            borderRadius: 20,
                            padding: "3px 8px",
                            fontFamily: "var(--font-jakarta), sans-serif",
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          Akan Datang
                        </span>
                      )}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: `linear-gradient(160deg, ${preview.bg} 0%, ${preview.accent}22 100%)`,
                        }}
                      />
                      <span style={{ fontSize: 36, position: "relative", zIndex: 1 }}>
                        {preview.emoji}
                      </span>
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: preview.accent,
                          opacity: 0.5,
                        }}
                      />
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <p
                        style={{
                          fontFamily: "var(--font-jakarta), sans-serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--foreground)",
                          margin: "0 0 2px",
                        }}
                      >
                        {t.name}
                      </p>
                      {t.isAvailable ? (
                        <p
                          style={{
                            fontFamily: "var(--font-jakarta), sans-serif",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--accent)",
                            margin: 0,
                          }}
                        >
                          RM {((t.price_myr ?? 0) / 100).toFixed(0)}
                        </p>
                      ) : (
                        <p
                          style={{
                            fontFamily: "var(--font-jakarta), sans-serif",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--muted-foreground)",
                            margin: 0,
                          }}
                        >
                          Pratonton sahaja →
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p
                style={{
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 14,
                  color: "var(--muted-foreground)",
                }}
              >
                Templates akan tersedia tidak lama lagi.
              </p>
            </div>
          )}

          <div style={{ textAlign: "center" }}>
            <Link
              href="/templates"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 40,
                padding: "0 20px",
                background: "transparent",
                color: "var(--primary)",
                border: "1.5px solid var(--primary)",
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Lihat Semua Templates →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ padding: "80px 24px", background: "var(--background)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 40,
              fontWeight: 600,
              color: "var(--primary)",
              textAlign: "center",
              margin: "0 0 8px",
            }}
          >
            Harga Jelas, Tiada Yuran Tersembunyi
          </h2>
          <p
            style={{
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: 15,
              color: "var(--muted-foreground)",
              textAlign: "center",
              marginBottom: 44,
            }}
          >
            Bayar sekali. Kongsi selamanya.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                label: "Hari Jadi & Ulang Tahun",
                price: "Dari RM 39",
                items: ["Birthday", "Baby Shower", "Aqiqah"],
                highlight: false,
              },
              {
                label: "Perkahwinan",
                price: "Dari RM 39",
                items: ["Malay Wedding", "Chinese Wedding", "Minimalist"],
                highlight: true,
              },
              {
                label: "Korporat",
                price: "Dari RM 49",
                items: ["Annual Dinner", "Product Launch", "Workshop"],
                highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.label}
                style={{
                  border: `${tier.highlight ? 2 : 1}px solid ${tier.highlight ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: 16,
                  padding: "28px 24px",
                  textAlign: "center",
                  position: "relative",
                  background: tier.highlight ? "var(--primary)" : "#fff",
                }}
              >
                {tier.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--accent)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 12px",
                      borderRadius: 20,
                      letterSpacing: "0.08em",
                      fontFamily: "var(--font-jakarta), sans-serif",
                    }}
                  >
                    POPULAR
                  </div>
                )}
                <p
                  style={{
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    color: tier.highlight ? "color-mix(in srgb, var(--background) 50%, transparent)" : "var(--muted-foreground)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    margin: "0 0 12px",
                  }}
                >
                  {tier.label}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
                    fontSize: 48,
                    fontWeight: 600,
                    color: tier.highlight ? "#f0dfa8" : "var(--primary)",
                    margin: "0 0 20px",
                    lineHeight: 1,
                  }}
                >
                  {tier.price}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginBottom: 24,
                  }}
                >
                  {[
                    "Template premium",
                    "RSVP tracking",
                    "Seksyen hadiah",
                    "Peta & kalender",
                    "Pautan boleh kongsi",
                  ].map((f) => (
                    <div
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: "var(--font-jakarta), sans-serif",
                        fontSize: 13,
                        color: tier.highlight ? "color-mix(in srgb, var(--background) 75%, transparent)" : "var(--muted-foreground)",
                      }}
                    >
                      <span
                        style={{
                          color: tier.highlight ? "#f0dfa8" : "#27ae60",
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>{" "}
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href="/templates"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 40,
                    background: tier.highlight ? "var(--accent)" : "transparent",
                    color: tier.highlight ? "#fff" : "var(--primary)",
                    border: tier.highlight ? "none" : "1.5px solid var(--primary)",
                    borderRadius: 8,
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Pilih Template
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section style={{ padding: "80px 24px", background: "var(--secondary)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 40,
              fontWeight: 600,
              color: "var(--primary)",
              textAlign: "center",
              margin: "0 0 40px",
            }}
          >
            Apa Kata Pelanggan
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                name: "Ainul Maisarah",
                event: "Walimatul Urus",
                quote:
                  "Semua tetamu puji jemputan kami. Tak payah print, semua scan QR je. Mudah sangat!",
              },
              {
                name: "Kenny Tan",
                event: "Wedding",
                quote:
                  "The gift registry feature is a game-changer. Our guests loved being able to reserve gifts online.",
              },
              {
                name: "Priya Nair",
                event: "Birthday Party",
                quote:
                  "I created my invitation in 10 minutes. The RSVP tracking saved me so much time and stress.",
              },
            ].map((r) => (
              <div
                key={r.name}
                style={{
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "24px",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
                    fontSize: 18,
                    fontStyle: "italic",
                    color: "var(--muted-foreground)",
                    lineHeight: 1.6,
                    margin: "0 0 16px",
                  }}
                >
                  &ldquo;{r.quote}&rdquo;
                </p>
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-jakarta), sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--foreground)",
                      margin: "0 0 2px",
                    }}
                  >
                    {r.name}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-jakarta), sans-serif",
                      fontSize: 11,
                      color: "var(--accent)",
                      margin: 0,
                    }}
                  >
                    {r.event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section
        style={{
          padding: "80px 24px",
          background: "var(--primary)",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 44,
            fontWeight: 600,
            color: "var(--background)",
            margin: "0 0 16px",
            lineHeight: 1.15,
          }}
        >
          Siap untuk mencipta jemputan
          <br />
          yang tak terlupakan?
        </h2>
        <p
          style={{
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 16,
            color: "color-mix(in srgb, var(--background) 60%, transparent)",
            marginBottom: 36,
          }}
        >
          Sertai ribuan keluarga Malaysia yang telah berkongsi momen istimewa mereka.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/templates"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 50,
              padding: "0 28px",
              background: "var(--accent)",
              color: "#fff",
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Mulakan Sekarang →
          </Link>
          {!user && (
          <Link
            href="/register"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 50,
              padding: "0 28px",
              background: "transparent",
              color: "var(--background)",
              border: "1.5px solid rgba(255,255,255,0.5)",
              fontFamily: "var(--font-jakarta), sans-serif",
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Daftar Percuma
          </Link>
          )}
        </div>
      </section>
    </div>
  )
}
