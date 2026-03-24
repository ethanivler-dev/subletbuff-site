import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  let body: { full_name?: string; phone?: string; company?: string; units?: string; referral_source?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { full_name, phone, company, units, referral_source } = body

  // Validate current role — only students can onboard as landlords
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
  }

  if (profile.role !== 'student') {
    return NextResponse.json({ error: 'Only student accounts can onboard as landlords.' }, { status: 403 })
  }

  // Update profile with landlord role and details
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      role: 'landlord',
      full_name: full_name || null,
      phone: phone || null,
      landlord_details: {
        company: company || null,
        units: units || null,
        referral_source: referral_source || null,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('[landlords/onboard] Update error:', updateError)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
