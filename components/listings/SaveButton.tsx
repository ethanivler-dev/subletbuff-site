'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SaveButtonProps {
  listingId: string
  initialSaved: boolean
  saveCount: number
  /** card-vertical: absolute-positioned overlay on photo
   *  card-horizontal: inline next to price
   *  gallery: pill button for the detail page gallery */
  variant?: 'card-vertical' | 'card-horizontal' | 'gallery'
}

export function SaveButton({
  listingId,
  initialSaved,
  saveCount,
  variant = 'card-vertical',
}: SaveButtonProps) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [count, setCount] = useState(saveCount)
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return

    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/auth/login?next=/listings/${listingId}`)
      setLoading(false)
      return
    }

    const newSaved = !saved
    // Optimistic update
    setSaved(newSaved)
    setCount((c) => (newSaved ? c + 1 : Math.max(0, c - 1)))

    try {
      if (newSaved) {
        const { error } = await supabase
          .from('saved_listings')
          .insert({ user_id: user.id, listing_id: listingId })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('saved_listings')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId)
        if (error) throw error
      }
    } catch {
      // Revert on failure
      setSaved(!newSaved)
      setCount((c) => (!newSaved ? c + 1 : Math.max(0, c - 1)))
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'gallery') {
    return (
      <button
        onClick={toggle}
        className={[
          'flex items-center gap-1.5 px-3 py-2 rounded-full',
          'bg-white/90 backdrop-blur-sm shadow transition-colors',
          saved ? 'text-red-500' : 'text-gray-600 hover:text-red-500',
        ].join(' ')}
        aria-label={saved ? 'Remove from saved' : 'Save listing'}
      >
        <Heart className={`w-4 h-4 ${saved ? 'fill-red-500' : ''}`} />
        {count > 0 && (
          <span className="text-xs font-medium tabular-nums">{count}</span>
        )}
      </button>
    )
  }

  if (variant === 'card-horizontal') {
    return (
      <button
        onClick={toggle}
        className={[
          'flex items-center gap-1 p-2.5 -m-1.5 flex-shrink-0 transition-colors',
          saved ? 'text-red-500' : 'text-gray-400 hover:text-red-500',
        ].join(' ')}
        aria-label={saved ? 'Remove from saved' : 'Save listing'}
      >
        <Heart className={`w-5 h-5 ${saved ? 'fill-red-500' : ''}`} />
        {count > 0 && (
          <span className="text-xs text-gray-500 tabular-nums">{count}</span>
        )}
      </button>
    )
  }

  // card-vertical — absolute-positioned over the photo
  return (
    <button
      onClick={toggle}
      className={[
        'absolute top-1 right-1 flex items-center gap-1 px-2.5 py-2',
        'rounded-full bg-white/80 backdrop-blur-sm shadow transition-colors',
        saved ? 'text-red-500' : 'text-gray-500 hover:text-red-500',
      ].join(' ')}
      aria-label={saved ? 'Remove from saved' : 'Save listing'}
    >
      <Heart className={`w-4 h-4 ${saved ? 'fill-red-500' : ''}`} />
      {count > 0 && (
        <span className="text-xs font-medium tabular-nums">{count}</span>
      )}
    </button>
  )
}
