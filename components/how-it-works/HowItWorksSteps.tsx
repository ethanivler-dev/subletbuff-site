import {
  Search, MessageSquare, Home,
  Camera, Shield, UserCheck,
  ClipboardCheck, ShieldCheck, FileText,
  ArrowRight, Info,
} from 'lucide-react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface Step {
  Icon: LucideIcon
  title: string
  description: string
}

interface Section {
  heading: string
  bg: string
  accent: string
  steps: Step[]
  tip?: string
  cta?: { label: string; href: string }
}

const SECTIONS: Section[] = [
  {
    heading: 'For Students Looking',
    bg: 'bg-white',
    accent: 'bg-primary-50 text-primary-600',
    steps: [
      {
        Icon: Search,
        title: 'Browse Verified Listings',
        description:
          'Search by neighborhood, price, and dates. Every listing is verified by our team.',
      },
      {
        Icon: MessageSquare,
        title: 'Message the Lister',
        description:
          'Chat directly through SubletBuff. Ask questions, request a tour, get to know them.',
      },
      {
        Icon: Home,
        title: 'Move In',
        description:
          'Confirm dates, sign the lease transfer agreement, and move in with confidence.',
      },
    ],
  },
  {
    heading: 'For Students Listing',
    bg: 'bg-gray-50',
    accent: 'bg-accent-400/10 text-accent-600',
    steps: [
      {
        Icon: Camera,
        title: 'Post Your Place',
        description:
          "Create a listing with photos, dates, and house rules. Free to post — always.",
      },
      {
        Icon: Shield,
        title: 'Get Verified',
        description:
          'We verify your identity and listing. Verified listings get more visibility.',
      },
      {
        Icon: UserCheck,
        title: 'Choose Your Replacement',
        description:
          'Review transfer requests, message applicants, and pick the best fit for your place.',
      },
    ],
    tip: 'Each listing is for one person, one room. If your unit has multiple rooms, each roommate should submit their own room as a separate listing.',
  },
  {
    heading: 'For Landlords',
    bg: 'bg-primary-900',
    accent: 'bg-white/10 text-white',
    steps: [
      {
        Icon: ClipboardCheck,
        title: 'Opt In',
        description:
          'Register your properties on SubletBuff. Free during our pilot program.',
      },
      {
        Icon: ShieldCheck,
        title: 'Approve Transfers',
        description:
          'Review and approve every transfer applicant from your dashboard. One-click approve or reject.',
      },
      {
        Icon: FileText,
        title: 'Stay in Control',
        description:
          "Auto-generated lease transfer agreements with your rules built in. Full visibility, zero surprises.",
      },
    ],
    cta: { label: 'Learn More', href: '/landlords' },
  },
]

export function HowItWorksSteps() {
  return (
    <>
      {SECTIONS.map((section) => {
        const isLandlord = section.bg === 'bg-primary-900'
        return (
          <section key={section.heading} className={`py-16 lg:py-20 ${section.bg}`}>
            <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
              <h2
                className={`font-serif text-3xl text-center mb-12 ${
                  isLandlord ? 'text-white' : 'text-gray-900'
                }`}
              >
                {section.heading}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {section.steps.map((step, idx) => (
                  <div
                    key={step.title}
                    className={`flex flex-col items-center text-center p-6 rounded-card ${
                      isLandlord ? 'bg-white/5' : 'bg-white shadow-card'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${section.accent}`}
                    >
                      <step.Icon className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <span
                      className={`text-sm font-bold mb-2 ${
                        isLandlord ? 'text-white/50' : 'text-gray-300'
                      }`}
                    >
                      Step {idx + 1}
                    </span>
                    <h3
                      className={`text-lg font-semibold mb-2 ${
                        isLandlord ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`text-sm leading-relaxed ${
                        isLandlord ? 'text-white/70' : 'text-gray-600'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>

              {section.tip && (
                <div className={`mt-8 flex items-start gap-3 rounded-card px-5 py-4 text-sm leading-relaxed max-w-2xl mx-auto ${
                  isLandlord ? 'bg-white/10 text-white/80' : 'bg-accent-400/10 text-gray-700'
                }`}>
                  <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isLandlord ? 'text-white/60' : 'text-accent-600'}`} strokeWidth={1.5} />
                  <p><span className="font-semibold">Tip:</span> {section.tip}</p>
                </div>
              )}

              {section.cta && (
                <div className="mt-10 text-center">
                  <Link
                    href={section.cta.href}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 font-semibold rounded-button hover:bg-primary-50 transition-colors text-sm"
                  >
                    {section.cta.label}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        )
      })}
    </>
  )
}
