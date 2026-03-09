import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminServer } from '@/lib/admin'
import { sendAdminContactEmail } from '@/lib/email'

/**
 * POST /api/admin/contact-lister
 * Send an email to a lister about their listing. Admin auth required.
 * Body: { listing_id, reason, message }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !(await isAdminServer(supabase, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { listing_id, reason, message } = body

  if (!listing_id || !message) {
    return NextResponse.json({ error: 'listing_id and message are required' }, { status: 400 })
  }

  // Fetch listing + lister info
  const { data: listing } = await supabase
    .from('listings')
    .select('title, email, first_name, lister_id, user_id')
    .eq('id', listing_id)
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  // Get lister email from listing or profiles
  let email = listing.email
  let name = listing.first_name || 'there'

  if (!email) {
    const listerId = listing.lister_id ?? listing.user_id
    if (listerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', listerId)
        .single()
      if (profile) {
        email = profile.email
        name = profile.full_name?.split(' ')[0] || name
      }
    }
  }

  if (!email) {
    return NextResponse.json({ error: 'No email found for lister' }, { status: 400 })
  }

  await sendAdminContactEmail(email, name, listing.title || 'your listing', listing_id, reason || 'custom', message)

  return NextResponse.json({ success: true })
}
