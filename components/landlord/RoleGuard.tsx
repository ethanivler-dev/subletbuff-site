import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function RoleGuard({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'landlord') {
    redirect('/landlords/onboard')
  }

  return <>{children}</>
}
