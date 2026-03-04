import { createClient } from '@/lib/supabase/server'
import { ShieldCheck, Eye, MapPin } from 'lucide-react'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const { count } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')
    .eq('paused', false)
    .eq('filled', false)

  return (
    <>
      {/* Hero — full-viewport placeholder until Phase 1 */}
      <section className="relative min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-700 to-primary-900 pt-16">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/50" />

        <div className="relative z-10 text-center px-4 sm:px-6 max-w-3xl mx-auto">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-4">
            Find Short-Term Housing<br />in Boulder
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Verified sublets for interns, seasonal workers, and researchers.
          </p>

          {/* Search bar placeholder */}
          <div className="bg-white rounded-full shadow-lg flex items-center gap-3 px-4 py-2 max-w-xl mx-auto mb-6">
            <input
              type="text"
              placeholder="Search neighborhoods, landmarks..."
              className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none py-2 pl-2"
            />
            <a
              href="/listings"
              className="flex-shrink-0 px-5 py-2 bg-accent-500 hover:bg-accent-600 text-gray-900 text-sm font-semibold rounded-full transition-colors"
            >
              Search
            </a>
          </div>

          {/* Quick filter pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {['Furnished', 'Available Now', 'Under $1K', 'Near Campus', 'Pet Friendly'].map(
              (label) => (
                <a
                  key={label}
                  href={`/listings?filter=${label.toLowerCase().replace(/\s+/g, '_')}`}
                  className="px-4 py-1.5 text-sm font-medium text-white border border-white/50 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {label}
                </a>
              )
            )}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-center">
            <div className="flex items-center gap-3 text-gray-600">
              <ShieldCheck className="w-6 h-6 text-primary-600 flex-shrink-0" />
              <span className="text-sm font-medium">
                Verified listings
                {count != null && count > 0 && (
                  <span className="block text-xs text-gray-400">{count} active now</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Eye className="w-6 h-6 text-primary-600 flex-shrink-0" />
              <span className="text-sm font-medium">Free to browse</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="w-6 h-6 text-primary-600 flex-shrink-0" />
              <span className="text-sm font-medium">Boulder focused</span>
            </div>
          </div>
        </div>
      </section>

      {/* Spacer so footer doesn't cut in oddly */}
      <div className="h-24 bg-white" />
    </>
  )
}
