import { CheckCircle, Star, Zap, BookOpen, ShieldCheck } from 'lucide-react'

type BadgeVariant =
  | 'verified'
  | 'lease_verified'
  | 'edu_verified'
  | 'id_verified'
  | 'intern_friendly'
  | 'featured'
  | 'immediate'
  | 'furnished'
  | 'landlord_approved'

const badgeConfig: Record<
  BadgeVariant,
  { label: string; title: string; className: string; Icon?: typeof CheckCircle }
> = {
  verified: {
    label: 'Verified',
    title: 'This listing has been reviewed and verified by SubletBuff',
    className: 'bg-green-100 text-green-800',
    Icon: CheckCircle,
  },
  lease_verified: {
    label: 'Lease Verified',
    title: 'The lister provided a valid lease for this property',
    className: 'bg-green-100 text-green-700',
    Icon: CheckCircle,
  },
  edu_verified: {
    label: 'CU Student',
    title: 'This lister is a verified CU Boulder student',
    className: 'bg-accent-400/20 text-accent-600',
    Icon: BookOpen,
  },
  id_verified: {
    label: 'ID Verified',
    title: 'This lister has verified their identity',
    className: 'bg-accent-400/20 text-accent-600',
    Icon: CheckCircle,
  },
  intern_friendly: {
    label: 'Intern-Friendly',
    title: 'Open to summer interns and short-term renters',
    className: 'bg-purple-100 text-purple-700',
  },
  featured: {
    label: 'Featured',
    title: 'This listing is featured by SubletBuff',
    className: 'bg-accent-400/20 text-accent-600',
    Icon: Star,
  },
  immediate: {
    label: 'Move In Now',
    title: 'This sublet is available for immediate move-in',
    className: 'bg-orange-100 text-orange-700',
    Icon: Zap,
  },
  furnished: {
    label: 'Furnished',
    title: 'This sublet comes furnished',
    className: 'bg-teal-100 text-teal-700',
  },
  landlord_approved: {
    label: 'Landlord Approved',
    title: 'The property landlord has approved this sublet',
    className: 'bg-blue-100 text-blue-700',
    Icon: ShieldCheck,
  },
}

interface BadgeProps {
  variant: BadgeVariant
  className?: string
}

export function Badge({ variant, className = '' }: BadgeProps) {
  const { label, title, className: variantClass, Icon } = badgeConfig[variant]
  return (
    <span
      title={title}
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
