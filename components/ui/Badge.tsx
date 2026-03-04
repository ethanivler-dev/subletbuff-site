import { CheckCircle, Star, Zap, BookOpen } from 'lucide-react'

type BadgeVariant =
  | 'verified'
  | 'lease_verified'
  | 'edu_verified'
  | 'id_verified'
  | 'intern_friendly'
  | 'featured'
  | 'immediate'
  | 'furnished'

const badgeConfig: Record<
  BadgeVariant,
  { label: string; className: string; Icon?: typeof CheckCircle }
> = {
  verified: {
    label: 'Verified',
    className: 'bg-blue-100 text-blue-700',
  },
  lease_verified: {
    label: 'Lease Verified',
    className: 'bg-green-100 text-green-700',
    Icon: CheckCircle,
  },
  edu_verified: {
    label: 'CU Student',
    className: 'bg-accent-400/20 text-accent-600',
    Icon: BookOpen,
  },
  id_verified: {
    label: 'ID Verified',
    className: 'bg-accent-400/20 text-accent-600',
    Icon: CheckCircle,
  },
  intern_friendly: {
    label: 'Intern-Friendly',
    className: 'bg-purple-100 text-purple-700',
  },
  featured: {
    label: 'Featured',
    className: 'bg-accent-400/20 text-accent-600',
    Icon: Star,
  },
  immediate: {
    label: 'Move In Now',
    className: 'bg-orange-100 text-orange-700',
    Icon: Zap,
  },
  furnished: {
    label: 'Furnished',
    className: 'bg-teal-100 text-teal-700',
  },
}

interface BadgeProps {
  variant: BadgeVariant
  className?: string
}

export function Badge({ variant, className = '' }: BadgeProps) {
  const { label, className: variantClass, Icon } = badgeConfig[variant]
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-badge',
        variantClass,
        className,
      ].join(' ')}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  )
}
