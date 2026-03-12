'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, User, LogOut, Shield, MessageCircle } from 'lucide-react'
// admin check passed via prop from Navbar
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  user: SupabaseUser | null
  isAdminUser?: boolean
  onSignOut: () => void
}

export function MobileMenu({ isOpen, onClose, user, isAdminUser = false, onSignOut }: MobileMenuProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('/api/messages/unread-count')
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.count)
        }
      } catch { /* ignore */ }
    }

    if (user && isOpen) {
      fetchUnread()
      intervalRef.current = setInterval(fetchUnread, 60000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [user, isOpen])

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
            className="p-2.5 -mr-2.5 rounded hover:bg-gray-100 text-gray-600"
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
            href="/neighborhoods"
            onClick={onClose}
            className="py-3 px-2 text-gray-800 hover:text-primary-600 font-medium rounded-button hover:bg-gray-50 transition-colors"
          >
            Neighborhoods
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
          {user ? (
            <>
              <Link
                href="/messages"
                onClick={onClose}
                className="inline-flex items-center gap-2 w-full px-6 py-3 text-base font-medium rounded-button bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 transition-colors relative"
              >
                <MessageCircle className="w-4 h-4" />
                Messages
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/account"
                onClick={onClose}
                className="inline-flex items-center gap-2 w-full px-6 py-3 text-base font-medium rounded-button bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4" />
                My Account
              </Link>
              <Link
                href="/account/listings"
                onClick={onClose}
                className="inline-flex items-center gap-2 w-full px-6 py-3 text-base font-medium rounded-button bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                My Listings
              </Link>
              {isAdminUser && (
                <Link
                  href="/admin"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 w-full px-6 py-3 text-base font-medium rounded-button bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              )}
              <button
                onClick={() => { onSignOut(); onClose() }}
                className="inline-flex items-center gap-2 justify-center w-full px-6 py-3 text-base font-medium rounded-button bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                onClick={onClose}
                className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium rounded-button bg-white text-primary-600 border border-primary-600 hover:bg-primary-50 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                onClick={onClose}
                className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  )
}
