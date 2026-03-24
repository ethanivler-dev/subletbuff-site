-- ============================================================
-- Security fix: Null out PII columns on approved listings
--
-- The listings table stores email, first_name, last_name, address
-- at submission time, but these are redundant (available from the
-- profiles table and auth.users). Since the anon RLS policy on
-- listings cannot be column-restricted, we null out PII on all
-- approved listings so anon REST API queries return empty values.
--
-- New listings will still write PII (needed for admin review),
-- but an after-approval trigger clears it automatically.
-- ============================================================

-- Step 1: Null out PII on all currently approved listings
UPDATE public.listings
SET
  email = NULL,
  first_name = NULL,
  last_name = NULL
WHERE status = 'approved';

-- Step 2: Create trigger to clear PII when a listing is approved
CREATE OR REPLACE FUNCTION public.clear_listing_pii_on_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.email = NULL;
    NEW.first_name = NULL;
    NEW.last_name = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_listing_pii ON public.listings;
CREATE TRIGGER trg_clear_listing_pii
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_listing_pii_on_approve();
