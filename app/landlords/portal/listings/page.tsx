import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 30

interface LandlordListing {
  id: string
  title: string
  neighborhood: string
  rent_monthly: number
  room_type: string
  status: string
  filled: boolean
  created_at: string
}

export default async function LandlordListingsPage() {
  if (process.env.NEXT_PUBLIC_LANDLORD_PORTAL !== 'true') {
    redirect('/')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data } = await supabase
    .from('listings')
    .select('id, title, neighborhood, rent_monthly, room_type, status, filled, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const listings = (data ?? []) as LandlordListing[]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Listings</h1>
        <p className="text-sm text-gray-500 mt-1">{listings.length} listing{listings.length !== 1 ? 's' : ''}</p>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white rounded-card border border-gray-200 p-12 text-center shadow-card">
          <h3 className="text-sm font-semibold text-gray-900">No listings yet</h3>
          <p className="text-sm text-gray-500 mt-1">Your active listings will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Neighborhood</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Rent</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900 max-w-[200px] truncate">
                      {listing.title}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{listing.neighborhood || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">${listing.rent_monthly?.toLocaleString()}/mo</td>
                    <td className="px-5 py-3.5 text-gray-600 capitalize">
                      {listing.room_type?.replace(/_/g, ' ') || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={[
                        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-badge capitalize',
                        listing.filled
                          ? 'bg-blue-100 text-blue-800'
                          : listing.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : listing.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800',
                      ].join(' ')}>
                        {listing.filled ? 'Filled' : listing.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-button bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors cursor-not-allowed opacity-50"
                        disabled
                        title="Coming soon"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden divide-y divide-gray-100">
            {listings.map((listing) => (
              <div key={listing.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-gray-900 truncate pr-2">{listing.title}</p>
                  <span className={[
                    'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-badge capitalize shrink-0',
                    listing.filled
                      ? 'bg-blue-100 text-blue-800'
                      : listing.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800',
                  ].join(' ')}>
                    {listing.filled ? 'Filled' : listing.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{listing.neighborhood || 'Boulder'}</span>
                  <span>${listing.rent_monthly?.toLocaleString()}/mo</span>
                  <span className="capitalize">{listing.room_type?.replace(/_/g, ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
