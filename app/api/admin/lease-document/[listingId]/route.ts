import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminServer } from '@/lib/admin'

/**
 * GET /api/admin/lease-document/[listingId]
 * Returns a signed URL for the lease document. Admin auth required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { listingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !(await isAdminServer(supabase, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('lease_document_path')
    .eq('id', listingId)
    .single()

  if (!listing?.lease_document_path) {
    return NextResponse.json({ error: 'No lease document found' }, { status: 404 })
  }

  const { data: signedUrl, error } = await supabase.storage
    .from('lease-documents')
    .createSignedUrl(listing.lease_document_path, 3600)

  if (error || !signedUrl) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create signed URL' }, { status: 500 })
  }

  return NextResponse.json({ url: signedUrl.signedUrl })
}
