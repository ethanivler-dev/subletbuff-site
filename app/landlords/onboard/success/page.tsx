import { redirect } from 'next/navigation'
import Link from 'next/link'

export default function OnboardSuccessPage() {
  if (process.env.NEXT_PUBLIC_LANDLORD_PORTAL !== 'true') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          You&apos;re all set!
        </h1>
        <p className="text-gray-600 mb-8">
          Your landlord portal is ready.
        </p>
        <Link
          href="/landlords/portal"
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
