/** Admin access control — hardcoded admin user ID */
export const ADMIN_USER_ID = '4943eb7b-d0bd-40c6-95ce-a0f04471754e'

export function isAdmin(userId: string | undefined | null): boolean {
  return userId === ADMIN_USER_ID
}
