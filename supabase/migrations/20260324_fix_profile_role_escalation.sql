-- ============================================================
-- Fix: Prevent role escalation via direct profile updates
--
-- The original "Users update own profile" policy had no WITH CHECK
-- clause, allowing any authenticated user to set their role to 'admin'
-- via a direct Supabase client update from the browser console.
--
-- This migration replaces that policy with one that restricts the
-- role column to 'student' or 'landlord' only. Admin role can only
-- be assigned via the Supabase dashboard or a service-role client.
-- ============================================================

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND (role IS NULL OR role IN ('student', 'landlord')));
