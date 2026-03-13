import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendTransferRequestReceivedEmail, sendTransferRequestSubmittedEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to submit a transfer request.' }, { status: 401 })
  }

  let body: { listing_id?: string; applicant_name?: string; applicant_email?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { listing_id, applicant_name, applicant_email, message } = body

  if (!listing_id || !applicant_name || !applicant_email) {
    return NextResponse.json({ error: 'Missing required fields: listing_id, applicant_name, applicant_email.' }, { status: 400 })
  }

  // Validate listing exists and is active
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, title, lister_id, user_id, status')
    .eq('id', listing_id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  }

  if (listing.status !== 'approved') {
    return NextResponse.json({ error: 'This listing is not currently active.' }, { status: 400 })
  }

  const landlordId = listing.lister_id ?? listing.user_id
  if (!landlordId) {
    return NextResponse.json({ error: 'Could not determine the listing owner.' }, { status: 500 })
  }

  // Look up landlord profile for email notification
  const { data: landlordProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', landlordId)
    .single()

  const landlordEmail = landlordProfile?.email ?? null
  const landlordName = landlordProfile?.full_name ?? 'Landlord'
  const listingTitle = listing.title ?? 'your listing'

  // Insert transfer request — always force pending status
  const { data: inserted, error: insertError } = await supabase
    .from('transfer_requests')
    .insert({
      listing_id,
      landlord_id: landlordId,
      applicant_name,
      applicant_email,
      unit: typeof message === 'string' ? message.slice(0, 500) : null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error('[transfer-requests] Insert error:', insertError)
    return NextResponse.json({ error: 'Failed to submit transfer request.' }, { status: 500 })
  }

  // Send emails (non-blocking — don't fail the request if email fails)
  if (landlordEmail) {
    sendTransferRequestReceivedEmail(landlordEmail, landlordName, applicant_name, listingTitle, inserted.id).catch((err) =>
      console.error('[transfer-requests] Failed to send landlord email:', err)
    )
  }

  sendTransferRequestSubmittedEmail(applicant_email, applicant_name, listingTitle).catch((err) =>
    console.error('[transfer-requests] Failed to send applicant confirmation email:', err)
  )

  return NextResponse.json({ success: true, requestId: inserted.id })
}
