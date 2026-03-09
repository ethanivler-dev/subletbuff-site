import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminServer } from '@/lib/admin'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const admin = await isAdminServer(supabase, user.id)
  if (!admin) redirect('/')

  return (
    <div className="min-h-screen bg-gray-50 pt-16 flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
