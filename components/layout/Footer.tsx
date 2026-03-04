import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Col 1: Logo + tagline */}
          <div className="flex flex-col gap-4">
            <Image
              src="/logo.jpeg"
              alt="SubletBuff"
              width={140}
              height={36}
              className="h-9 w-auto brightness-0 invert"
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
            <ul className="flex flex-col gap-3">
              <li>
                <Link href="/listings" className="text-sm text-gray-300 hover:text-white transition-colors">
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link href="/post" className="text-sm text-gray-300 hover:text-white transition-colors">
                  Post a Listing
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-sm text-gray-300 hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/safety" className="text-sm text-gray-300 hover:text-white transition-colors">
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
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href="mailto:subletbuff@gmail.com"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-300 hover:text-white transition-colors">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-300 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SubletBuff. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
