export const metadata = {
  title: "Privacy Policy — kamy jemput",
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: {new Date().getFullYear()}</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Introduction</h2>
          <p>
            Kamy Jemput (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your personal
            data in accordance with Malaysia&apos;s Personal Data Protection Act 2010 (PDPA). This
            Privacy Policy explains how we collect, use, and protect your information when you use
            our digital invitation card platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Data We Collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Account information: email address, name, phone number</li>
            <li>Event information: event name, date, venue, and host names you enter</li>
            <li>Payment information: Stripe processes card payments; we do not store card numbers. For manual Bank DuitNow and Touch &apos;n Go payments, we store receipt files, optional payment references, received amounts and review history.</li>
            <li>RSVP responses: guest names, contact information, and attendance details</li>
            <li>Usage data: pages visited, device type (for platform improvement)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">3. How We Use Your Data</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>To create and publish your digital invitation card</li>
            <li>To process payments and send order confirmations</li>
            <li>To notify you when guests RSVP to your event</li>
            <li>To improve our platform and services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Data Sharing</h2>
          <p className="text-sm">
            We do not sell your personal data. We share data only with:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
            <li>Stripe (payment processing) — governed by Stripe&apos;s Privacy Policy</li>
            <li>Supabase (database hosting) — governed by Supabase&apos;s Privacy Policy</li>
            <li>Resend (email delivery) — governed by Resend&apos;s Privacy Policy</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Guest Data</h2>
          <p className="text-sm">
            When you share your invitation, your guests may submit their name and contact
            information as an RSVP. You are responsible for informing your guests that their
            data will be stored and used for event management purposes. You should not use
            this data for any other purpose.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Data Retention</h2>
          <p className="text-sm">
            We retain your account data as long as your account is active. Cards and RSVP
            data are retained for 12 months after the event date. You may request deletion
            of your data at any time by contacting us.
          </p>
          <p className="text-sm mt-3">
            Current and previous payment receipt files are retained indefinitely in this release
            for manual payment review and audit. Files are private: you can access only your current
            receipt, and authorized administrators can inspect previous versions. There is no
            customer receipt-deletion function. An authorized administrator may quarantine or remove
            a file for a harmful-file, legal or operational reason, including after reviewing a
            privacy request. The permanent audit retains the object reference, version, order,
            payment attempt, method, amounts, review outcome, reason, reviewer and timestamps after
            removal. The audit contains metadata, not receipt file content.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Your Rights (PDPA)</h2>
          <p className="text-sm">
            Under Malaysia&apos;s PDPA, you have the right to access, correct, and request
            deletion of your personal data. Contact us at{" "}
            <a href="mailto:privacy@kamyjemput.my" className="text-primary hover:underline">
              privacy@kamyjemput.my
            </a>{" "}
            to exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Contact</h2>
          <p className="text-sm">
            For any privacy-related questions, contact us at{" "}
            <a href="mailto:privacy@kamyjemput.my" className="text-primary hover:underline">
              privacy@kamyjemput.my
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
