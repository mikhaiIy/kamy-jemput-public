import CheckoutPage from "../page"
export const metadata = { title: "Bayaran DuitNow QR — kamy jemput" }
export const dynamic = "force-dynamic"
export default function QrPaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  return <CheckoutPage params={params} searchParams={Promise.resolve({ method: "qr" })} />
}
