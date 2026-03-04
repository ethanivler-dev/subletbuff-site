import { Suspense } from 'react'
import { ShieldCheck, Eye, MapPin } from 'lucide-react'
import { HeroSearch } from '@/components/home/HeroSearch'
import { FeaturedGrid } from '@/components/home/FeaturedGrid'
import { ListingCardSkeleton } from '@/components/ui/Skeleton'

export const revalidate = 60

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative min-h-[85vh] lg:min-h-[80vh] flex items-center justify-center pt-16"
        style={{
          background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 40%, #1D4ED8 60%, #1E3A5F 100%)',
        }}
      >
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />

        <div className="relative z-10 w-full px-4 sm:px-6 py-16">
          <HeroSearch />
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-gray-50 border-b border-gray-100 py-10">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-20">
            <div className="flex items-center gap-3 text-gray-600">
              <ShieldCheck className="w-6 h-6 text-primary-600 flex-shrink-0" />
              <span className="text-sm font-medium">Verified listings</span>
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

      {/* Featured listings grid */}
      <Suspense
        fallback={
          <section className="py-16 lg:py-24 bg-white">
            <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
              <div className="h-9 bg-gray-200 rounded w-48 mb-8 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ListingCardSkeleton key={i} variant="vertical" />
                ))}
              </div>
            </div>
          </section>
        }
      >
        <FeaturedGrid />
      </Suspense>
    </>
  )
}
