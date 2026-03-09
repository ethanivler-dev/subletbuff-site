import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { shouldHideTestListings } from '@/lib/appEnv'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Boulder Neighborhoods for Student Housing | SubletBuff',
  description: 'Explore Boulder neighborhoods near CU. Find the best area for your summer sublet — The Hill, Goss-Grove, Baseline Sub, Chautauqua, and more.',
  alternates: { canonical: '/neighborhoods' },
}

export const revalidate = 300

const neighborhoods = [
  {
    slug: 'the-hill',
    dbName: 'The Hill',
    name: 'The Hill',
    vibe: 'Social & Walkable',
    description: 'The student hub right next to campus. Packed with bars, restaurants, and shops. Tree-lined streets, historic homes, and Greek life. Walk to class in under 10 minutes. Best for students who want to be in the middle of everything.',
    image: '/neighborhoods/the-hill.webp',
  },
  {
    slug: 'goss-grove',
    dbName: 'Goss-Grove',
    name: 'Goss-Grove',
    vibe: 'Convenient & Quiet',
    description: 'A quiet pocket between campus and Pearl Street. Small historic homes on shaded streets. Popular with grad students and staff who want walkable access to both campus and downtown.',
    image: '/neighborhoods/goss-grove.jpeg',
  },
  {
    slug: 'baseline-sub',
    dbName: 'Baseline Sub',
    name: 'Baseline Sub',
    vibe: 'Student Apartments',
    description: 'The apartment corridor along 28th Street — U Club, Gold Run, Spanish Towers, and others. Purpose-built student housing with pools, gyms, and shuttle access. Best for students who want amenities without a house.',
    image: '/neighborhoods/baseline-sub.jpeg',
  },
  {
    slug: 'chautauqua',
    dbName: 'Chautauqua',
    name: 'Chautauqua',
    vibe: 'Premium & Scenic',
    description: 'At the base of the Flatirons with direct trail access. Quieter, more expensive, and stunning. Great for grad students, researchers, or anyone who prioritizes nature and space over nightlife.',
    image: '/neighborhoods/chautauqua.jpg',
  },
  {
    slug: 'martin-acres',
    dbName: 'Martin Acres',
    name: 'Martin Acres',
    vibe: 'Spacious & Residential',
    description: 'A residential neighborhood south of campus with more room and lower rents. Bikeable to CU in 10-15 minutes. Popular with families, grad students, and anyone who wants a quieter pace.',
    image: '/neighborhoods/martin-acres.jpeg',
  },
  {
    slug: 'north-boulder',
    dbName: 'North Boulder',
    name: 'North Boulder (NoBo)',
    vibe: 'Modern & Laid-Back',
    description: 'Boulder\u2019s most laid-back area, north of downtown. Local coffee shops, breweries, and a community feel. A bus ride or 15-20 minute bike to campus. Best for people who don\u2019t need to be close to the university.',
    image: '/neighborhoods/north-boulder.jpg',
  },
  {
    slug: 'south-boulder',
    dbName: 'South Boulder',
    name: 'South Boulder',
    vibe: 'Quiet & Nature-Adjacent',
    description: 'Residential and nature-adjacent along the South Boulder Creek trail. Close to Table Mesa park-and-ride for easy bus commutes. A good balance of quiet living and campus access.',
    image: '/neighborhoods/south-boulder.avif',
  },
  {
    slug: 'downtown',
    dbName: 'Downtown',
    name: 'Downtown / Pearl Street',
    vibe: 'Central & Vibrant',
    description: 'The heart of Boulder — restaurants, shops, street performers on the Pearl Street Mall. Walking distance to campus. Pricier, but you\u2019re at the center of everything.',
    image: '/neighborhoods/downtown.jpg',
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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://subletbuff.com'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Boulder Neighborhoods for Student Housing',
    numberOfItems: neighborhoods.length,
    itemListElement: neighborhoods.map((n, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: n.name,
      url: `${baseUrl}/listings?neighborhood=${encodeURIComponent(n.dbName)}`,
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
          <div className="mb-12">
            <h1 className="font-serif text-4xl sm:text-5xl text-gray-900 mb-3">
              Neighborhoods
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl">
              Find the Boulder neighborhood that fits your lifestyle.
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
                  {/* Photo */}
                  <div className="relative aspect-[16/10] bg-gray-100">
                    <Image
                      src={n.image}
                      alt={`${n.name} neighborhood in Boulder`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {/* Listing count badge */}
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-medium px-2.5 py-1 rounded-full">
                      {listingCount} Listing{listingCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    {/* Name */}
                    <h2 className="font-serif text-xl text-gray-900 mb-2">{n.name}</h2>

                    {/* Vibe tag */}
                    <span className="inline-block text-[11px] font-semibold tracking-wider uppercase border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full w-fit mb-3">
                      {n.vibe}
                    </span>

                    {/* Description */}
                    <p className="text-sm text-gray-500 leading-relaxed flex-1 mb-4">
                      {n.description}
                    </p>

                    {/* CTA */}
                    <Link
                      href={`/listings?neighborhood=${encodeURIComponent(n.dbName)}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      Explore Neighborhood
                      <ArrowRight className="w-3.5 h-3.5" />
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
