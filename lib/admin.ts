import { SupabaseClient } from '@supabase/supabase-js'

/** Hardcoded fallback admin user ID */
export const ADMIN_USER_ID = '4943eb7b-d0bd-40c6-95ce-a0f04471754e'

/** Quick client-side check (hardcoded fallback only) */
export function isAdmin(userId: string | undefined | null): boolean {
  return userId === ADMIN_USER_ID
}

/** Server-side check against admins table (with hardcoded fallback) */
export async function isAdminServer(supabase: SupabaseClient, userId: string): Promise<boolean> {
  if (userId === ADMIN_USER_ID) return true
  const { data } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  return !!data
}
