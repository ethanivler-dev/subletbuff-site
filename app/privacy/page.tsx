import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'SubletBuff privacy policy — how we collect, use, and protect your personal data. Compliant with CCPA and CPA.',
  alternates: { canonical: '/privacy' },
}

const LAST_UPDATED = 'March 5, 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-gray prose-sm max-w-none [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_li]:text-gray-600 [&_li]:leading-relaxed">
          <p>
            SubletBuff (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates subletbuff.com
            (the &ldquo;Site&rdquo;). This Privacy Policy explains how we collect, use, disclose, and protect
            your personal information when you use our Site.
          </p>

          <h2>1. Information We Collect</h2>

          <h3>Information you provide</h3>
          <ul>
            <li><strong>Account data:</strong> Name, email address, and password when you create an account.</li>
            <li><strong>Profile data:</strong> Verification documents (lease documents, .edu email) if you opt in to verification.</li>
            <li><strong>Listing data:</strong> Property details, photos, descriptions, pricing, and availability dates.</li>
            <li><strong>Communications:</strong> Messages sent through the inquiry system.</li>
          </ul>

          <h3>Information collected automatically</h3>
          <ul>
            <li><strong>Usage data:</strong> Pages visited, search queries, timestamps, and referring URLs.</li>
            <li><strong>Device data:</strong> Browser type, operating system, screen resolution, and IP address.</li>
            <li><strong>Cookies:</strong> We use essential cookies for authentication and session management. See Section 6 for details.</li>
          </ul>

          <h3>Information from third parties</h3>
          <ul>
            <li><strong>Google OAuth:</strong> If you sign in with Google, we receive your name, email, and profile picture from Google.</li>
            <li><strong>Analytics:</strong> We may use third-party analytics services that collect aggregated usage data.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve the Site.</li>
            <li>Create and manage your account.</li>
            <li>Display your listings to other users.</li>
            <li>Facilitate communication between listers and renters.</li>
            <li>Review listings for quality and policy compliance.</li>
            <li>Send transactional emails (account confirmation, password resets, inquiry notifications).</li>
            <li>Detect, prevent, and address fraud, abuse, and security issues.</li>
            <li>Comply with legal obligations.</li>
          </ul>
          <p>
            We do <strong>not</strong> sell your personal information. We do <strong>not</strong> use your data for
            targeted advertising.
          </p>

          <h2>3. How We Share Your Information</h2>
          <p>We may share your information in the following circumstances:</p>
          <ul>
            <li><strong>With other users:</strong> Your listing details, display name, and verification status are visible to other users. Your email address is not shared publicly.</li>
            <li><strong>Service providers:</strong> We use Supabase (database and authentication), Vercel (hosting), and Google (OAuth). These providers process data on our behalf under their respective privacy policies.</li>
            <li><strong>Legal requirements:</strong> We may disclose information if required by law, subpoena, or legal process, or to protect the rights, safety, or property of SubletBuff, our users, or the public.</li>
            <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, user data may be transferred as part of that transaction.</li>
          </ul>

          <h2>4. Data Storage and Security</h2>
          <p>
            Your data is stored on servers provided by Supabase (hosted on AWS in the United States). We use
            industry-standard security measures including encrypted connections (TLS/SSL), row-level security
            policies, and secure authentication tokens. However, no method of transmission or storage is 100%
            secure, and we cannot guarantee absolute security.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. Listing data for expired or deleted
            listings may be retained for up to 12 months for dispute resolution purposes. You may request deletion
            of your data at any time (see Section 7).
          </p>

          <h2>6. Cookies</h2>
          <p>We use the following types of cookies:</p>
          <ul>
            <li><strong>Essential cookies:</strong> Required for authentication and session management. These cannot be disabled.</li>
            <li><strong>Functional cookies:</strong> Remember your preferences (e.g., search filters). These are optional.</li>
          </ul>
          <p>
            We do not use advertising or tracking cookies. Most browsers allow you to control cookies through their
            settings.
          </p>

          <h2>7. Your Rights</h2>
          <p>
            Depending on your location, you may have the following rights under applicable privacy laws, including
            the California Consumer Privacy Act (CCPA) and the Colorado Privacy Act (CPA):
          </p>
          <ul>
            <li><strong>Right to know:</strong> Request what personal information we have collected about you.</li>
            <li><strong>Right to access:</strong> Obtain a copy of your personal information.</li>
            <li><strong>Right to delete:</strong> Request deletion of your personal information.</li>
            <li><strong>Right to correct:</strong> Request correction of inaccurate personal information.</li>
            <li><strong>Right to opt out:</strong> Opt out of the sale of personal information (we do not sell your data).</li>
            <li><strong>Right to non-discrimination:</strong> We will not discriminate against you for exercising your privacy rights.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:subletbuff@gmail.com" className="text-primary-600 hover:underline">
              subletbuff@gmail.com
            </a>
            . We will respond within 45 days as required by law.
          </p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>
            SubletBuff is not directed to individuals under 18. We do not knowingly collect personal information
            from children. If you believe we have collected data from a minor, contact us immediately.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of material changes by
            updating the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of the Site
            after changes constitutes acceptance of the revised policy.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions or concerns about this Privacy Policy? Contact us at{' '}
            <a href="mailto:subletbuff@gmail.com" className="text-primary-600 hover:underline">
              subletbuff@gmail.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  )
}
