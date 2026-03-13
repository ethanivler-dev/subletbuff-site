import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Fetch eligible listings for price reduction
    const { data: listings, error: fetchError } = await supabase
      .from('listings')
      .select('id, rent_monthly, auto_reduce_amount, auto_reduce_count, auto_reduce_interval_days, auto_reduce_max_times, last_reduced_at, original_rent_monthly')
      .eq('auto_reduce_enabled', true)
      .eq('status', 'approved')
      .eq('filled', false)

    if (fetchError) {
      console.error('[cron/reduce-prices] fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const now = new Date()
    let reducedCount = 0

    for (const listing of listings ?? []) {
      // Skip if already hit max reductions
      if (listing.auto_reduce_count >= listing.auto_reduce_max_times) {
        continue
      }

      // Skip if not enough time has passed since last reduction
      if (listing.last_reduced_at) {
        const lastReduced = new Date(listing.last_reduced_at)
        const daysSince = (now.getTime() - lastReduced.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSince < listing.auto_reduce_interval_days) {
          continue
        }
      }

      const currentRent = listing.rent_monthly as number
      const reduceAmount = listing.auto_reduce_amount as number
      const newRent = Math.max(currentRent - reduceAmount, 100)

      // Don't update if we can't actually reduce (already at or below minimum)
      if (newRent >= currentRent) {
        continue
      }

      const updatePayload: Record<string, unknown> = {
        rent_monthly: newRent,
        auto_reduce_count: (listing.auto_reduce_count ?? 0) + 1,
        last_reduced_at: now.toISOString(),
      }

      // Set original_rent_monthly on first reduction
      if (listing.auto_reduce_count === 0) {
        updatePayload.original_rent_monthly = currentRent
      }

      const { error: updateError } = await supabase
        .from('listings')
        .update(updatePayload)
        .eq('id', listing.id)

      if (updateError) {
        console.error(`[cron/reduce-prices] update error for listing ${listing.id}:`, updateError)
        continue
      }

      reducedCount++
    }

    console.log(`[cron/reduce-prices] reduced ${reducedCount} listing(s)`)
    return NextResponse.json({ reduced: reducedCount })
  } catch (err) {
    console.error('[cron/reduce-prices] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
