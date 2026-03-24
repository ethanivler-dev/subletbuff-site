import { SupabaseClient } from '@supabase/supabase-js'

/** Client-side check against admins table */
export async function isAdmin(supabase: SupabaseClient, userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false
  const { data } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  return !!data
}

/** Server-side check against admins table */
export async function isAdminServer(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  return !!data
}
