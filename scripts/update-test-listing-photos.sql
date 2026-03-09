-- Update test listing photos with 3 Unsplash images each
-- Uses 10 photos in rotating combinations so listings look varied
--
-- Run in Supabase SQL Editor

WITH urls AS (
  SELECT unnest(ARRAY[
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1493809842364-78f1e9615162?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&h=600&fit=crop'
  ]) AS url,
  generate_series(1, 10) AS idx
),
numbered_listings AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM listings
  WHERE test_listing = true
),
photo_assignments AS (
  SELECT
    nl.id,
    ARRAY[
      (SELECT url FROM urls WHERE idx = ((nl.rn - 1) % 10) + 1),
      (SELECT url FROM urls WHERE idx = ((nl.rn + 2) % 10) + 1),
      (SELECT url FROM urls WHERE idx = ((nl.rn + 5) % 10) + 1)
    ] AS photos
  FROM numbered_listings nl
)
UPDATE listings
SET photo_urls = pa.photos
FROM photo_assignments pa
WHERE listings.id = pa.id;
