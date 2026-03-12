'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, User, ChevronDown, LogOut, Shield, MessageCircle } from 'lucide-react'
import { MobileMenu } from './MobileMenu'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_USER_ID, isAdmin } from '@/lib/admin'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  // Transparent on homepage only; solid on all other pages
  const transparent = pathname === '/'
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const unreadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Scroll listener for transparent→solid transition
  useEffect(() => {
    if (!transparent) return
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [transparent])

  // Load current user + check admin status
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        if (isAdmin(data.user.id)) {
          setIsAdminUser(true)
        } else {
          const { data: row } = await supabase
            .from('admins')
            .select('id')
            .eq('id', data.user.id)
            .maybeSingle()
          setIsAdminUser(!!row)
        }
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Poll unread message count
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

    if (user) {
      fetchUnread()
      unreadIntervalRef.current = setInterval(fetchUnread, 60000)
    } else {
      setUnreadCount(0)
    }

    return () => {
      if (unreadIntervalRef.current) {
        clearInterval(unreadIntervalRef.current)
        unreadIntervalRef.current = null
      }
    }
  }, [user])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isSolid = !transparent || scrolled
  const textColor = isSolid ? 'text-gray-800' : 'text-white'
  const bgClass = isSolid ? 'bg-white shadow-nav' : 'bg-transparent'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setDropdownOpen(false)
    window.location.href = '/'
  }


  return (
    <>
      <header
        className={[
          'fixed top-0 left-0 right-0 z-30 transition-all duration-300',
          bgClass,
        ].join(' ')}
      >
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="SubletBuff"
                width={3772}
                height={1120}
                className="h-9 w-auto transition-all duration-300"
                priority
                unoptimized
              />
            </Link>

            {/* Center nav links (desktop) */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/listings"
                className={[textColor, 'text-sm font-medium hover:opacity-70 transition-opacity'].join(' ')}
              >
                Browse Listings
              </Link>
              <Link
                href="/neighborhoods"
                className={[textColor, 'text-sm font-medium hover:opacity-70 transition-opacity'].join(' ')}
              >
                Neighborhoods
              </Link>
              <Link
                href="/how-it-works"
                className={[textColor, 'text-sm font-medium hover:opacity-70 transition-opacity'].join(' ')}
              >
                How It Works
              </Link>
              <Link
                href="/safety"
                className={[textColor, 'text-sm font-medium hover:opacity-70 transition-opacity'].join(' ')}
              >
                Safety
              </Link>
            </nav>

            {/* Right side (desktop) */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/post"
                className="px-4 py-2 text-sm font-medium rounded-button bg-accent-500 text-gray-900 hover:bg-accent-600 transition-colors"
              >
                Post a Listing
              </Link>

              {user && (
                <Link
                  href="/messages"
                  className={['relative p-2 rounded-lg hover:bg-black/5 transition-colors', textColor].join(' ')}
                  title="Messages"
                >
                  <MessageCircle className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className={[
                      'flex items-center gap-2 text-sm font-medium',
                      textColor,
                      'hover:opacity-70 transition-opacity',
                    ].join(' ')}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-card shadow-card-hover border border-gray-100 py-1 z-50">
                      <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100 truncate">
                        {user.email}
                      </div>
                      <Link
                        href="/messages"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Messages
                        {unreadCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/account"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <User className="w-4 h-4" />
                        My Account
                      </Link>
                      <Link
                        href="/account/listings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        My Listings
                      </Link>
                      {isAdminUser && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Shield className="w-4 h-4" />
                          Admin
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className={[textColor, 'text-sm font-medium hover:opacity-70 transition-opacity'].join(' ')}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-4 py-2 text-sm font-medium rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Hamburger (mobile) */}
            <button
              className={['md:hidden p-2.5 -mr-2.5 rounded', textColor].join(' ')}
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} user={user} isAdminUser={isAdminUser} onSignOut={handleSignOut} />
    </>
  )
}
