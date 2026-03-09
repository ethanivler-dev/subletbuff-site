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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getLandlordProfile(supabase, user.id)
  if (!profile) return NextResponse.json({ error: 'Not a landlord' }, { status: 403 })

  const body = await request.json()
  const allowed = ['address', 'neighborhood', 'unit_count', 'rules_text', 'subletting_allowed']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id)
    .eq('landlord_id', profile.id)
    .select()
    .single()

  if (error) {
    console.error('[landlord properties PATCH]', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getLandlordProfile(supabase, user.id)
  if (!profile) return NextResponse.json({ error: 'Not a landlord' }, { status: 403 })

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)
    .eq('landlord_id', profile.id)

  if (error) {
    console.error('[landlord properties DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
