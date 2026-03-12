import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LandlordSettingsPage() {
  if (process.env.NEXT_PUBLIC_LANDLORD_PORTAL !== 'true') {
    redirect('/')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and notification preferences</p>
      </div>

      {/* Profile info */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Account Information</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Display Name</label>
            <p className="text-sm text-gray-900">{user.user_metadata?.full_name || user.user_metadata?.name || '—'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <p className="text-sm text-gray-900">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Notification preferences (UI only) */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Notification Preferences</h3>
        </div>
        <div className="p-5 space-y-4">
          <NotifToggle
            label="New transfer requests"
            description="Get notified when a tenant submits a transfer request"
            defaultChecked
          />
          <NotifToggle
            label="Request status updates"
            description="Get notified when a transfer request status changes"
            defaultChecked
          />
          <NotifToggle
            label="Listing activity"
            description="Weekly summary of views and inquiries on your listings"
            defaultChecked={false}
          />
        </div>
      </div>
    </div>
  )
}

function NotifToggle({
  label,
  description,
  defaultChecked = false,
}: {
  label: string
  description: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          className="sr-only peer"
          disabled
        />
        <div className="w-9 h-5 bg-gray-200 peer-checked:bg-primary-600 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4 after:shadow-sm" />
      </label>
    </div>
  )
}
