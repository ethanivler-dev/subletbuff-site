-- Add per-listing lease verification columns
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS lease_status TEXT DEFAULT 'none'
    CHECK (lease_status IN ('none', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS lease_document_path TEXT;
