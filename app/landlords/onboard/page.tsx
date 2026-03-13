import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/landlord/OnboardingForm'

export default async function LandlordOnboardPage() {
  if (process.env.NEXT_PUBLIC_LANDLORD_PORTAL !== 'true') {
    redirect('/')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, phone')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'landlord') {
    redirect('/landlords/portal')
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Set up your Landlord Portal
        </h1>
        <p className="text-gray-600 mb-8">
          SubletBuff helps you manage lease transfer requests from verified students.
        </p>
        <OnboardingForm
          defaultFullName={profile?.full_name || ''}
          defaultPhone={profile?.phone || ''}
        />
      </div>
    </div>
  )
}
