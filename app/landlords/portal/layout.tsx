import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/landlord/Sidebar'

export default function LandlordPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (process.env.NEXT_PUBLIC_LANDLORD_PORTAL !== 'true') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
