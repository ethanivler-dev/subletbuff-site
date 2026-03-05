import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/inquiries — send an inquiry from renter to lister
 * Auth required. Body: listing_id, message, move_in_date?, move_out_date?
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.listing_id || !body.message?.trim()) {
    return NextResponse.json({ error: 'listing_id and message are required' }, { status: 400 })
  }

  if (!body.lister_id) {
    return NextResponse.json({ error: 'lister_id is required' }, { status: 400 })
  }

  // Prevent sending inquiry to yourself
  if (body.lister_id === user.id) {
    return NextResponse.json({ error: 'Cannot send inquiry to yourself' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      listing_id: body.listing_id,
      renter_id: user.id,
      lister_id: body.lister_id,
      message: body.message.trim(),
      move_in_date: body.move_in_date || null,
      move_out_date: body.move_out_date || null,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Increment inquiry_count on the listing
  await supabase.rpc('increment_counter', {
    row_id: body.listing_id,
    column_name: 'inquiry_count',
  }).then(() => {}, () => {
    // If the RPC doesn't exist, silently ignore
  })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
