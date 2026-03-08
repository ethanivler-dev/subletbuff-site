import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://subletbuff.com'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/listings`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/neighborhoods`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/how-it-works`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/safety`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/post`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  // Dynamic listing pages
  const supabase = await createClient()
  const { data: listings } = await supabase
    .from('listings')
    .select('id, created_at')
    .eq('status', 'approved')
    .eq('paused', false)
    .eq('filled', false)
    .eq('test_listing', false)
    .order('created_at', { ascending: false })

  const listingPages: MetadataRoute.Sitemap = (listings ?? []).map((listing) => ({
    url: `${baseUrl}/listings/${listing.id}`,
    lastModified: listing.created_at ? new Date(listing.created_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...listingPages]
}
