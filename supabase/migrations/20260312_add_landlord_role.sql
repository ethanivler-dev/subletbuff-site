-- Phase 1: Add role column and landlord_details to profiles table
-- DO NOT auto-apply — requires manual review before running against Supabase

-- Add role column with constrained values
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student'
CHECK (role IN ('student', 'landlord', 'admin'));

-- Add landlord_details JSONB column for onboarding data (company, units, referral source)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS landlord_details JSONB;

-- Add phone column for landlord contact info
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- NOTE: The existing RLS policy "Users update own profile" allows users to update
-- their own row without column restrictions. To prevent self-escalation to 'admin',
-- consider replacing it with a policy that uses WITH CHECK to block role='admin' updates.
-- For now, the application code only sets role='landlord' during onboarding.
-- This should be reviewed before production use.
--
-- Suggested replacement (manual review required):
-- DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
-- CREATE POLICY "Users update own profile" ON public.profiles
--   FOR UPDATE USING (auth.uid() = id)
--   WITH CHECK (auth.uid() = id AND role IS DISTINCT FROM 'admin');
