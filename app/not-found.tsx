import Link from 'next/link'
import { Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold text-primary-600 mb-2">404</p>
        <h1 className="font-serif text-2xl font-bold text-gray-900 mb-2">
          This page doesn&apos;t exist
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          The page you&apos;re looking for may have been moved or removed.
        </p>

        {/* Search */}
        <form action="/listings" method="get" className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="q"
              placeholder="Search listings..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-button bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </form>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/listings"
            className="px-4 py-2 text-sm font-medium rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            Browse all listings
          </Link>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium rounded-button bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
