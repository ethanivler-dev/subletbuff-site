'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Building2, ArrowLeftRight, Settings, Menu, X } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/landlords/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/landlords/portal/listings', label: 'Listings', icon: Building2 },
  { href: '/landlords/portal/transfer-requests', label: 'Transfer Requests', icon: ArrowLeftRight },
  { href: '/landlords/portal/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navContent = (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/landlords/portal'
            ? pathname === '/landlords/portal'
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={[
              'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            ].join(' ')}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)]">
        <div className="p-4 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 px-3">
            Landlord Portal
          </h2>
          {navContent}
        </div>
      </aside>

      {/* Mobile hamburger button */}
      <div className="lg:hidden fixed top-[72px] left-4 z-40">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 bg-white rounded-lg shadow-card border border-gray-200 text-gray-600 hover:text-gray-900"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/20"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out sidebar */}
      <aside
        className={[
          'lg:hidden fixed top-0 left-0 z-30 w-64 h-full bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out pt-[120px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 px-3">
            Landlord Portal
          </h2>
          {navContent}
        </div>
      </aside>
    </>
  )
}
