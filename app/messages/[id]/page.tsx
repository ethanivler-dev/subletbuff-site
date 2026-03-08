import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MessageInput } from '@/components/messages/MessageInput'

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

  // Fetch other user's profile
  const otherId = isA ? conversation.participant_b : conversation.participant_a
  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', otherId)
    .single()

  // Fetch listing info
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title')
    .eq('id', conversation.listing_id)
    .single()

  const otherName = otherProfile?.full_name ?? 'Unknown'
  const listingTitle = listing?.title ?? 'Listing'

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
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate">{otherName}</h1>
            <Link
              href={`/listings/${conversation.listing_id}`}
              className="text-xs text-primary-600 hover:text-primary-700 truncate block"
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
