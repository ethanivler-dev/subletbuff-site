import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Not a landlord' }, { status: 403 })

  // Get request to verify ownership and get listing_id
  const { data: req } = await supabase
    .from('sublet_requests')
    .select('id, listing_id, landlord_id')
    .eq('id', id)
    .eq('landlord_id', profile.id)
    .single()

  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  // Update request status
  const { error: updateErr } = await supabase
    .from('sublet_requests')
    .update({ status: 'approved', decided_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) {
    console.error('[approve request]', updateErr)
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
  }

  // Set landlord_approved on the listing
  if (req.listing_id) {
    await supabase
      .from('listings')
      .update({ landlord_approved: true })
      .eq('id', req.listing_id)
  }

  return NextResponse.json({ success: true })
}
