-- Update test listing photos with real Unsplash apartment images
-- Randomly assigns from 10 different photos so cards look varied
--
-- Run in Supabase SQL Editor

WITH photos AS (
  SELECT unnest(ARRAY[
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1493809842364-78f1e9615162?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529408570655-18955e4f8420?w=800&h=600&fit=crop'
  ]) AS url,
  generate_series(1, 10) AS idx
),
numbered_listings AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM listings
  WHERE test_listing = true
)
UPDATE listings
SET photo_urls = ARRAY[photos.url]
FROM numbered_listings, photos
WHERE listings.id = numbered_listings.id
  AND photos.idx = ((numbered_listings.rn - 1) % 10) + 1;
