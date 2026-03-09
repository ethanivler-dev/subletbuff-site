import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          {/* Col 1: Logo + tagline */}
          <div className="flex flex-col gap-4">
            <Image
              src="/logo.png"
              alt="SubletBuff"
              width={140}
              height={36}
              className="h-9 w-auto brightness-0 invert"
              unoptimized
            />
            <p className="text-gray-400 text-sm leading-relaxed">
              Boulder&apos;s short-term housing marketplace. Verified sublets for interns,
              seasonal workers, and researchers.
            </p>
          </div>

          {/* Col 2: Site links */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Explore
            </h3>
            <ul className="flex flex-col gap-0">
              <li>
                <Link href="/listings" className="text-sm text-gray-300 hover:text-white transition-colors inline-block py-2">
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link href="/post" className="text-sm text-gray-300 hover:text-white transition-colors inline-block py-2">
                  Post a Listing
                </Link>
              </li>
              <li>
                <Link href="/neighborhoods" className="text-sm text-gray-300 hover:text-white transition-colors inline-block py-2">
                  Neighborhoods
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-sm text-gray-300 hover:text-white transition-colors inline-block py-2">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/safety" className="text-sm text-gray-300 hover:text-white transition-colors inline-block py-2">
                  Safety
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Support */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Support
            </h3>
            <ul className="flex flex-col gap-0">
              <li>
                <a
                  href="mailto:subletbuff@gmail.com"
                  className="text-sm text-gray-300 hover:text-white transition-colors inline-block py-2"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-300 hover:text-white transition-colors inline-block py-2">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-300 hover:text-white transition-colors inline-block py-2">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: For Landlords */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              For Landlords
            </h3>
            <ul className="flex flex-col gap-0">
              <li>
                <Link href="/landlords" className="text-sm text-gray-300 hover:text-white transition-colors inline-block py-2">
                  Why SubletBuff
                </Link>
              </li>
              <li>
                <Link href="/landlords" className="text-sm text-gray-300 hover:text-white transition-colors inline-block py-2">
                  Landlord Login
                </Link>
              </li>
              <li>
                <a
                  href="mailto:subletbuff@gmail.com"
                  className="text-sm text-gray-300 hover:text-white transition-colors inline-block py-2"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Fair Housing Statement */}
        <div className="mt-10 pt-6 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <svg className="w-8 h-8 text-gray-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
            </svg>
            <p className="text-xs text-gray-500 text-center sm:text-left max-w-xl">
              SubletBuff is committed to compliance with the Fair Housing Act. We do not discriminate based on race,
              color, religion, sex, national origin, familial status, disability, or any other protected class.{' '}
              <span className="font-medium text-gray-400">Equal Housing Opportunity.</span>
            </p>
          </div>
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} SubletBuff. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
