import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/messages/conversations — Create or get a conversation and send the first message
 * Body: { listing_id, recipient_id, message }
 */
export async function POST(request: NextRequest) {
  console.log('[conversations POST] === START ===')
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  console.log('[conversations POST] Auth:', user ? `user=${user.id} (${user.email})` : 'NO USER', authError ? `authError=${authError.message}` : '')

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()
  const { listing_id, recipient_id, message } = body
  console.log('[conversations POST] Body:', JSON.stringify({ listing_id, recipient_id, message: message?.slice(0, 50) }))

  if (!listing_id || !recipient_id || !message?.trim()) {
    console.log('[conversations POST] Validation failed: missing fields')
    return NextResponse.json({ error: 'listing_id, recipient_id, and message are required' }, { status: 400 })
  }

  if (recipient_id === user.id) {
    console.log('[conversations POST] Blocked: user messaging themselves')
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  // Canonical ordering: participant_a < participant_b
  const participant_a = user.id < recipient_id ? user.id : recipient_id
  const participant_b = user.id < recipient_id ? recipient_id : user.id
  console.log('[conversations POST] Participants:', { participant_a, participant_b })

  // Upsert conversation — ON CONFLICT returns existing
  const { data: existingConvo, error: selectError } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listing_id)
    .eq('participant_a', participant_a)
    .eq('participant_b', participant_b)
    .maybeSingle()

  console.log('[conversations POST] Existing convo:', existingConvo, selectError ? `selectError=${selectError.message}` : '')

  let conversationId: string

  if (existingConvo) {
    conversationId = existingConvo.id
    console.log('[conversations POST] Using existing conversation:', conversationId)
  } else {
    const { data: newConvo, error: convoError } = await supabase
      .from('conversations')
      .insert({
        listing_id,
        participant_a,
        participant_b,
        last_message_at: new Date().toISOString(),
        last_message_preview: message.trim().slice(0, 200),
      })
      .select('id')
      .single()

    console.log('[conversations POST] Insert convo result:', newConvo, convoError ? `error=${JSON.stringify(convoError)}` : '')

    if (convoError) {
      console.error('[conversations POST] Insert conversation failed:', convoError)
      // Race condition: conversation was created between our check and insert
      if (convoError.code === '23505') {
        const { data: raceConvo } = await supabase
          .from('conversations')
          .select('id')
          .eq('listing_id', listing_id)
          .eq('participant_a', participant_a)
          .eq('participant_b', participant_b)
          .single()

        if (!raceConvo) {
          return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
        }
        conversationId = raceConvo.id
      } else {
        return NextResponse.json({ error: convoError.message }, { status: 500 })
      }
    } else {
      conversationId = newConvo.id
    }
  }

  console.log('[conversations POST] ConversationId:', conversationId)

  // Insert message
  const { data: msg, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: message.trim(),
    })
    .select('id')
    .single()

  console.log('[conversations POST] Insert msg result:', msg, msgError ? `error=${JSON.stringify(msgError)}` : '')

  if (msgError) {
    console.error('[conversations POST] Insert message failed:', msgError)
    return NextResponse.json({ error: msgError.message }, { status: 500 })
  }

  // Update conversation metadata
  const { error: updateError } = await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: message.trim().slice(0, 200),
    })
    .eq('id', conversationId)

  console.log('[conversations POST] Update convo metadata:', updateError ? `error=${updateError.message}` : 'OK')
  console.log('[conversations POST] === SUCCESS === conversation_id:', conversationId, 'message_id:', msg.id)

  return NextResponse.json({ conversation_id: conversationId, message_id: msg.id }, { status: 201 })
}

/**
 * GET /api/messages/conversations — List all conversations for current user
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Fetch conversations where user is a participant
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id, listing_id, participant_a, participant_b,
      last_message_at, last_message_preview,
      participant_a_last_read_at, participant_b_last_read_at,
      created_at
    `)
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order('last_message_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!conversations || conversations.length === 0) {
    return NextResponse.json({ conversations: [] })
  }

  // Collect other user IDs and listing IDs for batch fetching
  const otherUserIds = new Set<string>()
  const listingIds = new Set<string>()
  for (const c of conversations) {
    const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a
    otherUserIds.add(otherId)
    listingIds.add(c.listing_id)
  }

  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', Array.from(otherUserIds))

  const profileMap: Record<string, string> = {}
  if (profiles) {
    for (const p of profiles) {
      profileMap[p.id] = p.full_name ?? 'Unknown'
    }
  }

  // Fetch listing info (title + first photo)
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, listing_photos(url, display_order, is_primary)')
    .in('id', Array.from(listingIds))

  const listingMap: Record<string, { title: string; photo_url: string | null }> = {}
  if (listings) {
    for (const l of listings as Array<{
      id: string
      title: string | null
      listing_photos: Array<{ url: string; display_order: number; is_primary: boolean }> | null
    }>) {
      const photos = l.listing_photos ?? []
      const primaryPhoto =
        photos.find((p) => p.is_primary)?.url ??
        photos.sort((a, b) => a.display_order - b.display_order)[0]?.url ??
        null
      listingMap[l.id] = { title: l.title ?? 'Listing', photo_url: primaryPhoto }
    }
  }

  // Build response with unread flags
  // Fetch last message sender for each conversation to determine unread
  const convoIds = conversations.map((c) => c.id)
  const { data: lastMessages } = await supabase
    .from('messages')
    .select('conversation_id, sender_id')
    .in('conversation_id', convoIds)
    .order('created_at', { ascending: false })

  // Get the last message sender per conversation
  const lastSenderMap: Record<string, string> = {}
  if (lastMessages) {
    for (const m of lastMessages) {
      if (!lastSenderMap[m.conversation_id]) {
        lastSenderMap[m.conversation_id] = m.sender_id
      }
    }
  }

  const result = conversations.map((c) => {
    const isA = c.participant_a === user.id
    const otherId = isA ? c.participant_b : c.participant_a
    const myLastReadAt = isA ? c.participant_a_last_read_at : c.participant_b_last_read_at
    const lastSender = lastSenderMap[c.id]
    const hasUnread = lastSender !== user.id && c.last_message_at > myLastReadAt

    return {
      id: c.id,
      listing_id: c.listing_id,
      listing_title: listingMap[c.listing_id]?.title ?? 'Listing',
      listing_photo: listingMap[c.listing_id]?.photo_url ?? null,
      other_user_id: otherId,
      other_user_name: profileMap[otherId] ?? 'Unknown',
      last_message_preview: c.last_message_preview,
      last_message_at: c.last_message_at,
      unread: hasUnread,
    }
  })

  return NextResponse.json({ conversations: result })
}
