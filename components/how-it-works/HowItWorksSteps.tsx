import {
  Search, MessageSquare, Home,
  Camera, Shield, UserCheck,
} from 'lucide-react'
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
          'Confirm dates, sign the sublease agreement, and move in with confidence.',
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
        title: 'Choose Your Subletter',
        description:
          'Review requests, message applicants, and pick the best fit for your place.',
      },
    ],
  },
]

export function HowItWorksSteps() {
  return (
    <>
      {SECTIONS.map((section) => (
        <section key={section.heading} className={`py-16 lg:py-20 ${section.bg}`}>
          <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-3xl text-center mb-12 text-gray-900">
              {section.heading}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {section.steps.map((step, idx) => (
                <div
                  key={step.title}
                  className="flex flex-col items-center text-center p-6 rounded-card bg-white shadow-card"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${section.accent}`}
                  >
                    <step.Icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-bold mb-2 text-gray-300">
                    Step {idx + 1}
                  </span>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  )
}
