import Link from 'next/link'
import {
  MapPin, CreditCard, FileText, Info,
  CheckCircle, AlertTriangle, ArrowRight,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Safety & Trust | SubletBuff — Verified Boulder Sublets',
  description: 'SubletBuff verifies every listing and user to keep Boulder subletting safe. Learn about our verification process, scam prevention, and how we protect students.',
  alternates: { canonical: '/safety' },
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const TIPS = [
  {
    Icon: MapPin,
    color: 'bg-blue-50 text-blue-600',
    badge: 'Meet in person',
    title: 'Meet in a Public Place First',
    body: 'Before exchanging keys, payment, or signing anything, meet the other party in a well-lit, public space — a café, the UMC, or another campus building. Trust your instincts: if something feels off, it\'s okay to walk away.',
    dos: [
      'Meet on or near campus for the first showing',
      'Bring a friend if you can',
      'Video-call before an in-person meeting if you\'re coming from out of town',
    ],
    donts: [
      'Never wire money to someone you\'ve never met',
      'Don\'t hand over keys before receiving payment',
    ],
  },
  {
    Icon: CreditCard,
    color: 'bg-green-50 text-green-600',
    badge: 'Money',
    title: 'Use Traceable Payments',
    body: 'Cash is impossible to recover if something goes wrong. Use payment methods that create a paper trail — Venmo, Zelle, a personal check, or a bank transfer. Screenshot your transaction confirmations.',
    dos: [
      'Venmo, Zelle, or PayPal (goods & services for extra protection)',
      'Personal or certified check with a written receipt',
      'Bank transfer with a clear memo',
    ],
    donts: [
      'Never pay in cash with no receipt',
      'Avoid gift cards, wire transfers, or cryptocurrency — these are common scam methods',
      'Never pay a full month\'s rent before signing anything',
    ],
  },
  {
    Icon: FileText,
    color: 'bg-amber-50 text-amber-600',
    badge: 'Documentation',
    title: 'Get It in Writing',
    body: 'A handshake deal is not enforceable. A signed sublease agreement protects both parties and clearly spells out rent, dates, deposit terms, and house rules.',
    dos: [
      'Sign a written sublease agreement before moving in',
      'Include rent amount, move-in and move-out dates, and deposit terms',
      'Both parties should keep a signed copy',
      'Document the condition of the unit with photos on move-in day',
    ],
    donts: [
      'Don\'t move in without a signed agreement',
      'Don\'t rely on text messages or DMs as a contract',
    ],
  },
  {
    Icon: Info,
    color: 'bg-purple-50 text-purple-600',
    badge: 'Know the limits',
    title: 'Verify Before You Commit',
    body: 'Scammers sometimes list properties they don\'t own. Always verify that the person you\'re dealing with actually has the right to sublet the space.',
    dos: [
      'Ask to see a copy of the primary lease (name should match)',
      'Do a quick Google Maps check of the address',
      'Trust listings with the Lease Verified badge — those have been reviewed',
      'If a deal seems too good to be true, it probably is',
    ],
    donts: [
      'Don\'t send deposits without verifying identity and lease rights',
      'Be skeptical of anyone who can\'t meet in person or video call',
    ],
  },
]

const RESOURCES = [
  { label: 'CU Boulder Off-Campus Housing', href: 'https://offcampushousing.colorado.edu/' },
  { label: 'Boulder Police Non-Emergency', href: 'tel:3034413333' },
  { label: 'Colorado AG Consumer Protection', href: 'https://coag.gov/resources/consumer-protection/' },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section className="pt-28 pb-14 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">
            Your safety matters
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl text-gray-900 mb-4">
            Subletting Safely
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            SubletBuff connects renters and listers — we don&apos;t manage payments, sign leases,
            or resolve disputes. Use these guidelines to protect yourself every step of the way.
          </p>
        </div>
      </section>

      {/* Platform disclaimer banner */}
      <div className="bg-amber-50 border-y border-amber-200">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>SubletBuff is a listing platform, not a lease manager.</strong>{' '}
            We connect renters and listers but are not a party to any rental agreement,
            payment, or dispute. All transactions are between you and the other party directly.
          </p>
        </div>
      </div>

      {/* Safety tips */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10">
            {TIPS.map((tip, idx) => (
              <div key={tip.title} className="flex flex-col sm:flex-row gap-6">
                {/* Number + icon */}
                <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 flex-shrink-0 sm:w-16">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tip.color}`}>
                    <tip.Icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-2xl font-serif text-gray-200 leading-none">
                    0{idx + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-card border border-gray-100 shadow-card p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {tip.badge}
                    </span>
                  </div>
                  <h2 className="font-serif text-xl text-gray-900 mb-3">{tip.title}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed mb-5">{tip.body}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Do</p>
                      <ul className="flex flex-col gap-1.5">
                        {tip.dos.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Avoid</p>
                      <ul className="flex flex-col gap-1.5">
                        {tip.donts.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 block" />
                            </span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform role callout */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-card shadow-card p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="font-serif text-xl text-gray-900 mb-2">
                  What SubletBuff does — and doesn&apos;t do
                </h2>
                <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                  <p>
                    SubletBuff is a <strong>listing platform</strong>. We help people find
                    each other — that&apos;s it. We review listings for quality, but we do not
                    verify every identity, mediate disputes, manage payments, hold deposits,
                    or enforce lease terms.
                  </p>
                  <p>
                    Any agreement you reach with a lister or renter is between the two of you
                    directly. SubletBuff is not a party to that agreement and has no liability
                    for transactions, damages, or disputes that arise from it.
                  </p>
                  <p>
                    If you experience fraud or feel unsafe, contact local authorities and your
                    bank immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl text-gray-900 mb-6">Helpful Resources</h2>
          <div className="flex flex-col gap-3">
            {RESOURCES.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-card border border-gray-100 hover:border-primary-200 hover:shadow-card transition-all group"
              >
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700 transition-colors">
                  {label}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
              </a>
            ))}
            <p className="text-sm text-gray-500 px-1 pt-1">
              If you ever feel unsafe, trust your instincts and contact local authorities.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Questions about a listing or suspicious activity?
          </p>
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            Browse verified listings <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </div>
  )
}
