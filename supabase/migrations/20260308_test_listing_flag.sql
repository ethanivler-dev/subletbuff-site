-- Add test_listing flag to separate production from staging data.
-- Production queries filter with test_listing = false.
-- Staging shows everything.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS test_listing BOOLEAN DEFAULT false;

-- Mark ALL existing listings as test data so production starts clean.
UPDATE listings SET test_listing = true;
