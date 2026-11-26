import { CustomOrderForm } from "./CustomOrderForm"

export const metadata = {
  title: "Tempahan Khas — kamy jemput",
  description:
    "Tidak jumpa template yang sesuai? Hantar tempahan khas dan kami akan reka untuk anda.",
}

export default function CustomTemplatePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 40,
            fontWeight: 600,
            color: "var(--primary)",
            margin: "0 0 8px",
          }}
        >
          Tempahan Khas
        </h1>
        <p
          style={{
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: 15,
            color: "var(--muted-foreground)",
            margin: "0 0 24px",
            lineHeight: 1.6,
          }}
        >
          Tidak jumpa template yang sesuai dalam katalog kami? Beritahu kami apa
          yang anda perlukan dan pasukan kami akan hubungi anda dalam masa 2 hari
          bekerja dengan cadangan + harga.
        </p>
        <CustomOrderForm />
      </div>
    </div>
  )
}
