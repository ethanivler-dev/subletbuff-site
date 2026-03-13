import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendTransferRequestApprovedEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch the transfer request and verify landlord ownership
  const { data: transferRequest, error: fetchError } = await supabase
    .from('transfer_requests')
    .select('id, landlord_id, applicant_name, applicant_email, listing_id')
    .eq('id', id)
    .single()

  if (fetchError || !transferRequest) {
    return NextResponse.json({ error: 'Transfer request not found.' }, { status: 404 })
  }

  if (transferRequest.landlord_id !== user.id) {
    return NextResponse.json({ error: 'You are not authorized to approve this request.' }, { status: 403 })
  }

  // Update status
  const { error: updateError } = await supabase
    .from('transfer_requests')
    .update({ status: 'approved' })
    .eq('id', id)
    .eq('landlord_id', user.id)

  if (updateError) {
    console.error('[transfer-requests/approve] Update error:', updateError)
    return NextResponse.json({ error: 'Failed to approve request.' }, { status: 500 })
  }

  // Get listing title for the email
  const { data: listing } = await supabase
    .from('listings')
    .select('title')
    .eq('id', transferRequest.listing_id)
    .single()

  const listingTitle = listing?.title ?? 'your listing'

  // Send approval email
  sendTransferRequestApprovedEmail(
    transferRequest.applicant_email,
    transferRequest.applicant_name,
    listingTitle
  ).catch((err) => console.error('[transfer-requests/approve] Email error:', err))

  return NextResponse.json({ success: true })
}
