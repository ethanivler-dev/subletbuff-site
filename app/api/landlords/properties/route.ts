import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getLandlordProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()
  return data
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getLandlordProfile(supabase, user.id)
  if (!profile) return NextResponse.json({ error: 'Not a landlord' }, { status: 403 })

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('landlord_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[landlord properties GET]', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getLandlordProfile(supabase, user.id)
  if (!profile) return NextResponse.json({ error: 'Not a landlord' }, { status: 403 })

  const body = await request.json()
  const { address, neighborhood, unit_count, rules_text, subletting_allowed } = body

  if (!address) return NextResponse.json({ error: 'Address is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('properties')
    .insert({
      landlord_id: profile.id,
      address,
      neighborhood: neighborhood || null,
      unit_count: unit_count || 1,
      rules_text: rules_text || null,
      subletting_allowed: subletting_allowed !== false,
    })
    .select()
    .single()

  if (error) {
    console.error('[landlord properties POST]', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }

  return NextResponse.json(data)
}
