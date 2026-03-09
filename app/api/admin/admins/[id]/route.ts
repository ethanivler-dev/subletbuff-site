import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminServer } from '@/lib/admin'

/**
 * DELETE /api/admin/admins/[id] — remove an admin
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !(await isAdminServer(supabase, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Can't remove yourself
  if (id === user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself as admin' }, { status: 400 })
  }

  const { error } = await supabase
    .from('admins')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
