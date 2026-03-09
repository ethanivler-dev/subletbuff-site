import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get landlord profile
  const { data: profile } = await supabase
    .from('landlord_profiles')
    .select('id, company_name, plan_tier')
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Not a landlord' }, { status: 403 })

  // Aggregate stats
  const [propsRes, pendingRes, approvedRes] = await Promise.all([
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('landlord_id', profile.id),
    supabase
      .from('sublet_requests')
      .select('id', { count: 'exact', head: true })
      .eq('landlord_id', profile.id)
      .eq('status', 'pending'),
    supabase
      .from('sublet_requests')
      .select('id', { count: 'exact', head: true })
      .eq('landlord_id', profile.id)
      .eq('status', 'approved'),
  ])

  return NextResponse.json({
    company_name: profile.company_name,
    plan_tier: profile.plan_tier,
    total_properties: propsRes.count ?? 0,
    pending_requests: pendingRes.count ?? 0,
    approved_requests: approvedRes.count ?? 0,
  })
}
