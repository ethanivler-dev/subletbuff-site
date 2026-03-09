'use client'

import Link from 'next/link'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-5xl mb-4">⚠️</p>
        <h1 className="font-serif text-2xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          An unexpected error occurred. Please try again.
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            Try again
          </button>
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
