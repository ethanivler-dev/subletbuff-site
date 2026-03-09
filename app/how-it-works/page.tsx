import Link from 'next/link'
import { HowItWorksSteps } from '@/components/how-it-works/HowItWorksSteps'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How SubletBuff Works | Find or Post Boulder Sublets for Free',
  description: 'Learn how to find or post a verified sublet in Boulder. SubletBuff connects CU students, interns, and researchers with safe short-term housing. Free for students.',
  alternates: { canonical: '/how-it-works' },
}

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

      {/* Three sections: Students Looking, Students Listing, Landlords */}
      <HowItWorksSteps />

      {/* CTA */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Whether you have a space to share or need somewhere to stay,
            SubletBuff makes the connection simple.
          </p>
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
