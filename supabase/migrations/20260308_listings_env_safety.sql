-- ============================================================
-- Listings Safety + Environment Readiness
-- - Ensures test_listing is reliable for prod/staging filtering
-- - Locks down listings RLS to prevent broad destructive access
-- - Blocks direct DELETE/TRUNCATE on listings
-- - Provides safe single-listing delete RPC
-- ============================================================

-- Ensure test_listing exists and is always boolean (never null)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS test_listing BOOLEAN;

UPDATE public.listings
SET test_listing = false
WHERE test_listing IS NULL;

ALTER TABLE public.listings
  ALTER COLUMN test_listing SET DEFAULT false;

ALTER TABLE public.listings
  ALTER COLUMN test_listing SET NOT NULL;

-- Admin helper function used by policies + RPCs.
CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_admins_table BOOLEAN := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Hardcoded fallback admin from app config.
  IF p_user_id = '4943eb7b-d0bd-40c6-95ce-a0f04471754e'::UUID THEN
    RETURN true;
  END IF;

  SELECT to_regclass('public.admins') IS NOT NULL INTO has_admins_table;

  IF has_admins_table THEN
    RETURN EXISTS (SELECT 1 FROM public.admins a WHERE a.id = p_user_id);
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO anon, authenticated;

-- RLS for listings: explicit and defensive.
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Public read live listings'
  ) THEN
    CREATE POLICY "Public read live listings"
      ON public.listings
      FOR SELECT
      TO anon, authenticated
      USING (
        status = 'approved'
        AND COALESCE(paused, false) = false
        AND COALESCE(filled, false) = false
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Owners read own listings'
  ) THEN
    CREATE POLICY "Owners read own listings"
      ON public.listings
      FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL AND auth.uid() = COALESCE(lister_id, user_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Admins read all listings'
  ) THEN
    CREATE POLICY "Admins read all listings"
      ON public.listings
      FOR SELECT
      TO authenticated
      USING (public.is_admin_user(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Owners create listings'
  ) THEN
    CREATE POLICY "Owners create listings"
      ON public.listings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = COALESCE(lister_id, user_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Owners or admins update listings'
  ) THEN
    CREATE POLICY "Owners or admins update listings"
      ON public.listings
      FOR UPDATE
      TO authenticated
      USING (
        auth.uid() IS NOT NULL
        AND (
          auth.uid() = COALESCE(lister_id, user_id)
          OR public.is_admin_user(auth.uid())
        )
      )
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
          auth.uid() = COALESCE(lister_id, user_id)
          OR public.is_admin_user(auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Owners or admins delete listings'
  ) THEN
    CREATE POLICY "Owners or admins delete listings"
      ON public.listings
      FOR DELETE
      TO authenticated
      USING (
        auth.uid() IS NOT NULL
        AND (
          auth.uid() = COALESCE(lister_id, user_id)
          OR public.is_admin_user(auth.uid())
        )
      );
  END IF;
END $$;

-- Block direct destructive ops on listings.
CREATE OR REPLACE FUNCTION public.guard_listings_destructive_ops()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.allow_listing_delete', true) = 'on' THEN
    RETURN NULL;
  END IF;

  RAISE EXCEPTION 'Direct DELETE/TRUNCATE on public.listings is blocked. Use public.delete_listing_safe(uuid).';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_listings_delete ON public.listings;
CREATE TRIGGER trg_guard_listings_delete
  BEFORE DELETE ON public.listings
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.guard_listings_destructive_ops();

DROP TRIGGER IF EXISTS trg_guard_listings_truncate ON public.listings;
CREATE TRIGGER trg_guard_listings_truncate
  BEFORE TRUNCATE ON public.listings
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.guard_listings_destructive_ops();

-- Safe, auditable delete path for one listing at a time.
CREATE OR REPLACE FUNCTION public.delete_listing_safe(p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_owner UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(lister_id, user_id)
    INTO v_owner
  FROM public.listings
  WHERE id = p_listing_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF v_owner <> v_uid AND NOT public.is_admin_user(v_uid) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM set_config('app.allow_listing_delete', 'on', true);
  DELETE FROM public.listings WHERE id = p_listing_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_listing_safe(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_listing_safe(UUID) TO authenticated;
