-- Fix listing_photos RLS: check both user_id and lister_id for ownership
-- The "Owners manage photos" policy only checked user_id, but some listings
-- use lister_id instead. This caused photo rotate/crop updates to silently fail.

DROP POLICY IF EXISTS "Owners manage photos" ON public.listing_photos;

CREATE POLICY "Owners manage photos"
  ON public.listing_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_photos.listing_id
        AND (listings.user_id = auth.uid() OR listings.lister_id = auth.uid())
    )
  );
