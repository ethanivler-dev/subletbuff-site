import Link from 'next/link'
import { Home, Search, CheckCircle, ArrowRight } from 'lucide-react'
import { HowItWorksSteps } from '@/components/how-it-works/HowItWorksSteps'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How SubletBuff Works | Find or Post Boulder Sublets for Free',
  description: 'Learn how to find or post a verified sublet in Boulder. SubletBuff connects CU students, interns, and researchers with safe short-term housing. Free for students.',
  alternates: { canonical: '/how-it-works' },
}

/* ------------------------------------------------------------------ */
/*  Static data (server-rendered sections only)                       */
/* ------------------------------------------------------------------ */

const FOR_LISTERS = [
  "No listing fees — it's free to post",
  'Admin-reviewed listings keep the quality bar high',
  'See views, saves, and inquiry counts on your dashboard',
  'Manage multiple listings from one account',
]

const FOR_RENTERS = [
  'Browse verified short-term sublets near CU Boulder',
  'Filters for furnished, intern-friendly, immediate move-in',
  'Save listings and track your inquiries',
  "Safe messaging — your email stays private until you connect",
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section className="pt-28 pb-10 bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl text-gray-900 mb-4">
            How SubletBuff Works
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            SubletBuff connects CU Boulder students and interns looking for short-term housing
            with people who have a space to share — no fees, no middlemen.
          </p>
        </div>
      </section>

      {/* Toggle + Steps (client component) */}
      <HowItWorksSteps />

      {/* For Listers / For Renters */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl text-gray-900 text-center mb-10">
            Built for both sides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Listers */}
            <div className="bg-white rounded-card shadow-card p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Home className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">For Listers</h3>
              </div>
              <ul className="flex flex-col gap-3">
                {FOR_LISTERS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-5 border-t border-gray-100">
                <Link
                  href="/post"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Post a listing <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Renters */}
            <div className="bg-white rounded-card shadow-card p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-accent-400/10 flex items-center justify-center">
                  <Search className="w-5 h-5 text-accent-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">For Renters</h3>
              </div>
              <ul className="flex flex-col gap-3">
                {FOR_RENTERS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-5 border-t border-gray-100">
                <Link
                  href="/listings"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Browse sublets <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-900">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-primary-200 mb-8 max-w-lg mx-auto">
            Whether you have a space to share or need somewhere to stay,
            SubletBuff makes the connection simple.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/listings"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary-700 font-semibold rounded-button hover:bg-primary-50 transition-colors text-sm"
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
