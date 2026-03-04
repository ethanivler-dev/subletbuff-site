-- ============================================================
-- SubletBuff Phase 0 Migration
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe: only ADDs columns/tables, never drops anything
-- ============================================================

-- ============================================================
-- STEP 1: listings — add spec-aligned alias columns
-- ============================================================

-- Location coords (canonical + jittered public)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS public_latitude DOUBLE PRECISION;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS public_longitude DOUBLE PRECISION;

UPDATE public.listings SET
  latitude = lat::double precision,
  longitude = lng::double precision,
  public_latitude  = lat::double precision + (random()-0.5)*0.004,
  public_longitude = lng::double precision + (random()-0.5)*0.004
WHERE lat IS NOT NULL AND latitude IS NULL;

-- Pricing
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rent_monthly INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS deposit INTEGER;
UPDATE public.listings SET rent_monthly = monthly_rent WHERE rent_monthly IS NULL;
UPDATE public.listings SET deposit = security_deposit WHERE deposit IS NULL;

-- Rooms
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 1;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS bathrooms NUMERIC(2,1) DEFAULT 1;
UPDATE public.listings SET bedrooms = beds  WHERE bedrooms IS NULL AND beds IS NOT NULL;
UPDATE public.listings SET bathrooms = baths WHERE bathrooms IS NULL AND baths IS NOT NULL;

-- Dates
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS available_to DATE;
UPDATE public.listings SET available_from = start_date WHERE available_from IS NULL AND start_date IS NOT NULL;
UPDATE public.listings SET available_to   = end_date   WHERE available_to   IS NULL AND end_date IS NOT NULL;

-- lister_id (new FK alias for user_id)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS lister_id UUID REFERENCES auth.users(id);
UPDATE public.listings SET lister_id = user_id WHERE lister_id IS NULL AND user_id IS NOT NULL;

-- room_type
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS room_type TEXT;
UPDATE public.listings SET room_type = CASE
  WHEN unit_type IN ('room-shared','shared-room') THEN 'shared_room'
  WHEN unit_type = 'entire' AND housing_type IN ('apartment','condo','house') THEN 'full_apartment'
  ELSE 'private_room'
END WHERE room_type IS NULL;

-- title (backfill from address)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS title TEXT;
UPDATE public.listings SET title = address WHERE title IS NULL AND address IS NOT NULL;

-- ============================================================
-- STEP 2: listings — net-new columns
-- ============================================================
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Boulder';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'CO';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS sqft INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_intern_friendly BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS immediate_movein BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS utilities_included BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS utilities_estimate INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS min_stay_weeks INTEGER DEFAULT 1;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS flexible_dates BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS house_rules TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS roommate_info TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS lease_terms TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS inquiry_count INTEGER DEFAULT 0;

-- ============================================================
-- STEP 3: listing_photos — add spec-aligned alias columns
-- Existing cols: photo_path, photo_url, order, note, listing_id
-- Spec expects:  storage_path, url, display_order, is_primary
-- ============================================================
ALTER TABLE public.listing_photos ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.listing_photos ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.listing_photos ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE public.listing_photos ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
ALTER TABLE public.listing_photos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.listing_photos SET
  storage_path  = photo_path,
  url           = photo_url,
  display_order = COALESCE("order", 0)
WHERE storage_path IS NULL;

-- Mark one primary photo per listing (lowest order)
UPDATE public.listing_photos lp
SET is_primary = true
WHERE lp.id IN (
  SELECT DISTINCT ON (listing_id) id
  FROM public.listing_photos
  ORDER BY listing_id, COALESCE("order", 0) ASC
);

-- ============================================================
-- STEP 4: Create profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  verification_level TEXT DEFAULT 'basic'
    CHECK (verification_level IN ('basic','email_verified','lease_verified','edu_verified','id_verified')),
  edu_email TEXT,
  lease_doc_url TEXT,
  id_verified_at TIMESTAMPTZ,
  account_type TEXT DEFAULT 'free'
    CHECK (account_type IN ('free','renter_premium','lister_pro')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill existing auth users into profiles
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'avatar_url', '')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Auto-create profile on future signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public profiles readable"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- STEP 5: Create saved_listings table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Backfill from user_favorites (old table)
INSERT INTO public.saved_listings (user_id, listing_id, created_at)
SELECT user_id, listing_id, NOW()
FROM public.user_favorites
ON CONFLICT (user_id, listing_id) DO NOTHING;

ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users read own saves"
  ON public.saved_listings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users manage saves"
  ON public.saved_listings FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- STEP 6: Create inquiries table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lister_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  move_in_date DATE,
  move_out_date DATE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','replied','no_response','declined')),
  address_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Renters see own inquiries"
  ON public.inquiries FOR SELECT USING (auth.uid() = renter_id);
CREATE POLICY IF NOT EXISTS "Listers see received inquiries"
  ON public.inquiries FOR SELECT USING (auth.uid() = lister_id);
CREATE POLICY IF NOT EXISTS "Renters create inquiries"
  ON public.inquiries FOR INSERT WITH CHECK (auth.uid() = renter_id);
CREATE POLICY IF NOT EXISTS "Listers update inquiry status"
  ON public.inquiries FOR UPDATE USING (auth.uid() = lister_id);

-- ============================================================
-- STEP 7: Performance indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_listings_status     ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_rent        ON public.listings(rent_monthly) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_listings_dates       ON public.listings(available_from, available_to) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_listings_location    ON public.listings(public_latitude, public_longitude) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_listings_lister      ON public.listings(lister_id);
CREATE INDEX IF NOT EXISTS idx_photos_listing       ON public.listing_photos(listing_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_renter     ON public.inquiries(renter_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_lister     ON public.inquiries(lister_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_listing    ON public.inquiries(listing_id);

-- ============================================================
-- STATUS RENAME NOTE (run at cutover only — breaks old site)
-- ============================================================
-- When you cut over to the Next.js app, run this to rename 'approved' → 'active':
--
--   UPDATE public.listings SET status = 'active' WHERE status = 'approved';
--
-- Until then, the Next.js app queries status = 'approved' to stay compatible.
-- ============================================================
