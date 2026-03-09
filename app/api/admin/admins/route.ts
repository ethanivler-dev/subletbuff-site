import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminServer } from '@/lib/admin'

/**
 * GET /api/admin/admins — list all admins
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !(await isAdminServer(supabase, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: admins, error } = await supabase
    .from('admins')
    .select('id, email, added_by, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch names for admins and added_by
  const allIds = Array.from(new Set([
    ...(admins ?? []).map((a) => a.id),
    ...(admins ?? []).map((a) => a.added_by).filter(Boolean),
  ])) as string[]

  let names: Record<string, string> = {}
  if (allIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', allIds)
    if (profiles) {
      for (const p of profiles) {
        if (p.full_name) names[p.id] = p.full_name
      }
    }
  }

  return NextResponse.json({ admins: admins ?? [], names })
}

/**
 * POST /api/admin/admins — add a new admin by email
 * Body: { email }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !(await isAdminServer(supabase, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const email = body.email?.trim()?.toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Look up user by email in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'No user found with that email. They must have a SubletBuff account first.' }, { status: 404 })
  }

  // Check if already admin
  const { data: existing } = await supabase
    .from('admins')
    .select('id')
    .eq('id', profile.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'This user is already an admin' }, { status: 409 })
  }

  const { error } = await supabase
    .from('admins')
    .insert({ id: profile.id, email: profile.email, added_by: user.id })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, admin: { id: profile.id, email: profile.email } })
}
