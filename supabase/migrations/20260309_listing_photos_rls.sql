-- Enable RLS on listing_photos (was missing)
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view photos of public listings
CREATE POLICY "Public read photos"
  ON public.listing_photos FOR SELECT
  USING (true);

-- Listing owners can insert/update/delete their own photos
CREATE POLICY "Owners manage photos"
  ON public.listing_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_photos.listing_id
        AND listings.user_id = auth.uid()
    )
  );

-- Admins can manage any photos
CREATE POLICY "Admins manage photos"
  ON public.listing_photos FOR ALL
  USING (
    auth.uid() = '4943eb7b-d0bd-40c6-95ce-a0f04471754e'::uuid
  );
