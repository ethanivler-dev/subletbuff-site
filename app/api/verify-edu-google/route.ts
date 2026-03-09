import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

/** POST — Verify a Google access token and grant edu_verified badge if @colorado.edu */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { key: 'verify-edu-google', limit: 5, windowSeconds: 300 })
  if (limited) return limited

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { access_token } = await request.json()
  if (!access_token || typeof access_token !== 'string') {
    return NextResponse.json({ error: 'Google access token is required' }, { status: 400 })
  }

  // Verify the access token by calling Google's userinfo endpoint server-side
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!userInfoRes.ok) {
    return NextResponse.json({ error: 'Invalid Google credential' }, { status: 400 })
  }

  const userInfo = await userInfoRes.json()
  const email = userInfo.email?.toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'Could not read email from Google account' }, { status: 400 })
  }

  if (!email.endsWith('@colorado.edu')) {
    return NextResponse.json(
      { error: 'Please use your @colorado.edu Google account. The account you selected is not a CU email.' },
      { status: 400 }
    )
  }

  // Grant the badge
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      edu_email: email,
      verification_level: 'edu_verified',
      edu_verification_code: null,
      edu_verification_expires: null,
    })
    .eq('id', user.id)

  if (updateErr) {
    console.error('[verify-edu-google]', updateErr)
    return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 })
  }

  return NextResponse.json({ success: true, email, verification_level: 'edu_verified' })
}
