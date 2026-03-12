import { Suspense } from 'react'
import Image from 'next/image'
import { ShieldCheck, Eye, MapPin } from 'lucide-react'
import { HeroSearch } from '@/components/home/HeroSearch'
import { FeaturedGrid } from '@/components/home/FeaturedGrid'
import { ListingCardSkeleton } from '@/components/ui/Skeleton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SubletBuff | Boulder Sublets & Short-Term Housing Near CU',
  description: 'Find verified summer sublets and short-term housing in Boulder, CO. Free for students. No scams, no fees. Browse furnished rooms, apartments, and houses near CU Boulder.',
  alternates: { canonical: '/' },
}

export const revalidate = 60

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SubletBuff',
  url: 'https://subletbuff.com',
  description: "Boulder's verified sublet marketplace for CU students, interns, and researchers.",
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <section className="relative min-h-[60vh] sm:min-h-[75vh] lg:min-h-[80vh] flex items-center justify-center pt-16">
        {/* Background image */}
        <Image
          src="/hero-flatirons.jpg"
          alt="Boulder Flatirons - SubletBuff short-term housing marketplace"
          fill
          priority
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QCARXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAIdpAAQAAAABAAAATgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAABCgAwAEAAAAAQAAAAgAAAAA/+0AOFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAAAOEJJTQQlAAAAAAAQ1B2M2Y8AsgTpgAmY7PhCfv/CABEIAAgAEAMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAADAgQBBQAGBwgJCgv/xADDEAABAwMCBAMEBgQHBgQIBnMBAgADEQQSIQUxEyIQBkFRMhRhcSMHgSCRQhWhUjOxJGIwFsFy0UOSNIII4VNAJWMXNfCTc6JQRLKD8SZUNmSUdMJg0oSjGHDiJ0U3ZbNVdaSVw4Xy00Z2gONHVma0CQoZGigpKjg5OkhJSldYWVpnaGlqd3h5eoaHiImKkJaXmJmaoKWmp6ipqrC1tre4ubrAxMXGx8jJytDU1dbX2Nna4OTl5ufo6erz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAECAAMEBQYHCAkKC//EAMMRAAICAQMDAwIDBQIFAgQEhwEAAhEDEBIhBCAxQRMFMCIyURRABjMjYUIVcVI0gVAkkaFDsRYHYjVT8NElYMFE4XLxF4JjNnAmRVSSJ6LSCAkKGBkaKCkqNzg5OkZHSElKVVZXWFlaZGVmZ2hpanN0dXZ3eHl6gIOEhYaHiImKkJOUlZaXmJmaoKOkpaanqKmqsLKztLW2t7i5usDCw8TFxsfIycrQ09TV1tfY2drg4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwACAgICAgIDAgIDBQMDAwUGBQUFBQYIBgYGBgYICggICAgICAoKCgoKCgoKDAwMDAwMDg4ODg4PDw8PDw8PDw8P/9sAQwECAgIEBAQHBAQHEAsJCxAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ/9oADAMBAAIRAxEAAAHpvMPnKw+Vz//aAAgBAQABBQL/AGZdrJBeeMt1kf8A/9oACAEDEQE/AZdRM8W//9oACAECEQE/AcnXZBk2h//aAAgBAQAGPwIe5WtJDxC1AUdTJCCfKlf4H//EADMQAQADAAICAgICAwEBAAACCwERACExQVFhcYGRobHB8NEQ4fEgMEBQYHCAkKCwwNDg/9oACAEBAAE/ISLABDPw5prz9Tj7Mfy3/9oADAMBAAIRAxEAABDn/8QAMxEBAQEAAwABAgUFAQEAAQEJAQARITEQQVFhIHHwkYGhsdHB4fEwQFBgcICQoLDA0OD/2gAIAQMRAT8Q2OA+1//aAAgBAhEBPxDQwB9v88f0v//aAAgBAQABPxA3dobrpElfihfQFlpvDnUO3fd//9k="
          className="object-cover"
          sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, (max-width: 1920px) 1920px, 2560px"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/50 pointer-events-none" />

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
