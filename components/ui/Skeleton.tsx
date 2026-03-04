interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={['animate-pulse bg-gray-200 rounded', className].join(' ')}
      aria-hidden="true"
    />
  )
}

export function ListingCardSkeleton({ variant = 'vertical' }: { variant?: 'vertical' | 'horizontal' }) {
  if (variant === 'horizontal') {
    return (
      <div className="flex gap-4 p-4 rounded-card border border-gray-100 bg-white">
        <Skeleton className="w-40 h-32 flex-shrink-0 rounded-card" />
        <div className="flex-1 flex flex-col gap-2 py-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3 mt-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-gray-100 bg-white overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 flex flex-col gap-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 mt-1">
          <Skeleton className="h-5 w-16 rounded-badge" />
          <Skeleton className="h-5 w-20 rounded-badge" />
        </div>
      </div>
    </div>
  )
}
