import Link from "next/link"
import {
  TemplatesGallery,
  type GalleryTemplate,
} from "@/components/TemplatesGallery"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isLegacyPreviewId } from "@/lib/preview-templates"
import styles from "./templates-page.module.css"

export const metadata = {
  title: "Templates — kamy jemput",
  description:
    "Terokai pratonton hidup reka bentuk jemputan digital untuk setiap majlis istimewa.",
}

const CATS = [
  { value: "all", label: "Semua" },
  { value: "wedding", label: "Perkahwinan" },
  { value: "birthday", label: "Hari Jadi" },
  { value: "open_house", label: "Rumah Terbuka" },
  { value: "engagement", label: "Pertunangan" },
  { value: "aqiqah", label: "Aqiqah" },
  { value: "anniversary", label: "Ulang Tahun" },
  { value: "graduation", label: "Konvokesyen" },
  { value: "gender_reveal", label: "Gender Reveal" },
  { value: "corporate", label: "Korporat" },
]

// Static catalogue metadata (name/mood/description drive client-side search).
// An entry reaches the gallery only when an active `templates` row backs it;
// missing or inactive rows are omitted from the catalogue entirely.
const ALL_TEMPLATES = [
  {
    id: "malay-wedding",
    name: "Malay Wedding",
    category: "wedding",
    desc: "Tradisional & elegan dengan motif bunga",
    mood: "Tradisional · Floral",
  },
  {
    id: "chinese-wedding",
    name: "Chinese Wedding",
    category: "wedding",
    desc: "Merah meriah dengan elemen budaya Cina",
    mood: "Merah · Meriah",
  },
  {
    id: "malay-wedding-v2",
    name: "Malay Wedding Premium",
    category: "wedding",
    desc: "Moden & kaya — floral sage/rose, galeri, peta Waze",
    mood: "Moden · Anggun",
  },
  {
    id: "chinese-wedding-v2",
    name: "Chinese Wedding Premium",
    category: "wedding",
    desc: "Merah & emas — 囍, tea ceremony, ang pao, guestbook",
    mood: "Warisan · Mewah",
  },
  {
    id: "general-wedding",
    name: "General Wedding",
    category: "wedding",
    desc: "Editorial mewah — hero gelap, skrip Great Vibes, gading/emas",
    mood: "Sinematik · Editorial",
  },
  {
    id: "sakura-story",
    name: "Sakura Story",
    category: "wedding",
    desc: "Bercerita bab demi bab — tap-untuk-buka, foto 3D, kelopak sakura",
    mood: "Romantis · Sakura",
  },
  {
    id: "celestial-story",
    name: "Celestial Story",
    category: "wedding",
    desc: "Malam berbintang — sentuh-untuk-nyala, bulan purnama, buruj kisah cinta",
    mood: "Magis · Cakerawala",
  },
  {
    id: "cinema-story",
    name: "Cinema Story",
    category: "wedding",
    desc: "Perkahwinan sebagai filem — tekan ▶ untuk mula, kredit STARRING, episod kisah cinta",
    mood: "Dramatik · Sinematik",
  },
  {
    id: "minimalist",
    name: "Minimalist",
    category: "wedding",
    desc: "Bersih, moden, sesuai untuk semua majlis",
    mood: "Bersih · Moden",
  },
  {
    id: "birthday",
    name: "Birthday",
    category: "birthday",
    desc: "Ceria & meriah untuk sambutan hari jadi",
    mood: "Ceria · Meriah",
  },
  {
    id: "corporate",
    name: "Corporate",
    category: "corporate",
    desc: "Profesional & formal untuk majlis korporat",
    mood: "Profesional · Formal",
  },
  {
    id: "open-house-raya",
    name: "Open House Raya",
    category: "open_house",
    desc: "Rumah terbuka Aidilfitri — hijau pastel & emas",
    mood: "Mesra · Aidilfitri",
  },
  {
    id: "engagement-malay",
    name: "Malay Engagement",
    category: "engagement",
    desc: "Majlis pertunangan — amber rose, Great Vibes script",
    mood: "Manis · Romantis",
  },
  {
    id: "aqiqah",
    name: "Aqiqah",
    category: "aqiqah",
    desc: "Majlis aqiqah — sage ivory, info anak, doa",
    mood: "Lembut · Syahdu",
  },
  {
    id: "anniversary",
    name: "Wedding Anniversary",
    category: "anniversary",
    desc: "Sambutan anniversary — plum gold, guestbook, countdown",
    mood: "Abadi · Anggun",
  },
  {
    id: "baby-shower",
    name: "Baby Shower",
    category: "birthday",
    desc: "Lembut & manis — pastel, wishlist, dress code",
    mood: "Pastel · Manis",
  },
  {
    id: "corporate-dinner",
    name: "Corporate Annual Dinner",
    category: "corporate",
    desc: "Malam tahunan — minimal ink, agenda, speakers, dress code",
    mood: "Eksklusif · Korporat",
  },
  {
    id: "graduation",
    name: "Graduation Convocation",
    category: "graduation",
    desc: "Konvokesyen — plum gold, program upacara, dress code",
    mood: "Gemilang · Istiadat",
  },
  {
    id: "gender-reveal",
    name: "Gender Reveal",
    category: "gender_reveal",
    desc: "Pink atau Biru? Countdown reveal, dress code team",
    mood: "Ceria · Kejutan",
  },
  {
    id: "corporate-launch",
    name: "Corporate Product Launch",
    category: "corporate",
    desc: "Pelancaran produk — speakers, demo, networking",
    mood: "Berani · Kontemporari",
  },
  {
    id: "workshop-seminar",
    name: "Workshop & Seminar",
    category: "corporate",
    desc: "Bengkel & seminar — agenda penuh, speakers, kapasiti terhad",
    mood: "Tersusun · Profesional",
  },
]

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const supabase = await createSupabaseServerClient()
  const { data: dbTemplates, error: dbError } = await supabase
    .from("templates")
    .select("id, price_myr, type, theme, sections")
    .eq("is_active", true)

  const catalogueFailed = Boolean(dbError)
  const dbMap = new Map((dbTemplates ?? []).map((template) => [template.id, template]))
  const activeCategory =
    category && CATS.some((item) => item.value === category) ? category : "all"

  // Active-only catalogue: only static entries backed by an active `templates`
  // row become showcase cards. Price and Section-v2 preview capability always
  // come from the active row; entries with missing or inactive rows are
  // omitted rather than rendered as `Akan Datang` cards.
  const templates: GalleryTemplate[] = catalogueFailed
    ? []
    : ALL_TEMPLATES.filter((template) => dbMap.has(template.id)).map((template) => {
        const dbTemplate = dbMap.get(template.id)
        return {
          ...template,
          categoryLabel: categoryLabel(template.category),
          priceMyr: dbTemplate?.price_myr ?? null,
          // Previewable two ways: a Section-v2 row in the DB, or a hand-written
          // legacy component in the preview route. Either renders at
          // /templates/preview/[id], so either earns a live card.
          livePreview:
            Boolean(dbTemplate?.type && dbTemplate.theme && dbTemplate.sections) ||
            isLegacyPreviewId(template.id),
        }
      })

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Koleksi Template</p>
        <h1 className={styles.title}>
          Pilih reka bentuk yang <em>terasa seperti anda.</em>
        </h1>
        <p className={styles.intro}>
          Arahkan tetikus untuk menatal template di desktop, tekan dan tahan di telefon,
          atau ketik untuk membukanya.
        </p>
      </header>

      <section className={styles.catalogue} aria-label="Koleksi reka bentuk jemputan">
        <div className={styles.customRow}>
          <Link href="/templates/custom" className={styles.customLink}>
            Tidak jumpa? Tempahan khas →
          </Link>
        </div>
        <TemplatesGallery
          categories={CATS}
          templates={templates}
          initialCategory={activeCategory}
          queryFailed={catalogueFailed}
        />
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <p className={styles.ctaEyebrow}>Tempahan Khas</p>
          <h2 className={styles.ctaTitle}>
            Sudah jumpa yang berkenan? <em>Jadikan ia milik anda.</em>
          </h2>
          <p className={styles.ctaCopy}>
            Mulakan dengan template pilihan atau cipta sesuatu yang benar-benar tersendiri.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/templates/custom" className={styles.ctaButton}>
              Tempah reka bentuk khas
            </Link>
            <Link href="/register" className={styles.ctaGhost}>
              Daftar sekarang
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function categoryLabel(category: string) {
  return CATS.find((item) => item.value === category)?.label ?? "Majlis"
}
