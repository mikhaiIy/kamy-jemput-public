export const metadata = {
  title: "Terms of Service — kamy jemput",
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: {new Date().getFullYear()}</p>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm">
            By using Kamy Jemput, you agree to these Terms of Service. If you do not agree,
            please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Service Description</h2>
          <p className="text-sm">
            Kamy Jemput provides a platform to create, publish, and share digital invitation
            cards. You receive a shareable web link for your event. Cards are hosted for 12 months
            from the event date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Payment</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Payments are one-time per card, processed via Stripe</li>
            <li>All prices are in Malaysian Ringgit (MYR) inclusive of any applicable taxes</li>
            <li>Refunds are not provided once the card has been published</li>
            <li>If technical issues prevent card creation, you may request a refund within 7 days</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Your Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>You are responsible for the accuracy of event information you enter</li>
            <li>You must have the right to use any photos you upload</li>
            <li>You must inform your guests about how their RSVP data will be used</li>
            <li>You must not use the platform for illegal or harmful purposes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Intellectual Property</h2>
          <p className="text-sm">
            Template designs are owned by Kamy Jemput. You receive a non-exclusive license
            to use them for your event. The content you add (event details, photos) remains
            yours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Limitation of Liability</h2>
          <p className="text-sm">
            Kamy Jemput is not liable for technical issues beyond our control, including
            third-party service outages. Our liability is limited to the amount you paid for
            the affected card.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Governing Law</h2>
          <p className="text-sm">
            These terms are governed by the laws of Malaysia. Any disputes shall be resolved
            in Malaysian courts.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Contact</h2>
          <p className="text-sm">
            For questions, contact{" "}
            <a href="mailto:support@kamyjemput.my" className="text-primary hover:underline">
              support@kamyjemput.my
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
