import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/messages/conversations/[id] — Get conversation + messages, mark as read
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Fetch conversation (RLS enforces access)
  const { data: conversation, error: convoError } = await supabase
    .from('conversations')
    .select(`
      id, listing_id, participant_a, participant_b,
      last_message_at, created_at
    `)
    .eq('id', id)
    .single()

  if (convoError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Verify user is a participant (redundant with RLS but gives better error)
  const isA = conversation.participant_a === user.id
  const isB = conversation.participant_b === user.id
  if (!isA && !isB) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Mark as read — update the correct participant's last_read_at
  const readUpdate = isA
    ? { participant_a_last_read_at: new Date().toISOString() }
    : { participant_b_last_read_at: new Date().toISOString() }

  await supabase
    .from('conversations')
    .update(readUpdate)
    .eq('id', id)

  // Fetch messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 })
  }

  // Fetch other user's profile
  const otherId = isA ? conversation.participant_b : conversation.participant_a
  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', otherId)
    .single()

  // Fetch listing info
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title')
    .eq('id', conversation.listing_id)
    .single()

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      listing_id: conversation.listing_id,
      listing_title: listing?.title ?? 'Listing',
      other_user_id: otherId,
      other_user_name: otherProfile?.full_name ?? 'Unknown',
    },
    messages: messages ?? [],
  })
}

/**
 * POST /api/messages/conversations/[id] — Send a message in an existing conversation
 * Body: { message }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()
  const { message } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Verify conversation exists and user is a participant (RLS also checks)
  const { data: conversation, error: convoError } = await supabase
    .from('conversations')
    .select('id, participant_a, participant_b')
    .eq('id', id)
    .single()

  if (convoError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  if (conversation.participant_a !== user.id && conversation.participant_b !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Insert message
  const { data: msg, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: id,
      sender_id: user.id,
      body: message.trim(),
    })
    .select('id, sender_id, body, created_at')
    .single()

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 })
  }

  // Update conversation metadata
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: message.trim().slice(0, 200),
    })
    .eq('id', id)

  return NextResponse.json({ message: msg }, { status: 201 })
}
