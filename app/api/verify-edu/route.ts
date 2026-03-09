import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { sendEduVerificationEmail } from '@/lib/email'
import crypto from 'crypto'

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

/** POST — Send a verification code to a .edu email */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { key: 'verify-edu', limit: 3, windowSeconds: 300 })
  if (limited) return limited

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await request.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const normalized = email.trim().toLowerCase()
  if (!normalized.endsWith('@colorado.edu')) {
    return NextResponse.json({ error: 'Must be a @colorado.edu email address' }, { status: 400 })
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  // Store hashed code in profile
  const { error } = await supabase
    .from('profiles')
    .update({
      edu_verification_code: hashCode(code),
      edu_verification_expires: expires,
    })
    .eq('id', user.id)

  if (error) {
    console.error('[verify-edu POST]', error)
    return NextResponse.json({ error: 'Failed to save verification code' }, { status: 500 })
  }

  // Send email
  await sendEduVerificationEmail(normalized, code)

  return NextResponse.json({ success: true })
}

/** PUT — Verify the code and grant edu_verified badge */
export async function PUT(request: NextRequest) {
  const limited = rateLimit(request, { key: 'verify-edu-check', limit: 10, windowSeconds: 300 })
  if (limited) return limited

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code, email } = await request.json()
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Fetch stored hash and expiry
  const { data: profile, error: fetchErr } = await supabase
    .from('profiles')
    .select('edu_verification_code, edu_verification_expires')
    .eq('id', user.id)
    .single()

  if (fetchErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!profile.edu_verification_code || !profile.edu_verification_expires) {
    return NextResponse.json({ error: 'No verification code pending. Please request a new code.' }, { status: 400 })
  }

  // Check expiry
  if (new Date(profile.edu_verification_expires) < new Date()) {
    return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 })
  }

  // Compare hashes
  if (hashCode(code.trim()) !== profile.edu_verification_code) {
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
  }

  // Success — update profile
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      edu_email: email.trim().toLowerCase(),
      verification_level: 'edu_verified',
      edu_verification_code: null,
      edu_verification_expires: null,
    })
    .eq('id', user.id)

  if (updateErr) {
    console.error('[verify-edu PUT]', updateErr)
    return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 })
  }

  return NextResponse.json({ success: true, verification_level: 'edu_verified' })
}
