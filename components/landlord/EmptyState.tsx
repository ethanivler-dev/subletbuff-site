import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
}

export function EmptyState({
  title = 'No transfer requests yet',
  description = 'When tenants submit transfer requests for your listings, they will appear here.',
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-card border border-gray-200 p-12 text-center shadow-card">
      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Inbox className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>
    </div>
  )
}
