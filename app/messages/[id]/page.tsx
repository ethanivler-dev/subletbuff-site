import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MessageInput } from '@/components/messages/MessageInput'
import { sanitizeListingTitle } from '@/lib/utils'

export const revalidate = 0 // Always fresh

interface ConversationPageProps {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=/messages/${id}`)
  }

  // Fetch conversation
  const { data: conversation, error: convoError } = await supabase
    .from('conversations')
    .select('id, listing_id, participant_a, participant_b')
    .eq('id', id)
    .single()

  if (convoError || !conversation) {
    notFound()
  }

  const isA = conversation.participant_a === user.id
  const isB = conversation.participant_b === user.id
  if (!isA && !isB) {
    notFound()
  }

  // Mark as read
  const readUpdate = isA
    ? { participant_a_last_read_at: new Date().toISOString() }
    : { participant_b_last_read_at: new Date().toISOString() }

  await supabase
    .from('conversations')
    .update(readUpdate)
    .eq('id', id)

  // Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  // Fetch listing info with photos and price
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, room_type, neighborhood, rent_monthly, photo_urls, listing_photos(url, display_order, is_primary)')
    .eq('id', conversation.listing_id)
    .single()

  const listingTitle = sanitizeListingTitle(
    listing?.title ?? null,
    listing?.room_type ?? '',
    listing?.neighborhood ?? ''
  )

  const listingPrice = (listing?.rent_monthly as number | null) ?? null

  // Extract cover photo (is_primary first, then lowest display_order)
  const rawPhotos = (listing?.listing_photos as Array<{ url: string; display_order: number; is_primary: boolean }> | null) ?? []
  const sortedPhotos = [...rawPhotos].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return a.display_order - b.display_order
  })
  const legacyPhotos = listing?.photo_urls as string[] | null
  const coverPhotoUrl = sortedPhotos[0]?.url
    ?? (Array.isArray(legacyPhotos) ? legacyPhotos[0] : null)
    ?? null

  // Fetch both participants' profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', [conversation.participant_a, conversation.participant_b])

  const participants: Record<string, string> = {}
  if (profiles) {
    for (const p of profiles) {
      const name = p.full_name?.trim()
      participants[p.id] = name || (p.email ? p.email.split('@')[0] : 'User')
    }
  }

  const otherId = isA ? conversation.participant_b : conversation.participant_a
  const otherName = participants[otherId] ?? 'User'

  // Format price for display
  const formattedPrice = listingPrice
    ? `$${listingPrice.toLocaleString()}/mo`
    : null

  return (
    <div className="min-h-screen bg-gray-50 pt-16 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 sm:px-6 py-3">
          {/* Back button */}
          <Link
            href="/messages"
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
            aria-label="Back to messages"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Cover photo thumbnail */}
          <Link
            href={`/listings/${conversation.listing_id}`}
            className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 ring-1 ring-gray-200/60 hover:ring-primary-300 transition-all"
          >
            {coverPhotoUrl ? (
              <Image
                src={coverPhotoUrl}
                alt={listingTitle ?? 'Listing photo'}
                fill
                className="object-cover"
                sizes="44px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home className="w-5 h-5 text-gray-300" />
              </div>
            )}
          </Link>

          {/* Title + subtitle */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {listingTitle}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {otherName}{formattedPrice ? ` \u00b7 ${formattedPrice}` : ''}
            </p>
          </div>

          {/* View listing button */}
          <Link
            href={`/listings/${conversation.listing_id}`}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors whitespace-nowrap flex-shrink-0 border border-primary-200 rounded-button px-3 py-1.5 hover:bg-primary-50"
          >
            View listing <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col" style={{ minHeight: 'calc(100vh - 8rem)' }}>
        <MessageInput
          conversationId={id}
          currentUserId={user.id}
          initialMessages={messages ?? []}
          participants={participants}
          otherUserName={otherName}
        />
      </div>
    </div>
  )
}
