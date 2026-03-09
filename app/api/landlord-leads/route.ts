import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { key: 'landlord-leads', limit: 3, windowSeconds: 60 })
  if (limited) return limited

  try {
    const body = await request.json()
    const { name, company, email, phone, unit_count, message } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check for duplicate submission within 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('landlord_leads')
      .select('id')
      .eq('email', email)
      .gte('created_at', oneDayAgo)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You've already submitted a request. We'll be in touch soon.",
      })
    }

    const { error } = await supabase
      .from('landlord_leads')
      .insert({ name, company, email, phone, unit_count, message })

    if (error) {
      console.error('[landlord-leads POST]', error)
      return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
