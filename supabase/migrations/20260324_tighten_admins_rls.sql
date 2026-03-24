-- ============================================================
-- Security fix: Tighten admins table RLS
--
-- The current "Admins manage admins" policy uses FOR ALL which
-- allows any admin to INSERT/DELETE admin records. Replace with
-- separate policies: admins can SELECT, but only service-role
-- (via API routes with isAdminServer check) should manage rows.
--
-- Since Supabase service-role bypasses RLS, we just need to
-- remove INSERT/DELETE/UPDATE from the authenticated role.
-- ============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Admins manage admins" ON public.admins;
DROP POLICY IF EXISTS "Admins read admins" ON public.admins;

-- Admins can read the admins table (needed for isAdmin checks)
CREATE POLICY "Admins read admins"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- No INSERT/UPDATE/DELETE policy for authenticated role.
-- Admin management is done via service-role in API routes,
-- which bypasses RLS entirely. This prevents an admin from
-- directly adding/removing admins via the Supabase REST API.
