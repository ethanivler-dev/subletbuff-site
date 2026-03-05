import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/admin/review — approve or reject a listing
 * Admin auth required (checked via admins table).
 * Body: { listing_id, action: 'approve' | 'reject', rejection_reason? }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Check admin status via admins table
  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!adminRow) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()

  if (!body.listing_id || !body.action) {
    return NextResponse.json({ error: 'listing_id and action are required' }, { status: 400 })
  }

  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
  }

  if (body.action === 'approve') {
    const { error } = await supabase
      .from('listings')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', body.listing_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    // Reject — include rejection_reason if the column exists
    const updateData: Record<string, unknown> = {
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }
    if (body.rejection_reason) {
      updateData.rejection_reason = body.rejection_reason
    }

    const { error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', body.listing_id)

    if (error) {
      // If rejection_reason column doesn't exist, retry without it
      if (error.message.includes('rejection_reason')) {
        const { error: retryError } = await supabase
          .from('listings')
          .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
          .eq('id', body.listing_id)
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ success: true, action: body.action, listing_id: body.listing_id })
}
