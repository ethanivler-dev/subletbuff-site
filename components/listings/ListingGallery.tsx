'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X, Camera } from 'lucide-react'
import { SaveButton } from '@/components/listings/SaveButton'

interface Photo {
  url: string
  display_order: number
  is_primary: boolean
  caption?: string
}

interface ListingGalleryProps {
  photos: Photo[]
  title: string
  listingId?: string
  initialSaved?: boolean
  saveCount?: number
}

export function ListingGallery({
  photos,
  title,
  listingId,
  initialSaved = false,
  saveCount = 0,
}: ListingGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const sorted = [...photos].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return a.display_order - b.display_order
  })

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index)
    setLightboxOpen(true)
  }, [])

  const closeLightbox = useCallback(() => setLightboxOpen(false), [])

  const prev = useCallback(() => {
    setActiveIndex((i) => (i === 0 ? sorted.length - 1 : i - 1))
  }, [sorted.length])

  const next = useCallback(() => {
    setActiveIndex((i) => (i === sorted.length - 1 ? 0 : i + 1))
  }, [sorted.length])

  if (sorted.length === 0) {
    return (
      <div className="relative w-full aspect-[2/1] bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
        <div className="text-center text-primary-400">
          <Camera className="w-12 h-12 mx-auto mb-2" />
          <p className="text-sm">No photos available</p>
        </div>
        {listingId && (
          <div className="absolute top-3 right-3 z-10">
            <SaveButton
              listingId={listingId}
              initialSaved={initialSaved}
              saveCount={saveCount}
              variant="gallery"
            />
          </div>
        )}
      </div>
    )
  }

  // Grid layout: 1 big + up to 4 thumbnails
  const main = sorted[0]
  const thumbs = sorted.slice(1, 5)
  const remaining = sorted.length - 5

  return (
    <>
      <div className="relative w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-1 md:gap-2 max-h-[500px] overflow-hidden rounded-card">
          {/* Main photo */}
          <button
            onClick={() => openLightbox(0)}
            className="relative md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto bg-gray-100 cursor-pointer group overflow-hidden"
          >
            <Image
              src={main.url}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </button>

          {/* Thumbnail grid */}
          {thumbs.map((photo, i) => (
            <button
              key={photo.url}
              onClick={() => openLightbox(i + 1)}
              className="relative hidden md:block aspect-[4/3] bg-gray-100 cursor-pointer group overflow-hidden"
            >
              <Image
                src={photo.url}
                alt={`${title} photo ${i + 2}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="25vw"
              />
              {/* "See all" overlay on last thumbnail */}
              {i === thumbs.length - 1 && remaining > 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">+{remaining} more</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Save button — floats over top-right corner of the gallery grid */}
        {listingId && (
          <div className="absolute top-3 right-3 z-10">
            <SaveButton
              listingId={listingId}
              initialSaved={initialSaved}
              saveCount={saveCount}
              variant="gallery"
            />
          </div>
        )}

        {/* Mobile "See all photos" button */}
        {sorted.length > 1 && (
          <button
            onClick={() => openLightbox(0)}
            className="md:hidden mt-2 w-full text-center text-sm text-primary-600 font-medium py-2"
          >
            See all {sorted.length} photos
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
            aria-label="Close gallery"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/80 text-sm z-10">
            {activeIndex + 1} / {sorted.length}
          </div>

          {/* Main image */}
          <div
            className="relative w-full max-w-4xl mx-auto aspect-[3/2] px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={sorted[activeIndex].url}
              alt={`${title} photo ${activeIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {/* Caption */}
          {sorted[activeIndex].caption && (
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-lg text-center z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white/90 text-sm bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
                {sorted[activeIndex].caption}
              </p>
            </div>
          )}

          {/* Prev / Next */}
          {sorted.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
