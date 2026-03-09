import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Not a landlord' }, { status: 403 })

  const status = request.nextUrl.searchParams.get('status')

  let query = supabase
    .from('sublet_requests')
    .select(`
      id, status, decision_notes, requested_at, decided_at,
      listings (id, title, room_type, neighborhood, rent_monthly, available_from, available_to,
        listing_photos (url, display_order, is_primary)
      ),
      properties (id, address),
      subtenant:auth_users_view (email)
    `)
    .eq('landlord_id', profile.id)
    .order('requested_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    console.error('[landlord requests GET]', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
