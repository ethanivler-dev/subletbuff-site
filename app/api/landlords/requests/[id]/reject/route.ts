import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
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

  const body = await request.json().catch(() => ({}))
  const notes = body.notes || null

  const { error } = await supabase
    .from('sublet_requests')
    .update({
      status: 'rejected',
      decision_notes: notes,
      decided_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('landlord_id', profile.id)

  if (error) {
    console.error('[reject request]', error)
    return NextResponse.json({ error: 'Failed to reject' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
