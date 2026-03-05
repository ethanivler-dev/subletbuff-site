import Image from 'next/image'
import { CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface ListerProfileProps {
  name: string
  avatarUrl?: string
  verificationLevel?: string
  memberSince?: string
}

export function ListerProfile({ name, avatarUrl, verificationLevel, memberSince }: ListerProfileProps) {
  const displayName = name || 'SubletBuff Member'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="rounded-card border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-primary-100 flex-shrink-0">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="56px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary-600 font-semibold text-lg">
              {initials}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {displayName}
          </h3>
          {verificationLevel && verificationLevel !== 'basic' && (
            <Badge
              variant={verificationLevel as 'lease_verified' | 'edu_verified' | 'id_verified' | 'verified'}
              className="mt-1"
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm text-gray-500">
        {memberSince && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Member since {new Date(memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-success" />
          <span>Identity confirmed</span>
        </div>
      </div>
    </div>
  )
}
