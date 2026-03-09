-- Add columns for .edu email verification flow
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS edu_verification_code TEXT,
  ADD COLUMN IF NOT EXISTS edu_verification_expires TIMESTAMPTZ;
