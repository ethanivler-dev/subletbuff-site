import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Building2, ArrowLeftRight, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/landlord/StatCard'
import { TransferTable, type TransferRequest } from '@/components/landlord/TransferTable'

export const revalidate = 30

export default async function LandlordDashboardPage() {
  if (process.env.NEXT_PUBLIC_LANDLORD_PORTAL !== 'true') {
    redirect('/')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch active listings for this landlord
  const { data: listings, count: listingsCount } = await supabase
    .from('listings')
    .select('id, filled', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .eq('paused', false)

  const activeListings = listingsCount ?? 0
  const filledListings = listings?.filter((l) => l.filled).length ?? 0
  const occupancyRate = activeListings > 0
    ? Math.round((filledListings / activeListings) * 100)
    : 0

  // Fetch transfer requests
  const { data: transferRequests } = await supabase
    .from('transfer_requests')
    .select('*')
    .eq('landlord_id', user.id)
    .order('created_at', { ascending: false })

  const requests = (transferRequests ?? []) as TransferRequest[]
  const pendingCount = requests.filter((r) => r.status === 'pending').length

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your properties and transfer requests</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Active Listings"
          value={activeListings}
          detail={`${filledListings} filled`}
          icon={Building2}
          iconColor="text-primary-600"
        />
        <StatCard
          label="Pending Requests"
          value={pendingCount}
          detail={`${requests.length} total requests`}
          icon={ArrowLeftRight}
          iconColor="text-yellow-600"
        />
        <StatCard
          label="Occupancy Rate"
          value={`${occupancyRate}%`}
          detail={`${filledListings} of ${activeListings} units filled`}
          icon={TrendingUp}
          iconColor="text-green-600"
        />
      </div>

      {/* Transfer Requests Table */}
      <TransferTable initialRequests={requests} />
    </div>
  )
}
