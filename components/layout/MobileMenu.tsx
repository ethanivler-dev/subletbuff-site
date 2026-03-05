'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">Menu</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col px-6 py-6 gap-1 flex-1">
          <Link
            href="/listings"
            onClick={onClose}
            className="py-3 px-2 text-gray-800 hover:text-primary-600 font-medium rounded-button hover:bg-gray-50 transition-colors"
          >
            Browse Listings
          </Link>
          <Link
            href="/how-it-works"
            onClick={onClose}
            className="py-3 px-2 text-gray-800 hover:text-primary-600 font-medium rounded-button hover:bg-gray-50 transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/safety"
            onClick={onClose}
            className="py-3 px-2 text-gray-800 hover:text-primary-600 font-medium rounded-button hover:bg-gray-50 transition-colors"
          >
            Safety
          </Link>
        </nav>

        <div className="px-6 py-6 border-t border-gray-100 flex flex-col gap-3">
          <Link
            href="/post"
            onClick={onClose}
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium rounded-button bg-accent-500 text-gray-900 hover:bg-accent-600 transition-colors"
          >
            Post a Listing
          </Link>
          <Link
            href="/auth/login"
            onClick={onClose}
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium rounded-button bg-white text-primary-600 border border-primary-600 hover:bg-primary-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </>
  )
}
