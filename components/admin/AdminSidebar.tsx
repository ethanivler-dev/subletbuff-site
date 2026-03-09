'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, FileCheck, Users } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Listings', icon: LayoutGrid },
  { href: '/admin/leases', label: 'Lease Reviews', icon: FileCheck },
  { href: '/admin/admins', label: 'Manage Admins', icon: Users },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)]">
      <div className="p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-3">
          Admin
        </h2>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
