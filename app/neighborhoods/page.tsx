import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Gem, Landmark, TreePine, Building2, Mountain, Users, Coffee, Bus, Leaf } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { shouldHideTestListings } from '@/lib/appEnv'
import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Boulder Neighborhoods for Student Housing | SubletBuff',
  description: 'Explore Boulder neighborhoods near CU. Find the best area for your summer sublet — The Hill, University Hill, Goss-Grove, Baseline Sub, Chautauqua, and more.',
  alternates: { canonical: '/neighborhoods' },
}

export const revalidate = 300

const neighborhoods: {
  slug: string
  dbName: string
  name: string
  vibe: string
  description: string
  image: string
  icon: LucideIcon
}[] = [
  {
    slug: 'the-hill',
    dbName: 'The Hill',
    name: 'The Hill',
    vibe: 'Social & Energetic',
    description: 'The classic CU Boulder experience. Right next to campus, bustling with activity, students, and iconic local spots like The Sink.',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
    icon: Gem,
  },
  {
    slug: 'university-hill',
    dbName: 'University Hill',
    name: 'University Hill',
    vibe: 'Historic & Walkable',
    description: 'Historic homes and tree-lined streets just east of campus. Home to many Greek life organizations. Walking distance to everything.',
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    icon: Landmark,
  },
  {
    slug: 'goss-grove',
    dbName: 'Goss-Grove',
    name: 'Goss-Grove',
    vibe: 'Convenient & Quiet',
    description: 'A charming area tucked between campus and Pearl Street. Known for its historic homes and beautiful tree-lined streets.',
    image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80',
    icon: TreePine,
  },
  {
    slug: 'baseline-sub',
    dbName: 'Baseline Sub',
    name: 'Baseline Sub',
    vibe: 'Student Apartments',
    description: 'The apartment complex corridor along 28th Street. U Club, Gold Run, Spanish Towers, and more. Student-heavy with lots of amenities.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
    icon: Building2,
  },
  {
    slug: 'chautauqua',
    dbName: 'Chautauqua',
    name: 'Chautauqua',
    vibe: 'Premium & Scenic',
    description: 'At the base of the Flatirons. Quieter, more premium housing. Beautiful nature access. Great for grad students and researchers.',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    icon: Mountain,
  },
  {
    slug: 'martin-acres',
    dbName: 'Martin Acres',
    name: 'Martin Acres',
    vibe: 'Spacious & Residential',
    description: 'Located south of campus, this area offers more space and a more traditional residential feel while still being bikeable to class.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    icon: Users,
  },
  {
    slug: 'north-boulder',
    dbName: 'North Boulder',
    name: 'North Boulder',
    vibe: 'Modern & Trendy',
    description: 'A bit further from campus but offers modern apartments, great coffee shops, and easy access to the mountain trails.',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    icon: Coffee,
  },
  {
    slug: 'east-boulder',
    dbName: 'East Boulder',
    name: 'East Boulder',
    vibe: 'Industrial & Accessible',
    description: 'Home to many newer apartment complexes and convenient shopping centers. Great transit access to campus.',
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
    icon: Bus,
  },
  {
    slug: 'south-boulder',
    dbName: 'South Boulder',
    name: 'South Boulder / Table Mesa',
    vibe: 'Quiet & Nature-Adjacent',
    description: 'Quiet residential area popular with grad students and families. Close to NCAR, South Boulder trails, and the Table Mesa bus route.',
    image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80',
    icon: Leaf,
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
          <div className="mb-14">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-gray-900 mb-4 leading-tight">
              Boulder&apos;s <span className="text-primary-600">Best Neighborhoods.</span>
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl">
              From the energetic Hill to the quiet trails of North Boulder, find the area that fits your student lifestyle.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {neighborhoods.map((n) => {
              const listingCount = counts[n.dbName] ?? 0
              const Icon = n.icon
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
                    {/* Name + icon */}
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h2 className="font-serif text-xl text-gray-900">{n.name}</h2>
                      <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>

                    {/* Vibe tag */}
                    <span className="inline-block text-[11px] font-semibold tracking-wider uppercase border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full w-fit mb-3">
                      {n.vibe}
                    </span>

                    {/* Description */}
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 flex-1 mb-4">
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
