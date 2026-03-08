import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'SubletBuff terms of use — user responsibilities, prohibited content, liability, and dispute resolution.',
  alternates: { canonical: '/terms' },
}

const LAST_UPDATED = 'March 5, 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl text-gray-900 mb-2">Terms of Use</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-gray prose-sm max-w-none [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_li]:text-gray-600 [&_li]:leading-relaxed">
          <p>
            Welcome to SubletBuff. By accessing or using subletbuff.com (the &ldquo;Site&rdquo;), you agree to
            be bound by these Terms of Use (&ldquo;Terms&rdquo;). If you do not agree, do not use the Site.
          </p>

          <h2>1. About SubletBuff</h2>
          <p>
            SubletBuff is a listing platform that connects people seeking short-term housing in Boulder, Colorado
            with people who have space available. SubletBuff is <strong>not</strong> a party to any rental agreement,
            payment, or transaction between users. We do not own, manage, or inspect any properties listed on the Site.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old and capable of forming a binding contract to use SubletBuff.
            By creating an account, you represent that all information you provide is accurate and complete.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activity
            that occurs under your account. Notify us immediately at subletbuff@gmail.com if you suspect unauthorized
            access. SubletBuff reserves the right to suspend or terminate accounts that violate these Terms.
          </p>

          <h2>4. User Responsibilities</h2>
          <p>When using SubletBuff, you agree to:</p>
          <ul>
            <li>Provide accurate, truthful information in listings, profiles, and communications.</li>
            <li>Comply with all applicable federal, state, and local laws, including fair housing laws.</li>
            <li>Not use the Site to discriminate based on race, color, religion, sex, national origin, familial status, disability, or any other protected class.</li>
            <li>Not use the Site for any unlawful or fraudulent purpose.</li>
            <li>Not attempt to circumvent any security features of the Site.</li>
          </ul>

          <h2>5. Prohibited Content</h2>
          <p>You may not post content that:</p>
          <ul>
            <li>Is false, misleading, or deceptive.</li>
            <li>Infringes on the intellectual property rights of others.</li>
            <li>Contains personal information of others without their consent.</li>
            <li>Promotes illegal activity or violates any law.</li>
            <li>Is spam, solicitation, or advertising unrelated to housing.</li>
            <li>Lists properties the poster does not have the legal right to sublet.</li>
          </ul>
          <p>
            SubletBuff reserves the right to remove any content and suspend any account at its sole discretion,
            without prior notice.
          </p>

          <h2>6. Listing Review</h2>
          <p>
            SubletBuff may review listings before they are published to check for quality and compliance with these
            Terms. Review does not constitute verification of the accuracy of any listing, the identity of any user,
            or the legality of any sublease arrangement.
          </p>

          <h2>7. Transactions Between Users</h2>
          <p>
            All rental agreements, payments, deposits, and communications are solely between the lister and the renter.
            SubletBuff does not facilitate, process, or guarantee any transactions. We are not responsible for the
            quality, safety, legality, or availability of any listed property, or the ability of any user to complete
            a transaction.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, SubletBuff and its officers, directors, employees, and agents
            shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any
            loss of profits, revenue, data, or use, arising out of or related to your use of the Site, even if we
            have been advised of the possibility of such damages.
          </p>
          <p>
            SubletBuff&apos;s total liability for any claim arising from your use of the Site shall not exceed
            the amount you paid to SubletBuff (if any) in the twelve months preceding the claim.
          </p>

          <h2>9. Disclaimer of Warranties</h2>
          <p>
            The Site is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
            either express or implied, including but not limited to implied warranties of merchantability, fitness
            for a particular purpose, and non-infringement.
          </p>

          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless SubletBuff and its affiliates from any claims, damages, losses,
            or expenses (including reasonable attorneys&apos; fees) arising from your use of the Site, your violation
            of these Terms, or your violation of any rights of a third party.
          </p>

          <h2>11. Dispute Resolution</h2>
          <p>
            Any dispute arising out of or relating to these Terms or the Site shall be resolved through binding
            arbitration in Boulder County, Colorado, under the rules of the American Arbitration Association. You
            agree to waive any right to participate in a class action lawsuit or class-wide arbitration.
          </p>

          <h2>12. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the State of Colorado, without
            regard to its conflict of law principles.
          </p>

          <h2>13. Modifications</h2>
          <p>
            SubletBuff may update these Terms at any time. We will notify users of material changes by updating the
            &ldquo;Last updated&rdquo; date. Continued use of the Site after changes constitutes acceptance of the
            revised Terms.
          </p>

          <h2>14. Account Termination</h2>
          <p>
            You may delete your account at any time by contacting subletbuff@gmail.com. SubletBuff may terminate
            or suspend your account at any time, with or without cause, and with or without notice. Upon termination,
            your right to use the Site ceases immediately.
          </p>

          <h2>15. Contact</h2>
          <p>
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:subletbuff@gmail.com" className="text-primary-600 hover:underline">
              subletbuff@gmail.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  )
}
