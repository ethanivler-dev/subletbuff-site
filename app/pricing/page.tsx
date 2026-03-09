import Link from 'next/link'
import { Check } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing | SubletBuff — Free Boulder Sublet Marketplace',
  description:
    'SubletBuff is completely free. No listing fees, no facilitation fees, no hidden charges. Browse, post, and message — all at no cost.',
  alternates: { canonical: '/pricing' },
}

const FEATURES = [
  'Browse all listings',
  'Post a sublet',
  'Message renters & listers',
  'Save searches',
  'Neighborhood guides',
  'No listing fees',
  'No facilitation fees',
  'No hidden charges',
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="pt-28 pb-10 bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl text-gray-900 mb-4">
            Pricing
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            SubletBuff is free for everyone. No fees to browse, list, or message.
          </p>
        </div>
      </section>

      {/* Pricing card */}
      <section className="py-16 lg:py-20">
        <div className="max-w-md mx-auto px-4 sm:px-6">
          <div className="rounded-card border border-gray-100 shadow-card p-8 text-center">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-2">
              For everyone
            </p>
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="font-serif text-5xl text-gray-900">$0</span>
              <span className="text-gray-500 text-sm">/forever</span>
            </div>
            <p className="text-sm text-gray-500 mb-8">
              Everything you need to find or share a sublet in Boulder.
            </p>

            <ul className="flex flex-col gap-3 text-left mb-8">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" strokeWidth={2} />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3">
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
        </div>
      </section>
    </div>
  )
}
