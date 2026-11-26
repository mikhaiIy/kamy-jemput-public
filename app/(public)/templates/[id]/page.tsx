import Link from "next/link"
import { isLegacyPreviewId } from "@/lib/preview-templates"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import styles from "./template-detail.module.css"

const TEMPLATE_META: Record<
  string,
  { emoji: string; bg: string; accent: string; desc: string; name: string; category: string; priceMyr?: number }
> = {
  "malay-wedding": {
    emoji: "🪷",
    bg: "#fdf6ec",
    accent: "#92450a",
    desc: "Tradisional & elegan dengan motif bunga",
    name: "Malay Wedding",
    category: "wedding",
  },
  "chinese-wedding": {
    emoji: "囍",
    bg: "#8b0000",
    accent: "#f5d060",
    desc: "Merah meriah dengan elemen budaya Cina",
    name: "Chinese Wedding",
    category: "wedding",
  },
  "malay-wedding-v2": {
    emoji: "🌸",
    bg: "#f0e6e8",
    accent: "#5f8263",
    desc: "Moden & kaya — songket sage/rose, floral SVG, galeri, peta Waze",
    name: "Malay Wedding Premium",
    category: "wedding",
    priceMyr: 9900,
  },
  "chinese-wedding-v2": {
    emoji: "🏮",
    bg: "#fff7e8",
    accent: "#8b0000",
    desc: "Merah & emas — 囍, tea ceremony, ang pao, guestbook",
    name: "Chinese Wedding Premium",
    category: "wedding",
    priceMyr: 9900,
  },
  "general-wedding": {
    emoji: "💍",
    bg: "var(--foreground)",
    accent: "#c4a882",
    desc: "Editoral mewah — hero gelap, skrip Great Vibes, gading/emas",
    name: "General Wedding",
    category: "wedding",
    priceMyr: 9900,
  },
  "sakura-story": {
    emoji: "🌸",
    bg: "#fffafb",
    accent: "#e8637f",
    desc: "Bercerita bab demi bab — tap-untuk-buka, foto 3D berlapis, galeri kolaj, kelopak sakura",
    name: "Sakura Story",
    category: "wedding",
    priceMyr: 12900,
  },
  "celestial-story": {
    emoji: "✨",
    bg: "#101528",
    accent: "#e8c97e",
    desc: "Malam berbintang — sentuh-untuk-nyala, foto bulan purnama, buruj kisah cinta, kira detik fasa bulan",
    name: "Celestial Story",
    category: "wedding",
    priceMyr: 13900,
  },
  "cinema-story": {
    emoji: "🎬",
    bg: "#fafaf9",
    accent: "#0d0d0d",
    desc: "Perkahwinan sebagai filem — title card ▶, kredit STARRING, episod kisah cinta, kira detik film leader",
    name: "Cinema Story",
    category: "wedding",
    priceMyr: 14900,
  },
  minimalist: {
    emoji: "○",
    bg: "#f8f7f5",
    accent: "#333",
    desc: "Bersih, moden, sesuai untuk semua majlis",
    name: "Minimalist",
    category: "wedding",
  },
  birthday: {
    emoji: "🎂",
    bg: "#fce4ec",
    accent: "#c2185b",
    desc: "Ceria & meriah untuk sambutan hari jadi",
    name: "Birthday",
    category: "birthday",
  },
  corporate: {
    emoji: "◆",
    bg: "#0f1f3d",
    accent: "#60a5fa",
    desc: "Profesional & formal untuk majlis korporat",
    name: "Corporate",
    category: "corporate",
  },
  "open-house-raya": {
    emoji: "🌙",
    bg: "#f3f7ee",
    accent: "#5a7a45",
    desc: "Rumah terbuka Aidilfitri — hijau pastel & emas",
    name: "Open House Raya",
    category: "open_house",
  },
  "engagement-malay": {
    emoji: "💍",
    bg: "#fdf6ec",
    accent: "#b8602a",
    desc: "Majlis pertunangan — amber rose, Great Vibes script",
    name: "Malay Engagement",
    category: "engagement",
  },
  aqiqah: {
    emoji: "🤲",
    bg: "#f7f5ef",
    accent: "#7a9e5a",
    desc: "Majlis aqiqah — sage ivory, info anak, doa",
    name: "Aqiqah",
    category: "aqiqah",
  },
  anniversary: {
    emoji: "🥂",
    bg: "var(--background)",
    accent: "var(--accent)",
    desc: "Sambutan anniversary — plum gold, guestbook, countdown",
    name: "Wedding Anniversary",
    category: "anniversary",
  },
  "baby-shower": {
    emoji: "🍼",
    bg: "#f7f5ef",
    accent: "#c87a9a",
    desc: "Lembut & manis — pastel, wishlist, dress code",
    name: "Baby Shower",
    category: "birthday",
  },
  "corporate-dinner": {
    emoji: "🏆",
    bg: "#fafafa",
    accent: "#1a1a1a",
    desc: "Malam tahunan — minimal ink, agenda, speakers, dress code",
    name: "Corporate Annual Dinner",
    category: "corporate",
  },
  graduation: {
    emoji: "🎓",
    bg: "var(--background)",
    accent: "var(--primary)",
    desc: "Konvokesyen — plum gold, program upacara, dress code",
    name: "Graduation Convocation",
    category: "graduation",
    priceMyr: 6900,
  },
  "gender-reveal": {
    emoji: "🎀",
    bg: "#fdf6ec",
    accent: "#92450a",
    desc: "Pink atau Biru? Countdown reveal, dress code team",
    name: "Gender Reveal",
    category: "gender_reveal",
    priceMyr: 4900,
  },
  "corporate-launch": {
    emoji: "🚀",
    bg: "#fafafa",
    accent: "#1a1a1a",
    desc: "Pelancaran produk — speakers, demo, networking",
    name: "Corporate Product Launch",
    category: "corporate",
    priceMyr: 9900,
  },
  "workshop-seminar": {
    emoji: "📋",
    bg: "#fafafa",
    accent: "#1a1a1a",
    desc: "Bengkel & seminar — agenda penuh, speakers, kapasiti terhad",
    name: "Workshop & Seminar",
    category: "corporate",
    priceMyr: 6900,
  },
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const meta = TEMPLATE_META[id]
  const title = meta ? `${meta.name} — kamy jemput` : "Template Preview"
  const description = meta?.desc ?? "Pratonton template jemputan digital kamy jemput."

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  }
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const meta = TEMPLATE_META[id]

  if (!meta) {
    const { notFound } = await import("next/navigation")
    notFound()
  }

  // Check if this template is purchasable (exists in DB)
  const supabase = await createSupabaseServerClient()
  const [{ data: template }, { data: { user } }] = await Promise.all([
    supabase
      .from("templates")
      .select("id, name, price_myr, type, theme, sections")
      .eq("id", id)
      .eq("is_active", true)
      .single(),
    supabase.auth.getUser(),
  ])

  // Only the active `templates` row may set the price — the static catalogue
  // fallback is never rendered. A known id without an active row is the Coming
  // soon state below: no Template price and no Customise CTA.
  const priceMyr = template?.price_myr ?? null
  const hasPreview =
    isLegacyPreviewId(id) || Boolean(template?.type && template.theme && template.sections)

  const features = [
    "Laman web jemputan yang cantik",
    "Papan pemuka RSVP berserta statistik",
    "Seksyen hadiah + tempah hadiah",
    "Peta & butang kalender",
    "Seksyen vendor makanan",
    "Pautan boleh dikongsi terus",
    "Notifikasi e-mel setiap RSVP",
  ]

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link
          href="/templates"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 13,
            color: "var(--muted-foreground)",
            marginBottom: 28,
            textDecoration: "none",
          }}
        >
          ← Kembali ke Templates
        </Link>

        <div className={styles.layout}>
          {/* Live phone preview */}
          <div className={styles.previewColumn}>
            <p
              style={{
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 11,
                color: "var(--muted-foreground)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Pratonton Langsung
            </p>
            {/* Phone frame */}
            <div className={styles.phoneFrame}>
              {/* Dynamic island */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 100,
                  height: 28,
                  background: "#1a1a1a",
                  borderRadius: 20,
                  zIndex: 20,
                }}
              />
              {hasPreview ? (
                <iframe
                  src={`/templates/preview/${id}`}
                  className={styles.previewIframe}
                  title={`${meta.name} preview`}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 32,
                    background: meta.bg,
                    color: meta.accent,
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 14,
                    lineHeight: 1.6,
                    textAlign: "center",
                  }}
                >
                  Pratonton langsung belum tersedia untuk template ini.
                </div>
              )}
            </div>
            <p
              style={{
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 11,
                color: "#b0a898",
                textAlign: "center",
                maxWidth: 260,
                lineHeight: 1.5,
              }}
            >
              {hasPreview
                ? "Skrol dalam telefon untuk melihat keseluruhan kad"
                : "Butiran template masih boleh dilihat di halaman ini"}
            </p>
          </div>

          {/* Info panel */}
          <div className={styles.infoPanel}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 10px",
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-jakarta), sans-serif",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: "var(--secondary)",
                color: "var(--muted-foreground)",
              }}
            >
              {categoryLabel(meta.category)}
            </span>

            <h1
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 40,
                fontWeight: 600,
                color: "var(--primary)",
                margin: "12px 0 4px",
              }}
            >
              {template?.name ?? meta.name}
            </h1>
            <p
              style={{
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 14,
                color: "var(--muted-foreground)",
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              {meta.desc}
            </p>

            {priceMyr ? (
              <p
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: 52,
                  fontWeight: 600,
                  color: "var(--accent)",
                  margin: "0 0 24px",
                  lineHeight: 1,
                }}
              >
                RM {(priceMyr / 100).toFixed(0)}
              </p>
            ) : null}

            <div
              style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}
            >
              {features.map((f) => (
                <div
                  key={f}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 14,
                    color: "var(--muted-foreground)",
                  }}
                >
                  <span style={{ color: "#27ae60", fontWeight: 700, fontSize: 15 }}>✓</span> {f}
                </div>
              ))}
            </div>

            {template ? (
              <>
                <Link
                  href={`/dashboard/cards/new?template=${id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 50,
                    background: "var(--primary)",
                    color: "var(--background)",
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  Sesuaikan Template Ini →
                </Link>
                <p
                  style={{
                    fontFamily: "var(--font-jakarta), sans-serif",
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    textAlign: "center",
                    marginTop: 10,
                  }}
                >
                  {user
                    ? "Anda sudah log masuk. Teruskan untuk sesuaikan template ini."
                    : "Anda perlu log masuk atau daftar (percuma) untuk meneruskan."}
                </p>
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 50,
                  background: "#e8e4de",
                  color: "var(--muted-foreground)",
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 8,
                  letterSpacing: "0.04em",
                }}
              >
                Akan Datang
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    wedding: "Perkahwinan",
    birthday: "Hari Jadi",
    corporate: "Korporat",
    open_house: "Rumah Terbuka",
    engagement: "Pertunangan",
    aqiqah: "Aqiqah",
    anniversary: "Ulang Tahun",
    graduation: "Konvokesyen",
    gender_reveal: "Gender Reveal",
  }

  return labels[category] ?? "Majlis"
}
