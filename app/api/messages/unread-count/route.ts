import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/messages/unread-count — Unread conversation count for navbar badge
 * Returns { count: 0 } for logged-out users (no 401) to avoid console spam.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ count: 0 })
  }

  // Fetch all conversations for this user
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id, participant_a, participant_b,
      last_message_at,
      participant_a_last_read_at, participant_b_last_read_at
    `)
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)

  if (error || !conversations) {
    return NextResponse.json({ count: 0 })
  }

  // Get the last message sender per conversation to avoid counting own messages as unread
  const convoIds = conversations.map((c) => c.id)
  if (convoIds.length === 0) {
    return NextResponse.json({ count: 0 })
  }

  const { data: lastMessages } = await supabase
    .from('messages')
    .select('conversation_id, sender_id')
    .in('conversation_id', convoIds)
    .order('created_at', { ascending: false })

  const lastSenderMap: Record<string, string> = {}
  if (lastMessages) {
    for (const m of lastMessages) {
      if (!lastSenderMap[m.conversation_id]) {
        lastSenderMap[m.conversation_id] = m.sender_id
      }
    }
  }

  let count = 0
  for (const c of conversations) {
    const isA = c.participant_a === user.id
    const myLastReadAt = isA ? c.participant_a_last_read_at : c.participant_b_last_read_at
    const lastSender = lastSenderMap[c.id]

    // Unread = last message is from the other person AND after our last read
    if (lastSender && lastSender !== user.id && c.last_message_at > myLastReadAt) {
      count++
    }
  }

  return NextResponse.json({ count })
}
