import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the agreement for this request
  const { data: agreement } = await supabase
    .from('sublease_agreements')
    .select('document_url, sublet_request_id')
    .eq('sublet_request_id', (await params).id)
    .maybeSingle()

  if (!agreement) {
    return NextResponse.json({ error: 'No agreement found' }, { status: 404 })
  }

  // Verify user is involved (landlord, tenant, or subtenant)
  const { data: req } = await supabase
    .from('sublet_requests')
    .select(`
      landlord_id, subtenant_user_id,
      listings (user_id, lister_id),
      landlord_profiles:landlord_id (user_id)
    `)
    .eq('id', agreement.sublet_request_id)
    .single()

  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  const listing = Array.isArray(req.listings) ? req.listings[0] : req.listings
  const landlordProf = Array.isArray(req.landlord_profiles) ? req.landlord_profiles[0] : req.landlord_profiles

  const isLandlord = landlordProf?.user_id === user.id
  const isSubtenant = req.subtenant_user_id === user.id
  const isTenant = listing?.user_id === user.id || listing?.lister_id === user.id

  if (!isLandlord && !isSubtenant && !isTenant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ url: agreement.document_url })
}
