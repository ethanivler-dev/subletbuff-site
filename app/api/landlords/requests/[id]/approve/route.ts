import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSubleasePdf } from '@/lib/generate-sublease-pdf'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: landlordProfile } = await supabase
    .from('landlord_profiles')
    .select('id, company_name')
    .eq('user_id', user.id)
    .single()
  if (!landlordProfile) return NextResponse.json({ error: 'Not a landlord' }, { status: 403 })

  // Get request with related data
  const { data: req } = await supabase
    .from('sublet_requests')
    .select(`
      id, listing_id, landlord_id, subtenant_user_id,
      properties (address, rules_text),
      listings (title, rent_monthly, available_from, available_to, deposit, security_deposit, user_id, lister_id)
    `)
    .eq('id', id)
    .eq('landlord_id', landlordProfile.id)
    .single()

  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  // Update request status
  const { error: updateErr } = await supabase
    .from('sublet_requests')
    .update({ status: 'approved', decided_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) {
    console.error('[approve request]', updateErr)
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
  }

  // Set landlord_approved on the listing
  if (req.listing_id) {
    await supabase
      .from('listings')
      .update({ landlord_approved: true })
      .eq('id', req.listing_id)
  }

  // Generate sublease PDF
  try {
    const listing = Array.isArray(req.listings) ? req.listings[0] : req.listings
    const property = Array.isArray(req.properties) ? req.properties[0] : req.properties

    if (listing && property) {
      // Get tenant and subtenant names
      const tenantId = listing.lister_id || listing.user_id
      const [tenantRes, subtenantRes, landlordUserRes] = await Promise.all([
        tenantId
          ? supabase.from('profiles').select('full_name').eq('id', tenantId).maybeSingle()
          : Promise.resolve({ data: null }),
        req.subtenant_user_id
          ? supabase.from('profiles').select('full_name').eq('id', req.subtenant_user_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      ])

      const rent = listing.rent_monthly ?? 0
      const deposit = listing.deposit ?? listing.security_deposit ?? rent

      const pdfBuffer = generateSubleasePdf({
        tenantName: tenantRes.data?.full_name || 'Tenant',
        subtenantName: subtenantRes.data?.full_name || 'Subtenant',
        landlordName: landlordUserRes.data?.full_name || 'Landlord',
        landlordCompany: landlordProfile.company_name,
        propertyAddress: property.address,
        startDate: listing.available_from || new Date().toISOString(),
        endDate: listing.available_to || new Date().toISOString(),
        monthlyRent: rent,
        securityDeposit: deposit,
        rulesText: property.rules_text,
      })

      // Upload to Supabase Storage
      const fileName = `sublease-${id}-${Date.now()}.pdf`
      const { error: uploadErr } = await supabase.storage
        .from('sublease-agreements')
        .upload(fileName, pdfBuffer, { contentType: 'application/pdf' })

      if (uploadErr) {
        console.error('[sublease upload]', uploadErr)
      } else {
        const { data: urlData } = supabase.storage
          .from('sublease-agreements')
          .getPublicUrl(fileName)

        // Store in sublease_agreements table
        await supabase.from('sublease_agreements').insert({
          sublet_request_id: id,
          document_url: urlData.publicUrl,
        })
      }
    }
  } catch (pdfErr) {
    // PDF generation is best-effort — don't fail the approval
    console.error('[sublease pdf generation]', pdfErr)
  }

  return NextResponse.json({ success: true })
}
