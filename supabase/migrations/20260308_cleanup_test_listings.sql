-- ============================================================
-- Section 3: Clean Up Test Listings
-- Run each section in Supabase SQL Editor, reviewing output
-- before running the UPDATE statements.
-- ============================================================

-- ============================================================
-- STEP 1: AUDIT — Review "Testing" titles
-- ============================================================
SELECT id, title, neighborhood, room_type, rent_monthly
FROM listings
WHERE title ILIKE '%testing%' OR title ILIKE '%test%';

-- ============================================================
-- STEP 2: FIX "Testing" titles → realistic names
-- ============================================================
UPDATE listings
SET title = CASE room_type
  WHEN 'private_room' THEN 'Private Room in ' || COALESCE(neighborhood, 'Boulder') || ' — Summer Sublet'
  WHEN 'full_apartment' THEN 'Full Apartment in ' || COALESCE(neighborhood, 'Boulder') || ' — Summer Sublet'
  WHEN 'shared_room' THEN 'Shared Room in ' || COALESCE(neighborhood, 'Boulder') || ' — Summer Sublet'
  ELSE 'Summer Sublet in ' || COALESCE(neighborhood, 'Boulder')
END
WHERE title ILIKE '%testing%' OR title ILIKE '%test%';

-- ============================================================
-- STEP 3: AUDIT — Overpriced listings (> $3,000/mo)
-- ============================================================
SELECT id, title, rent_monthly, room_type FROM listings WHERE rent_monthly > 3000;

-- ============================================================
-- STEP 4: FIX the $8,100 listing (likely meant $810)
-- ============================================================
UPDATE listings
SET rent_monthly = 810, monthly_rent = 810
WHERE rent_monthly = 8100;

-- Verify nothing else is still over $3,000
SELECT id, title, rent_monthly FROM listings WHERE rent_monthly > 3000;

-- ============================================================
-- STEP 5: AUDIT — Other data issues
-- ============================================================

-- Missing descriptions
SELECT id, title FROM listings WHERE description IS NULL OR description = '';

-- Past dates (still marked as active)
SELECT id, title, available_to, end_date
FROM listings
WHERE (available_to < CURRENT_DATE OR end_date < CURRENT_DATE)
  AND status = 'approved' AND filled = false AND paused = false;

-- Missing photos
SELECT id, title FROM listings
WHERE (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL)
  AND NOT EXISTS (SELECT 1 FROM listing_photos WHERE listing_photos.listing_id = listings.id);

-- Missing neighborhood
SELECT id, title FROM listings WHERE neighborhood IS NULL OR neighborhood = '';

-- Missing rent
SELECT id, title FROM listings WHERE rent_monthly IS NULL OR rent_monthly = 0;

-- ============================================================
-- STEP 6: Auto-pause expired listings
-- ============================================================
UPDATE listings
SET paused = true
WHERE (available_to < CURRENT_DATE OR end_date < CURRENT_DATE)
  AND status = 'approved' AND filled = false AND paused = false;
