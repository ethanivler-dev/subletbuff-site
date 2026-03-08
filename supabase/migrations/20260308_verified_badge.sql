-- Add verified listing badge columns.
-- Run in Supabase SQL Editor.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Mark all approved listings as verified.
UPDATE listings SET verified = true, verified_at = now() WHERE status = 'approved';
