import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
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

  // Fetch listing info with photos
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, room_type, neighborhood, listing_photos(url, display_order, is_primary)')
    .eq('id', conversation.listing_id)
    .single()

  const listingTitle = sanitizeListingTitle(
    listing?.title ?? null,
    listing?.room_type ?? '',
    listing?.neighborhood ?? ''
  )

  // Build sorted photos array
  const rawPhotos = (listing?.listing_photos as Array<{ url: string; display_order: number; is_primary: boolean }> | null) ?? []
  const sortedPhotos = [...rawPhotos].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return a.display_order - b.display_order
  })
  // Show up to 4 thumbnails
  const thumbnailPhotos = sortedPhotos.slice(0, 4)

  return (
    <div className="min-h-screen bg-gray-50 pt-16 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/messages"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Listing thumbnails */}
          {thumbnailPhotos.length > 0 && (
            <Link
              href={`/listings/${conversation.listing_id}`}
              className="flex -space-x-1 flex-shrink-0"
            >
              {thumbnailPhotos.map((photo, i) => (
                <div
                  key={i}
                  className="relative w-9 h-9 rounded-md overflow-hidden border-2 border-white shadow-sm flex-shrink-0"
                >
                  <Image
                    src={photo.url}
                    alt={i === 0 ? (listingTitle ?? 'Listing photo') : ''}
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                </div>
              ))}
              {sortedPhotos.length > 4 && (
                <div className="relative w-9 h-9 rounded-md overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-gray-100 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-gray-500">+{sortedPhotos.length - 4}</span>
                </div>
              )}
            </Link>
          )}

          <div className="min-w-0">
            <Link
              href={`/listings/${conversation.listing_id}`}
              className="text-sm font-semibold text-gray-900 hover:text-primary-700 truncate block transition-colors"
            >
              {listingTitle}
            </Link>
          </div>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col" style={{ minHeight: 'calc(100vh - 8rem)' }}>
        <MessageInput
          conversationId={id}
          currentUserId={user.id}
          initialMessages={messages ?? []}
        />
      </div>
    </div>
  )
}
