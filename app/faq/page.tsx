import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ | SubletBuff — Boulder Sublet Questions Answered',
  description:
    'Frequently asked questions about SubletBuff. Learn how to find or post a sublet in Boulder, how verification works, and how to stay safe.',
  alternates: { canonical: '/faq' },
}

const FAQS = [
  {
    q: 'What is SubletBuff?',
    a: 'SubletBuff is Boulder\'s free short-term housing marketplace. We connect CU students, interns, seasonal workers, and researchers with verified sublets — no fees, no middlemen.',
  },
  {
    q: 'Who can use SubletBuff?',
    a: 'Anyone. Students, interns, professionals, families — if you need a short-term place in Boulder or have a space to share, SubletBuff is for you.',
  },
  {
    q: 'Is SubletBuff free?',
    a: 'Yes. It\'s completely free to browse listings, post a sublet, and message other users. There are no listing fees, facilitation fees, or hidden charges.',
  },
  {
    q: 'How do I post a listing?',
    a: 'Create an account, then click "Post a Listing" in the navigation bar. Add photos, a description, pricing, and availability dates. Your listing will be reviewed and published — typically within 24 hours.',
  },
  {
    q: 'How does verification work?',
    a: 'All users verify their email address when signing up. Every listing is reviewed before it goes live to check for quality and accuracy. We\'re working on additional verification features like CU email badges and lease verification.',
  },
  {
    q: 'How long does listing approval take?',
    a: 'Most listings are reviewed and approved within 24 hours. If your listing needs changes, we\'ll reach out via email with specific feedback.',
  },
  {
    q: 'Can I edit my listing after posting?',
    a: 'Yes. Go to your dashboard and click on the listing you want to update. You can change photos, pricing, dates, and description at any time.',
  },
  {
    q: 'What does "Intern-Friendly" mean?',
    a: 'Listings tagged Intern-Friendly welcome short-term renters like summer interns, co-op students, and researchers. It signals that the lister is open to flexible lease lengths (often 2\u20134 months) and won\'t require a full-year commitment. If you\'re listing a place, toggle this on to attract more applicants during peak intern season.',
  },
  {
    q: 'How does payment work?',
    a: 'Payments happen directly between the renter and lister — SubletBuff does not process payments or hold deposits. We strongly recommend using traceable payment methods like Venmo, Zelle, or PayPal. See our safety tips for more guidance.',
    link: { href: '/safety', label: 'Read our safety tips' },
  },
  {
    q: 'What if something goes wrong?',
    a: 'If you encounter a suspicious listing or have a problem with another user, contact us at subletbuff@gmail.com. You can also report listings directly from the listing page. For safety concerns, see our dedicated safety page.',
    link: { href: '/safety', label: 'Safety & Trust' },
  },
  {
    q: 'Is my personal information safe?',
    a: 'We take privacy seriously. We don\'t sell your data or share it with third parties for marketing. Your exact address is never shown publicly — only an approximate map location. See our privacy policy for full details.',
    link: { href: '/privacy', label: 'Privacy Policy' },
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="pt-28 pb-10 bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl text-gray-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about finding or posting a sublet on SubletBuff.
          </p>
        </div>
      </section>

      {/* FAQ list */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-card border border-gray-100 shadow-card overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-gray-900 text-sm sm:text-base">
                    {faq.q}
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 -mt-1">
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  {faq.link && (
                    <Link
                      href={faq.link.href}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 mt-3 transition-colors"
                    >
                      {faq.link.label}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl text-gray-900 mb-3">
            Still have questions?
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            We&apos;re happy to help. Reach out anytime.
          </p>
          <a
            href="mailto:subletbuff@gmail.com"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-button hover:bg-primary-700 transition-colors text-sm"
          >
            Contact Us
          </a>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 border-t border-gray-100">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/listings"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-button hover:bg-primary-700 transition-colors text-sm"
            >
              Browse Listings
            </Link>
            <Link
              href="/post"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-500 text-gray-900 font-semibold rounded-button hover:bg-accent-400 transition-colors text-sm"
            >
              Post a Sublet
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
