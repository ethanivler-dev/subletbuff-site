'use client'

import { useState } from 'react'
import {
  Search, Eye, MessageSquare, SlidersHorizontal,
  Star, CheckCircle, Camera, MapPin,
  Home, Shield, BarChart2, FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StepDetail {
  Icon: LucideIcon
  text: string
}

interface Step {
  number: string
  title: string
  Icon: LucideIcon
  color: string
  ring: string
  description: string
  details: StepDetail[]
}

type View = 'looking' | 'listing'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const RENTER_STEPS: Step[] = [
  {
    number: '01',
    title: 'Browse & Filter',
    Icon: Search,
    color: 'bg-primary-50 text-primary-600',
    ring: 'ring-primary-100',
    description:
      'Search sublets near CU Boulder by dates, price, room type, and neighborhood. Heart listings you like — they save to your account so you can come back to them.',
    details: [
      { Icon: SlidersHorizontal, text: 'Filter by dates, price, room type, and neighborhood' },
      { Icon: Star, text: 'Save favorites to your account' },
      { Icon: CheckCircle, text: 'Verified and badge-marked listings highlighted' },
    ],
  },
  {
    number: '02',
    title: 'Read the Details',
    Icon: Eye,
    color: 'bg-accent-400/10 text-accent-600',
    ring: 'ring-amber-100',
    description:
      'Browse full photo galleries, read house rules and amenities, and see the lister\'s profile and verification badges before reaching out.',
    details: [
      { Icon: Camera, text: 'Full photo galleries with captions' },
      { Icon: MapPin, text: 'Approximate location shown — exact address shared after acceptance' },
      { Icon: CheckCircle, text: 'Check furnished status, utilities, amenities, and min stay' },
    ],
  },
  {
    number: '03',
    title: 'Send an Inquiry & Move In',
    Icon: MessageSquare,
    color: 'bg-green-50 text-green-600',
    ring: 'ring-green-100',
    description:
      'Message the lister directly through SubletBuff. Once you both agree on terms, sign a sublease agreement and coordinate move-in.',
    details: [
      { Icon: MessageSquare, text: 'Message the lister directly through SubletBuff' },
      { Icon: FileText, text: 'Sign a sublease — always get it in writing' },
      { Icon: Home, text: 'Exact address shared once the lister accepts your inquiry' },
    ],
  },
]

const LISTER_STEPS: Step[] = [
  {
    number: '01',
    title: 'List Your Space',
    Icon: Home,
    color: 'bg-primary-50 text-primary-600',
    ring: 'ring-primary-100',
    description:
      'Post your sublet in minutes. Upload photos, set your rent and dates, describe the space, and add house rules. Submit for review when you\'re ready.',
    details: [
      { Icon: Camera, text: 'Upload up to 10 photos with optional captions' },
      { Icon: SlidersHorizontal, text: 'Set price, available dates, min stay, and house rules' },
      { Icon: CheckCircle, text: 'Most listings reviewed and live within 24 hours' },
    ],
  },
  {
    number: '02',
    title: 'Get Reviewed & Go Live',
    Icon: Shield,
    color: 'bg-accent-400/10 text-accent-600',
    ring: 'ring-amber-100',
    description:
      'Our admin team reviews every listing to keep quality high. Once approved, your listing appears in search results immediately.',
    details: [
      { Icon: CheckCircle, text: 'Admin team reviews every listing for quality' },
      { Icon: Eye, text: 'Your listing appears in search once approved' },
      { Icon: Star, text: 'Featured upgrade coming soon — boosted placement' },
    ],
  },
  {
    number: '03',
    title: 'Respond to Inquiries',
    Icon: MessageSquare,
    color: 'bg-green-50 text-green-600',
    ring: 'ring-green-100',
    description:
      'Renters message you directly through SubletBuff. Review their move-in dates, respond to questions, and sign a sublease to finalize the rental.',
    details: [
      { Icon: MessageSquare, text: 'Renters message you directly through SubletBuff' },
      { Icon: BarChart2, text: 'Track views, saves, and inquiries on your lister dashboard' },
      { Icon: FileText, text: 'Exchange contact info and sign a sublease to finalize' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HowItWorksSteps() {
  const [view, setView] = useState<View>('looking')
  const steps = view === 'looking' ? RENTER_STEPS : LISTER_STEPS

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">

        {/* Toggle */}
        <div className="flex justify-center mb-14">
          <div className="flex bg-gray-100 rounded-full p-1 gap-1">
            <button
              onClick={() => setView('looking')}
              className={[
                'px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200',
                view === 'looking'
                  ? 'bg-accent-500 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800',
              ].join(' ')}
            >
              I&apos;m Looking
            </button>
            <button
              onClick={() => setView('listing')}
              className={[
                'px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200',
                view === 'listing'
                  ? 'bg-accent-500 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800',
              ].join(' ')}
            >
              I&apos;m Listing
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-12 lg:gap-0">
          {steps.map((step, idx) => {
            const isEven = idx % 2 === 1
            return (
              <div
                key={step.number}
                className={[
                  'flex flex-col lg:flex-row items-center gap-8 lg:gap-16',
                  isEven ? 'lg:flex-row-reverse' : '',
                  idx !== steps.length - 1
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
                        <span
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${step.color}`}
                        >
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
  )
}
