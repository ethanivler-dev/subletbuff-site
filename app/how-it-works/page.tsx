import Link from 'next/link'
import {
  Home, Search, MessageSquare,
  CheckCircle, ArrowRight, Camera, SlidersHorizontal, Star,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works — SubletBuff',
  description: 'Learn how to list, browse, and connect on SubletBuff — Boulder\'s sublet marketplace.',
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    number: '01',
    title: 'List Your Space',
    Icon: Home,
    color: 'bg-primary-50 text-primary-600',
    ring: 'ring-primary-100',
    description:
      'Post your sublet in minutes. Add photos, set your rent and dates, describe the space, and submit for review. Most listings go live within 24 hours.',
    details: [
      { Icon: Camera, text: 'Upload up to 10 photos' },
      { Icon: SlidersHorizontal, text: 'Set your price, dates, and house rules' },
      { Icon: CheckCircle, text: 'Admin review keeps quality high' },
    ],
  },
  {
    number: '02',
    title: 'Browse & Save',
    Icon: Search,
    color: 'bg-accent-400/10 text-accent-600',
    ring: 'ring-amber-100',
    description:
      'Filter by neighborhood, price, room type, and dates. Save listings you like and compare them side by side on your dashboard.',
    details: [
      { Icon: SlidersHorizontal, text: 'Filter by dates, price, and room type' },
      { Icon: Star, text: 'Save favorites to your account' },
      { Icon: CheckCircle, text: 'Verified CU students and lease-verified listings marked' },
    ],
  },
  {
    number: '03',
    title: 'Connect & Move In',
    Icon: MessageSquare,
    color: 'bg-green-50 text-green-600',
    ring: 'ring-green-100',
    description:
      'Send an inquiry directly to the lister. Once both sides agree, sign a sublease agreement and coordinate move-in. The exact address is shared once you connect.',
    details: [
      { Icon: MessageSquare, text: 'Message the lister through SubletBuff' },
      { Icon: CheckCircle, text: 'Sign a sublease agreement — always get it in writing' },
      { Icon: Home, text: 'Exact address shared after the lister accepts your inquiry' },
    ],
  },
]

const FOR_LISTERS = [
  'No listing fees — it\'s free to post',
  'Admin-reviewed listings keep the quality bar high',
  'See views, saves, and inquiry counts on your dashboard',
  'Manage multiple listings from one account',
]

const FOR_RENTERS = [
  'Browse verified short-term sublets near CU Boulder',
  'Filters for furnished, intern-friendly, immediate move-in',
  'Save listings and track your inquiries',
  'Safe messaging — your email stays private until you connect',
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section className="pt-28 pb-16 bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">
            Simple by design
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl text-gray-900 mb-4">
            How SubletBuff Works
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            SubletBuff connects CU Boulder students and interns looking for short-term housing
            with people who have a space to share — no fees, no middlemen.
          </p>
        </div>
      </section>

      {/* 3-Step Process */}
      <section className="py-16 lg:py-24">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-12 lg:gap-0">
            {STEPS.map((step, idx) => {
              const isEven = idx % 2 === 1
              return (
                <div
                  key={step.number}
                  className={[
                    'flex flex-col lg:flex-row items-center gap-8 lg:gap-16',
                    isEven ? 'lg:flex-row-reverse' : '',
                    idx !== STEPS.length - 1
                      ? 'pb-12 lg:pb-20 border-b border-gray-100'
                      : '',
                  ].join(' ')}
                >
                  {/* Icon block */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-4 w-full lg:w-64">
                    <div
                      className={`w-24 h-24 rounded-2xl flex items-center justify-center ring-8 ${step.color} ${step.ring}`}
                    >
                      <step.Icon className="w-10 h-10" strokeWidth={1.5} />
                    </div>
                    <span className="font-serif text-6xl text-gray-100 select-none leading-none">
                      {step.number}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h2 className="font-serif text-3xl text-gray-900 mb-3">{step.title}</h2>
                    <p className="text-base text-gray-600 mb-6 leading-relaxed max-w-lg">
                      {step.description}
                    </p>
                    <ul className="flex flex-col gap-3">
                      {step.details.map(({ Icon, text }) => (
                        <li key={text} className="flex items-center gap-3 text-sm text-gray-700">
                          <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${step.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

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
