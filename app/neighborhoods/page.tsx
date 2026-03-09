import Link from 'next/link'
import { MapPin, Clock, DollarSign, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { shouldHideTestListings } from '@/lib/appEnv'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Boulder Neighborhoods for Student Housing | SubletBuff',
  description: 'Explore Boulder neighborhoods near CU. Find the best area for your summer sublet — The Hill, University Hill, Goss-Grove, Baseline Sub, Chautauqua, and more.',
  alternates: { canonical: '/neighborhoods' },
}

export const revalidate = 300

const neighborhoods = [
  {
    slug: 'the-hill',
    dbName: 'The Hill',
    name: 'The Hill',
    vibe: 'Social & Energetic',
    vibeColor: 'bg-orange-100 text-orange-800',
    description: 'The classic CU Boulder experience. Right next to campus, bustling with activity, students, and iconic local spots like The Sink. The most popular area for student housing.',
    walkToCampus: '2–5 min walk',
    avgRent: '$900–1,400/room',
  },
  {
    slug: 'university-hill',
    dbName: 'University Hill',
    name: 'University Hill',
    vibe: 'Historic & Walkable',
    vibeColor: 'bg-blue-100 text-blue-800',
    description: 'Historic homes and tree-lined streets just east of campus. Home to many Greek life organizations. Walking distance to everything.',
    walkToCampus: '5–10 min walk',
    avgRent: '$800–1,300/room',
  },
  {
    slug: 'goss-grove',
    dbName: 'Goss-Grove',
    name: 'Goss-Grove',
    vibe: 'Convenient & Quiet',
    vibeColor: 'bg-green-100 text-green-800',
    description: 'A charming area tucked between campus and Pearl Street. Known for its historic homes and beautiful tree-lined streets. Great for students who want proximity without the noise.',
    walkToCampus: '5–10 min walk',
    avgRent: '$850–1,200/room',
  },
  {
    slug: 'baseline-sub',
    dbName: 'Baseline',
    name: 'Baseline Sub',
    vibe: 'Student Apartments',
    vibeColor: 'bg-purple-100 text-purple-800',
    description: 'The apartment complex corridor along 28th Street. U Club, Gold Run, Spanish Towers, and more. Student-heavy with lots of amenities. Easy bus access to campus.',
    walkToCampus: '10–15 min walk / 5 min bike',
    avgRent: '$750–1,100/room',
  },
  {
    slug: 'chautauqua',
    dbName: 'Chautauqua',
    name: 'Chautauqua',
    vibe: 'Premium & Scenic',
    vibeColor: 'bg-emerald-100 text-emerald-800',
    description: 'At the base of the Flatirons. Quieter, more premium housing. Beautiful nature access. Great for grad students and researchers who want peace and proximity to trails.',
    walkToCampus: '15–20 min walk / 8 min bike',
    avgRent: '$1,100–1,600/room',
  },
  {
    slug: 'martin-acres',
    dbName: 'Martin Acres',
    name: 'Martin Acres',
    vibe: 'Spacious & Residential',
    vibeColor: 'bg-amber-100 text-amber-800',
    description: 'Located south of campus. More space and a traditional residential feel while still being bikeable to class. Popular with students who want a quieter lifestyle.',
    walkToCampus: '15–20 min bike',
    avgRent: '$700–1,000/room',
  },
  {
    slug: 'north-boulder',
    dbName: 'North Boulder',
    name: 'North Boulder',
    vibe: 'Modern & Trendy',
    vibeColor: 'bg-sky-100 text-sky-800',
    description: 'A bit further from campus but offers modern apartments, great coffee shops, and easy access to mountain trails. Growing in popularity with remote workers and grad students.',
    walkToCampus: '20+ min bike / bus',
    avgRent: '$900–1,300/room',
  },
  {
    slug: 'east-boulder',
    dbName: 'East Boulder',
    name: 'East Boulder',
    vibe: 'Affordable & Accessible',
    vibeColor: 'bg-teal-100 text-teal-800',
    description: 'Home to many newer apartment complexes and convenient shopping. Great transit access to campus via the 204/225 bus routes. More affordable options.',
    walkToCampus: '15 min bike / 10 min bus',
    avgRent: '$650–950/room',
  },
  {
    slug: 'south-boulder',
    dbName: 'South Boulder',
    name: 'South Boulder / Table Mesa',
    vibe: 'Quiet & Nature-Adjacent',
    vibeColor: 'bg-lime-100 text-lime-800',
    description: 'Quiet residential area popular with grad students and families. Close to NCAR, South Boulder trails, and the Table Mesa bus route to campus.',
    walkToCampus: '20+ min bike / 15 min bus',
    avgRent: '$800–1,200/room',
  },
]

async function getListingCounts(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const counts: Record<string, number> = {}

  for (const n of neighborhoods) {
    let countQuery = supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('paused', false)
      .eq('filled', false)
      .eq('neighborhood', n.dbName)

    if (shouldHideTestListings()) {
      countQuery = countQuery.eq('test_listing', false)
    }

    const { count } = await countQuery

    counts[n.dbName] = count ?? 0
  }

  return counts
}

export default async function NeighborhoodsPage() {
  const counts = await getListingCounts()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Boulder Neighborhoods for Student Housing',
    numberOfItems: neighborhoods.length,
    itemListElement: neighborhoods.map((n, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: n.name,
      url: `https://subletbuff.com/listings?neighborhood=${encodeURIComponent(n.dbName)}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-white pt-28 pb-20">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl sm:text-5xl text-gray-900 mb-4">
              Boulder Neighborhoods
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Find the perfect area for your summer sublet. Each neighborhood has its own vibe,
              price range, and commute time to CU campus.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {neighborhoods.map((n) => {
              const listingCount = counts[n.dbName] ?? 0
              return (
                <div
                  key={n.slug}
                  className="rounded-card border border-gray-100 bg-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
                >
                  {/* Color bar header */}
                  <div className="h-2 bg-primary-600" />

                  <div className="p-6 flex flex-col flex-1">
                    {/* Name + vibe */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h2 className="font-serif text-xl text-gray-900">{n.name}</h2>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${n.vibeColor}`}>
                        {n.vibe}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 leading-relaxed mb-5 flex-1">
                      {n.description}
                    </p>

                    {/* Stats */}
                    <div className="flex flex-col gap-2 mb-5 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{n.walkToCampus} to campus</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{n.avgRent}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>
                          {listingCount === 0
                            ? 'No listings yet'
                            : `${listingCount} listing${listingCount !== 1 ? 's' : ''} available`}
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/listings?neighborhood=${encodeURIComponent(n.dbName)}`}
                      className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                    >
                      Explore {n.name}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="text-gray-500 mb-4">Don&apos;t see your neighborhood? We&apos;re always growing.</p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-button border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Browse All Listings
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
