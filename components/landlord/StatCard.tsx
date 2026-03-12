import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  detail: string
  icon: LucideIcon
  iconColor?: string
}

export function StatCard({ label, value, detail, icon: Icon, iconColor = 'text-primary-600' }: StatCardProps) {
  return (
    <div className="bg-white rounded-card border border-gray-200 p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{detail}</p>
        </div>
        <div className={['p-2.5 rounded-lg bg-gray-50', iconColor].join(' ')}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-card border border-gray-200 p-5 shadow-card animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-7 w-16 bg-gray-200 rounded mt-2" />
          <div className="h-3 w-32 bg-gray-200 rounded mt-2" />
        </div>
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
      </div>
    </div>
  )
}
