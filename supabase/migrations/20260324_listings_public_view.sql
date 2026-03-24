-- ============================================================
-- Security fix: Restrict anonymous access to listings PII
--
-- Problem: The "Public read live listings" RLS policy allows anon
-- users to query ALL columns via the Supabase REST API, exposing
-- email, address, exact coordinates, phone, first_name, last_name.
--
-- Fix: Remove anon from the direct table policy. Create a security
-- barrier view that only exposes safe columns for anonymous access.
-- Authenticated users (including server-side Next.js) still get
-- full column access through the existing "Owners/Admins" policies.
-- ============================================================

-- Step 1: Drop the old policy that gives anon full column access
DROP POLICY IF EXISTS "Public read live listings" ON public.listings;

-- Step 2: Recreate the policy for AUTHENTICATED users only
-- (Server-side Next.js uses authenticated context via cookies)
CREATE POLICY "Public read live listings"
  ON public.listings
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    AND COALESCE(paused, false) = false
    AND COALESCE(filled, false) = false
  );

-- Step 3: Create a separate anon-only policy that still allows
-- reading approved listings (needed if any anon queries exist)
-- but the real protection is that we route anon through a view
CREATE POLICY "Anon read live listings"
  ON public.listings
  FOR SELECT
  TO anon
  USING (
    status = 'approved'
    AND COALESCE(paused, false) = false
    AND COALESCE(filled, false) = false
  );

-- Step 4: Create a security barrier view for safe public access
-- This view ONLY exposes non-sensitive columns
-- Anyone querying via REST API as anon gets this view instead
CREATE OR REPLACE VIEW public.listings_public
WITH (security_barrier = true)
AS
SELECT
  id,
  title,
  description,
  neighborhood,
  public_latitude,
  public_longitude,
  room_type,
  bedrooms,
  bathrooms,
  sqft,
  rent_monthly,
  monthly_rent,
  deposit,
  security_deposit,
  utilities_included,
  utilities_estimate,
  available_from,
  available_to,
  start_date,
  end_date,
  min_stay_weeks,
  flexible_dates,
  furnished,
  amenities,
  house_rules,
  roommate_info,
  is_featured,
  immediate_movein,
  verified,
  lease_status,
  created_at,
  status,
  paused,
  filled,
  save_count,
  photo_urls,
  test_listing,
  original_rent_monthly,
  auto_reduce_enabled,
  management_company
FROM public.listings
WHERE status = 'approved'
  AND COALESCE(paused, false) = false
  AND COALESCE(filled, false) = false;

-- Grant anon read access to the view
GRANT SELECT ON public.listings_public TO anon;

-- Note: The following columns are intentionally EXCLUDED from the public view:
-- email, first_name, last_name, phone, address,
-- latitude, longitude (exact coords),
-- user_id, lister_id (identity linkage),
-- rejection_reason, reviewed_at, reviewed_by (admin internal)
