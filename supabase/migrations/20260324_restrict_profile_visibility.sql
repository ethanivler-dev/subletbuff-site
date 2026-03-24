-- ============================================================
-- Security fix: Restrict profile reads to authenticated users
--
-- The original "Public profiles readable" policy used USING (true),
-- which allowed unauthenticated (anonymous) users to read all
-- profile data including email, phone, and landlord_details.
--
-- This migration replaces it with a policy that requires the
-- requesting user to be authenticated. Other authenticated users
-- can still read any profile (needed for messaging participant
-- names, listing contact info, avatars, etc.).
-- ============================================================

DROP POLICY IF EXISTS "Public profiles readable" ON public.profiles;

CREATE POLICY "Authenticated users can read profiles" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
