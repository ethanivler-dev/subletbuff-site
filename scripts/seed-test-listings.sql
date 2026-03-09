-- Seed 50 realistic test listings for SubletBuff staging
-- All listings: test_listing=true, status='approved', verified=true
-- Lister: admin account 4943eb7b-d0bd-40c6-95ce-a0f04471754e
--
-- Run against Supabase with: psql or Supabase SQL Editor
-- To remove: DELETE FROM listings WHERE test_listing = true;

-- ============================================================
-- THE HILL (15 listings)
-- ============================================================

INSERT INTO listings (
  user_id, lister_id, email, title, description, neighborhood, address, city, state, zip,
  latitude, longitude, public_latitude, public_longitude,
  room_type, rent_monthly, available_from, available_to,
  furnished, is_intern_friendly, is_featured, immediate_movein, utilities_included,
  amenities, bedrooms, bathrooms,
  status, test_listing, verified, paused, filled,
  photo_urls, created_at
) VALUES
-- 1. The Hill - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'My room in a 3BR on The Hill — available all summer',
  'Subletting my private room in a 3-bedroom apartment right on College Ave. 2 min walk to campus, super close to The Sink and Cosmo''s. Going home to California for the summer so it''s all yours May through August.',
  'The Hill', '1135 College Ave', 'Boulder', 'CO', '80302',
  40.0035, -105.2720, 40.0042, -105.2713,
  'private_room', 950, '2026-05-15', '2026-08-15',
  true, true, true, false, false,
  '["wifi","parking","laundry_in_building","ac"]'::jsonb, 3, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '2 days'
),
-- 2. The Hill - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Full apartment on College Ave — summer sublease',
  'Entire 2BR apartment available for summer sublease. Fully furnished with a balcony that has Flatiron views. Laundry in building, AC, and parking spot included. I''m doing an internship in Denver so won''t need it.',
  'The Hill', '1210 College Ave', 'Boulder', 'CO', '80302',
  40.0028, -105.2718, 40.0035, -105.2725,
  'full_apartment', 1850, '2026-05-20', '2026-08-10',
  true, true, true, false, false,
  '["wifi","parking","ac","balcony","laundry_in_building"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '3 days'
),
-- 3. The Hill - Shared Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Shared room on 13th — cheap summer spot',
  'Looking for someone to share a double room in a 4BR house on 13th St. Super cheap rent, great location right on The Hill. My roommate is chill and quiet. WiFi and utilities included in rent.',
  'The Hill', '1248 13th St', 'Boulder', 'CO', '80302',
  40.0040, -105.2700, 40.0047, -105.2708,
  'shared_room', 550, '2026-05-15', '2026-08-15',
  false, true, false, false, true,
  '["wifi","kitchen_access","bike_storage"]'::jsonb, 4, 2,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '1 day'
),
-- 4. The Hill - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Furnished room on Pennsylvania Ave, walk to campus',
  'Private room in a 3BR house on Pennsylvania. Fully furnished — bed, desk, dresser all included. 3 min walk to engineering center. Subletting because I''m studying abroad in Spain this summer.',
  'The Hill', '920 Pennsylvania Ave', 'Boulder', 'CO', '80302',
  40.0022, -105.2735, 40.0015, -105.2728,
  'private_room', 1050, '2026-06-01', '2026-08-31',
  true, false, true, false, false,
  '["wifi","parking","laundry_in_unit","kitchen_access"]'::jsonb, 3, 1.5,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '4 days'
),
-- 5. The Hill - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Cozy room on 12th St, right above The Sink',
  'Private room literally above The Sink on 12th. Can''t beat the location. Room comes furnished and has AC which is clutch for summer. Available May through mid-August, flexible on exact dates.',
  'The Hill', '1165 12th St', 'Boulder', 'CO', '80302',
  40.0032, -105.2740, 40.0025, -105.2747,
  'private_room', 1100, '2026-05-10', '2026-08-15',
  true, false, false, false, false,
  '["wifi","ac","kitchen_access","private_bathroom"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '5 days'
),
-- 6. The Hill - Shared Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Budget-friendly shared room on Euclid, all utilities included',
  'Shared room in a big 5BR house on Euclid Ave. All utilities and WiFi included in rent. Super social house, we have a yard and do cookouts. Perfect if you''re interning in Boulder this summer and want to meet people.',
  'The Hill', '1080 Euclid Ave', 'Boulder', 'CO', '80302',
  40.0018, -105.2710, 40.0011, -105.2703,
  'shared_room', 500, '2026-05-15', '2026-08-15',
  false, true, false, false, true,
  '["wifi","yard","kitchen_access","bike_storage"]'::jsonb, 5, 2,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '6 days'
),
-- 7. The Hill - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Entire 1BR on The Hill — perfect for couples',
  'Full 1-bedroom apartment on 13th St. Great for a couple or someone who wants their own space. Has AC, in-unit laundry, and a parking spot. I''m graduating and moving to Denver in May.',
  'The Hill', '1305 13th St', 'Boulder', 'CO', '80302',
  40.0045, -105.2695, 40.0052, -105.2688,
  'full_apartment', 1650, '2026-05-01', '2026-07-31',
  true, false, false, false, false,
  '["wifi","parking","laundry_in_unit","ac"]'::jsonb, 1, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '7 days'
),
-- 8. The Hill - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Room in 4BR house, huge yard, near campus',
  'Private room in a 4-bedroom house with an awesome backyard. We have a fire pit and do BBQs all summer. 5 min walk to campus. The other 3 roommates are super chill upperclassmen.',
  'The Hill', '1150 Pennsylvania Ave', 'Boulder', 'CO', '80302',
  40.0038, -105.2730, 40.0031, -105.2737,
  'private_room', 875, '2026-05-20', '2026-08-15',
  false, true, false, false, false,
  '["wifi","yard","kitchen_access","pets_allowed"]'::jsonb, 4, 2,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '8 days'
),
-- 9. The Hill - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Private room on College, AC and parking included',
  'Nice private room in a well-maintained 3BR apartment on College Ave. Comes with AC (trust me you want it in July) and a dedicated parking spot. Walking distance to everything on The Hill.',
  'The Hill', '1180 College Ave', 'Boulder', 'CO', '80302',
  40.0025, -105.2715, 40.0018, -105.2722,
  'private_room', 1000, '2026-05-15', '2026-08-10',
  false, false, false, false, false,
  '["wifi","parking","ac","laundry_in_building"]'::jsonb, 3, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '9 days'
),
-- 10. The Hill - Shared Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Cheapest spot on The Hill — shared room summer deal',
  'Shared room in a 4BR on 12th St. This is honestly the cheapest you''ll find this close to campus. Room is big enough for two desks. Quiet street, good vibes. Available all summer.',
  'The Hill', '1220 12th St', 'Boulder', 'CO', '80302',
  40.0042, -105.2745, 40.0035, -105.2738,
  'shared_room', 525, '2026-05-15', '2026-08-15',
  false, false, false, false, false,
  '["wifi","kitchen_access"]'::jsonb, 4, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '10 days'
),
-- 11. The Hill - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Renovated 2BR apartment on The Hill, summer only',
  'Recently renovated 2BR apartment with new appliances and modern bathroom. In-unit washer/dryer and central AC. Right in the heart of The Hill. Subletting while I travel for the summer.',
  'The Hill', '1275 Euclid Ave', 'Boulder', 'CO', '80302',
  40.0030, -105.2705, 40.0037, -105.2698,
  'full_apartment', 2100, '2026-06-01', '2026-08-31',
  true, false, false, false, false,
  '["wifi","parking","laundry_in_unit","ac","balcony"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '11 days'
),
-- 12. The Hill - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Single room in a house on 13th, pet friendly',
  'Private room in a 3BR house on 13th St. We''re pet friendly — I have a cat and my roommate has a small dog. Room is unfurnished but spacious. Great back porch for hanging out.',
  'The Hill', '1195 13th St', 'Boulder', 'CO', '80302',
  40.0033, -105.2690, 40.0040, -105.2697,
  'private_room', 900, '2026-05-15', '2026-08-15',
  false, false, false, false, false,
  '["wifi","pets_allowed","yard","kitchen_access"]'::jsonb, 3, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '12 days'
),
-- 13. The Hill - Private Room (spring sublet)
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Spring sublet on The Hill — move in ASAP',
  'Need someone to take over my room ASAP through end of spring semester. Private room in a 4BR apartment. Fully furnished. Leaving early for a co-op in Seattle. Rent is negotiable.',
  'The Hill', '1125 12th St', 'Boulder', 'CO', '80302',
  40.0020, -105.2750, 40.0027, -105.2743,
  'private_room', 850, '2026-03-15', '2026-05-31',
  true, false, false, true, false,
  '["wifi","laundry_in_building","kitchen_access"]'::jsonb, 4, 2,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '13 days'
),
-- 14. The Hill - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Quiet room on Pennsylvania, ideal for grad students',
  'Private room in a quieter part of The Hill on Pennsylvania Ave. Ideal for grad students or summer researchers. Has a dedicated desk area and good natural light. Roommates are both PhD students.',
  'The Hill', '980 Pennsylvania Ave', 'Boulder', 'CO', '80302',
  40.0015, -105.2725, 40.0008, -105.2718,
  'private_room', 1150, '2026-06-01', '2026-08-31',
  true, true, false, false, false,
  '["wifi","ac","private_bathroom","laundry_in_building"]'::jsonb, 3, 2,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '14 days'
),
-- 15. The Hill - Full Apartment (fall semester)
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Fall semester sublet — 2BR on The Hill',
  'Full 2BR apartment available for fall semester. Taking a semester off to do a startup. Fully furnished, has everything you need. Unbeatable location on College Ave, steps from campus.',
  'The Hill', '1155 College Ave', 'Boulder', 'CO', '80302',
  40.0030, -105.2712, 40.0023, -105.2705,
  'full_apartment', 2000, '2026-08-15', '2026-12-20',
  true, false, false, false, false,
  '["wifi","parking","laundry_in_unit","ac","balcony"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '15 days'
),

-- ============================================================
-- UNIVERSITY HILL (8 listings)
-- ============================================================

-- 16. University Hill - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Room near CU campus on Broadway, furnished',
  'Furnished private room in a 2BR apartment on Broadway. Super convenient — bus stop right outside, walking distance to Pearl Street and campus. Going home to Texas for the summer.',
  'University Hill', '1620 Broadway', 'Boulder', 'CO', '80302',
  39.9980, -105.2780, 39.9987, -105.2773,
  'private_room', 1050, '2026-05-15', '2026-08-15',
  true, true, false, false, false,
  '["wifi","laundry_in_building","bike_storage"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '1 day'
),
-- 17. University Hill - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Whole apartment on University Ave, mountain views',
  'Beautiful 1BR apartment on University Ave with amazing Flatiron views from the living room. Hardwood floors, updated kitchen. Perfect for someone who wants their own space close to campus.',
  'University Hill', '890 University Ave', 'Boulder', 'CO', '80302',
  39.9970, -105.2760, 39.9963, -105.2753,
  'full_apartment', 1600, '2026-05-20', '2026-08-10',
  true, false, false, false, false,
  '["wifi","parking","ac","balcony"]'::jsonb, 1, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '2 days'
),
-- 18. University Hill - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Room on 9th St, great for summer interns',
  'Private room in a 3BR house on 9th St. Really close to the engineering campus. Furnished with bed, desk, and bookshelf. Perfect for summer interns — there''s a bus to east Boulder tech companies.',
  'University Hill', '745 9th St', 'Boulder', 'CO', '80302',
  39.9975, -105.2750, 39.9968, -105.2757,
  'private_room', 975, '2026-05-15', '2026-08-15',
  true, true, false, false, false,
  '["wifi","parking","kitchen_access","bike_storage"]'::jsonb, 3, 1.5,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '3 days'
),
-- 19. University Hill - Shared Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Shared room on Aurora Ave — super affordable',
  'Sharing a large room in a 3BR house on Aurora Ave. Room has two twin beds. The house is cozy and has a nice front porch. Walking distance to Pearl St and campus. Rent includes utilities.',
  'University Hill', '825 Aurora Ave', 'Boulder', 'CO', '80302',
  39.9965, -105.2740, 39.9972, -105.2747,
  'shared_room', 600, '2026-06-01', '2026-08-31',
  false, true, false, false, true,
  '["wifi","kitchen_access","yard"]'::jsonb, 3, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '4 days'
),
-- 20. University Hill - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Spacious 2BR on 10th St, in-unit W/D',
  'Full 2BR apartment on 10th St with in-unit washer/dryer. Both bedrooms are good sized. Updated kitchen with dishwasher. Building has secure entry. Study abroad in Italy — need someone reliable.',
  'University Hill', '910 10th St', 'Boulder', 'CO', '80302',
  39.9985, -105.2770, 39.9978, -105.2777,
  'full_apartment', 1900, '2026-05-15', '2026-08-15',
  true, false, false, false, false,
  '["wifi","laundry_in_unit","ac","parking"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '5 days'
),
-- 21. University Hill - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Room in Victorian house on University Ave',
  'Cool old Victorian house on University Ave — my room has high ceilings and big windows. Shared kitchen and two bathrooms between 4 tenants. Close to everything downtown. Available June through August.',
  'University Hill', '940 University Ave', 'Boulder', 'CO', '80302',
  39.9990, -105.2755, 39.9983, -105.2762,
  'private_room', 1200, '2026-06-01', '2026-08-31',
  false, false, false, false, false,
  '["wifi","kitchen_access","bike_storage","yard"]'::jsonb, 4, 2,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '6 days'
),
-- 22. University Hill - Private Room (spring)
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Spring semester room on Broadway, available now',
  'Taking a leave of absence and need someone for my room through May. Private room in a 2BR on Broadway. Furnished, clean, and quiet building. Rent is below market — just need it covered.',
  'University Hill', '1580 Broadway', 'Boulder', 'CO', '80302',
  39.9960, -105.2790, 39.9967, -105.2783,
  'private_room', 800, '2026-03-01', '2026-05-31',
  true, false, false, true, false,
  '["wifi","laundry_in_building"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '7 days'
),
-- 23. University Hill - Shared Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Shared room near Pearl St, summer sublet',
  'Shared room in a 3BR apartment near the corner of Broadway and Pearl. Great for someone who wants to be close to downtown nightlife and restaurants. Comes with a parking spot.',
  'University Hill', '1510 Broadway', 'Boulder', 'CO', '80302',
  39.9955, -105.2800, 39.9962, -105.2793,
  'shared_room', 650, '2026-05-20', '2026-08-20',
  false, false, false, false, false,
  '["wifi","parking","kitchen_access"]'::jsonb, 3, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '8 days'
),

-- ============================================================
-- BASELINE SUB (6 listings)
-- ============================================================

-- 24. Baseline Sub - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Modern 1BR near 28th & Arapahoe, gym access',
  'Nice 1BR apartment in a newer building near 28th and Arapahoe. Building has a gym, pool, and secure parking garage. Close to grocery stores and bus routes. I''m working remotely from home this summer.',
  'Baseline Sub', '2850 Arapahoe Ave', 'Boulder', 'CO', '80303',
  40.0020, -105.2530, 40.0027, -105.2523,
  'full_apartment', 1550, '2026-05-15', '2026-08-15',
  true, true, false, false, false,
  '["wifi","parking","gym","pool","ac","laundry_in_unit"]'::jsonb, 1, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '2 days'
),
-- 25. Baseline Sub - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Room in townhouse near Foothills, parking included',
  'Private room in a 3BR townhouse near 30th and Arapahoe. Comes with a garage parking spot. Quick drive or bus ride to campus. Quiet neighborhood, good for studying. Available all summer.',
  'Baseline Sub', '3015 30th St', 'Boulder', 'CO', '80303',
  40.0010, -105.2510, 40.0003, -105.2517,
  'private_room', 950, '2026-05-15', '2026-08-15',
  false, true, false, false, false,
  '["wifi","parking","laundry_in_unit","kitchen_access"]'::jsonb, 3, 2.5,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '3 days'
),
-- 26. Baseline Sub - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Furnished room near CU East Campus, bus route',
  'Furnished private room in a 2BR apartment off 28th St. Right on the Stampede bus route so you can get to campus in 10 min. Apartment has AC and building has laundry. Great for summer researchers.',
  'Baseline Sub', '2770 28th St', 'Boulder', 'CO', '80303',
  40.0030, -105.2540, 40.0037, -105.2533,
  'private_room', 1100, '2026-06-01', '2026-08-31',
  true, true, false, false, false,
  '["wifi","ac","laundry_in_building","bike_storage"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '4 days'
),
-- 27. Baseline Sub - Shared Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Shared room in Baseline area, all inclusive',
  'Shared room in a 3BR apartment near 28th and Baseline. All utilities and internet included. Building has a pool and laundry room. Close to King Soopers and Trader Joe''s. Ideal for budget-conscious interns.',
  'Baseline Sub', '2680 28th St', 'Boulder', 'CO', '80303',
  40.0000, -105.2520, 40.0007, -105.2527,
  'shared_room', 650, '2026-05-20', '2026-08-10',
  false, true, false, false, true,
  '["wifi","pool","laundry_in_building","kitchen_access"]'::jsonb, 3, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '5 days'
),
-- 28. Baseline Sub - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  '2BR apartment near Whole Foods on Baseline',
  'Entire 2BR apartment near Whole Foods on Baseline. Great for two friends or a couple. Has covered parking, central AC, and in-unit laundry. Walking distance to restaurants and shopping.',
  'Baseline Sub', '2900 Arapahoe Ave', 'Boulder', 'CO', '80303',
  40.0040, -105.2500, 40.0033, -105.2507,
  'full_apartment', 1800, '2026-05-15', '2026-08-15',
  true, false, false, false, false,
  '["wifi","parking","laundry_in_unit","ac"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '6 days'
),
-- 29. Baseline Sub - Private Room (fall semester)
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Fall semester room near 28th St, quiet area',
  'Private room available for fall semester in a 2BR near 28th St. Quiet residential area with good bus access to campus. Furnished with queen bed and desk. I''m doing a fall co-op in San Francisco.',
  'Baseline Sub', '2830 30th St', 'Boulder', 'CO', '80303',
  40.0050, -105.2490, 40.0043, -105.2497,
  'private_room', 1000, '2026-08-10', '2026-12-20',
  true, false, false, false, false,
  '["wifi","parking","laundry_in_building","ac"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '7 days'
),

-- ============================================================
-- GOSS-GROVE (5 listings)
-- ============================================================

-- 30. Goss-Grove - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Studio apartment on Pearl St, walkable to everything',
  'Cute studio apartment on Pearl St. You can walk to Pearl Street Mall, campus, and all the restaurants. Has a small kitchen, bathroom, and decent closet space. Perfect for one person who wants independence.',
  'Goss-Grove', '1720 Pearl St', 'Boulder', 'CO', '80302',
  40.0100, -105.2720, 40.0107, -105.2713,
  'full_apartment', 1350, '2026-05-15', '2026-08-15',
  true, false, false, false, false,
  '["wifi","ac","kitchen_access"]'::jsonb, 1, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '1 day'
),
-- 31. Goss-Grove - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Room on Goss St, right next to Pearl Street Mall',
  'Private room in a 3BR house on Goss St. Literally a 2-minute walk to Pearl Street Mall. Great nightlife and restaurant access. Furnished room with a comfy queen bed. Study abroad in Japan!',
  'Goss-Grove', '1650 Goss St', 'Boulder', 'CO', '80302',
  40.0090, -105.2710, 40.0083, -105.2717,
  'private_room', 1100, '2026-05-20', '2026-08-20',
  true, false, false, false, false,
  '["wifi","kitchen_access","bike_storage"]'::jsonb, 3, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '2 days'
),
-- 32. Goss-Grove - Shared Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Affordable shared room on Grove St, summer sublet',
  'Shared room in a 4BR house on Grove St. Big room with two beds and two desks. House has a huge living room and nice kitchen. Good spot if you want to be between campus and downtown.',
  'Goss-Grove', '1680 Grove St', 'Boulder', 'CO', '80302',
  40.0080, -105.2700, 40.0087, -105.2707,
  'shared_room', 575, '2026-05-15', '2026-08-15',
  false, true, false, false, false,
  '["wifi","kitchen_access","yard","laundry_in_building"]'::jsonb, 4, 2,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '3 days'
),
-- 33. Goss-Grove - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Bright room on 17th St with private bath',
  'Private room with its own bathroom in a 2BR apartment on 17th St. Gets tons of natural light in the morning. Close to campus and downtown. Available for the whole summer, slightly flexible on dates.',
  'Goss-Grove', '1735 17th St', 'Boulder', 'CO', '80302',
  40.0110, -105.2730, 40.0103, -105.2723,
  'private_room', 1250, '2026-05-10', '2026-08-20',
  true, false, false, false, false,
  '["wifi","private_bathroom","ac","laundry_in_building"]'::jsonb, 2, 2,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '4 days'
),
-- 34. Goss-Grove - Full Apartment (spring)
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Spring sublet — 1BR on Arapahoe, move in now',
  'Full 1BR apartment on Arapahoe Ave in Goss-Grove area. Available immediately through June. Great location between campus and Pearl St. Furnished and has AC. Moving in with my partner early.',
  'Goss-Grove', '1690 Arapahoe Ave', 'Boulder', 'CO', '80302',
  40.0070, -105.2740, 40.0077, -105.2733,
  'full_apartment', 1400, '2026-03-10', '2026-06-15',
  true, false, false, true, false,
  '["wifi","ac","parking","kitchen_access"]'::jsonb, 1, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '5 days'
),

-- ============================================================
-- MARTIN ACRES (4 listings)
-- ============================================================

-- 35. Martin Acres - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Room in family-friendly house on Table Mesa Dr',
  'Private room in a 3BR house on Table Mesa Dr. Quiet neighborhood with lots of families — super safe. Has a yard and driveway parking. 10 min bike ride to campus via the bike path.',
  'Martin Acres', '480 Table Mesa Dr', 'Boulder', 'CO', '80305',
  39.9870, -105.2640, 39.9877, -105.2633,
  'private_room', 850, '2026-05-15', '2026-08-15',
  false, false, false, false, false,
  '["wifi","parking","yard","kitchen_access"]'::jsonb, 3, 2,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '3 days'
),
-- 36. Martin Acres - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Whole 2BR on Mohawk Dr, near NCAR trail',
  'Entire 2BR apartment in Martin Acres on Mohawk Dr. Super close to the NCAR trailhead — perfect if you like hiking. Quiet neighborhood, free parking, and the Bear Creek bike path is nearby.',
  'Martin Acres', '3340 Mohawk Dr', 'Boulder', 'CO', '80305',
  39.9860, -105.2600, 39.9853, -105.2607,
  'full_apartment', 1650, '2026-06-01', '2026-08-31',
  true, false, false, false, false,
  '["wifi","parking","laundry_in_unit","yard"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '4 days'
),
-- 37. Martin Acres - Shared Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Shared room near Bear Creek path, cheap summer spot',
  'Shared room in a 3BR house on Iroquois Dr. The house backs up to the Bear Creek bike path — amazing for biking to campus. Room is big and has two closets. Rent is really affordable for Boulder.',
  'Martin Acres', '3420 Iroquois Dr', 'Boulder', 'CO', '80305',
  39.9850, -105.2580, 39.9857, -105.2587,
  'shared_room', 550, '2026-05-15', '2026-08-15',
  false, true, false, false, false,
  '["wifi","bike_storage","yard","kitchen_access"]'::jsonb, 3, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '5 days'
),
-- 38. Martin Acres - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Furnished room on Table Mesa, near bus to campus',
  'Furnished private room in a 2BR condo on Table Mesa Dr. Right near the Table Mesa Park-n-Ride with direct bus to campus. Condo has AC and in-unit laundry. Great for summer interns at NIST or NOAA.',
  'Martin Acres', '520 Table Mesa Dr', 'Boulder', 'CO', '80305',
  39.9880, -105.2620, 39.9873, -105.2627,
  'private_room', 1050, '2026-05-20', '2026-08-15',
  true, true, false, false, false,
  '["wifi","parking","laundry_in_unit","ac"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '6 days'
),

-- ============================================================
-- NORTH BOULDER (3 listings)
-- ============================================================

-- 39. North Boulder - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Charming 1BR on Mapleton Ave, quiet and green',
  'Beautiful 1BR apartment on Mapleton Ave in North Boulder. Tree-lined street, super peaceful. Walking distance to Ideal Market and North Boulder Park. Perfect for someone who wants a quieter Boulder experience.',
  'North Boulder', '2450 Mapleton Ave', 'Boulder', 'CO', '80304',
  40.0280, -105.2780, 40.0273, -105.2773,
  'full_apartment', 1500, '2026-06-01', '2026-08-31',
  true, false, false, false, false,
  '["wifi","parking","laundry_in_unit","yard"]'::jsonb, 1, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '2 days'
),
-- 40. North Boulder - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Room in North Boulder house, dog friendly',
  'Private room in a 3BR house in North Boulder. We''re super dog friendly — currently have two friendly dogs in the house. Big fenced yard. Quiet neighborhood, 15 min bike to campus.',
  'North Boulder', '2680 N Broadway', 'Boulder', 'CO', '80304',
  40.0320, -105.2750, 40.0313, -105.2757,
  'private_room', 950, '2026-05-15', '2026-08-15',
  false, false, false, false, false,
  '["wifi","pets_allowed","yard","parking","kitchen_access"]'::jsonb, 3, 2,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '3 days'
),
-- 41. North Boulder - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Cozy room on Alpine Ave, mountain views',
  'Private room in a cute house on Alpine Ave with incredible mountain views from the living room. Quiet neighborhood, perfect for someone who values nature access. Sanitas trailhead is a 5 min walk.',
  'North Boulder', '2300 Alpine Ave', 'Boulder', 'CO', '80304',
  40.0350, -105.2700, 40.0343, -105.2707,
  'private_room', 1100, '2026-05-20', '2026-08-10',
  true, false, false, false, false,
  '["wifi","parking","yard","bike_storage"]'::jsonb, 3, 1.5,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '4 days'
),

-- ============================================================
-- SOUTH BOULDER (3 listings)
-- ============================================================

-- 42. South Boulder - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Spacious 2BR near Table Mesa Park-n-Ride',
  'Full 2BR apartment in South Boulder near the Table Mesa Park-n-Ride. Direct Flatiron Flyer bus to Denver if you''re commuting. Has in-unit laundry, AC, and 2 parking spots. Great for working professionals.',
  'South Boulder', '640 Table Mesa Dr', 'Boulder', 'CO', '80305',
  39.9870, -105.2600, 39.9863, -105.2607,
  'full_apartment', 1750, '2026-05-15', '2026-08-15',
  true, true, false, false, false,
  '["wifi","parking","laundry_in_unit","ac"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '2 days'
),
-- 43. South Boulder - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Room on Lehigh St, near South Boulder Creek trail',
  'Private room in a 3BR house on Lehigh St. Steps from the South Boulder Creek trail for running and biking. Quiet residential area. Furnished with bed and desk. I''m heading to an REU in Wisconsin.',
  'South Boulder', '750 Lehigh St', 'Boulder', 'CO', '80305',
  39.9855, -105.2560, 39.9862, -105.2567,
  'private_room', 925, '2026-05-20', '2026-08-15',
  true, false, false, false, false,
  '["wifi","parking","kitchen_access","bike_storage"]'::jsonb, 3, 2,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '3 days'
),
-- 44. South Boulder - Shared Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Shared room on Stanford Ave, utilities included',
  'Shared room in a 3BR house on Stanford Ave. All utilities included in rent. The house has a great backyard with a hammock. Close to King Soopers on Table Mesa. Chill roommates who work at CU.',
  'South Boulder', '810 Stanford Ave', 'Boulder', 'CO', '80305',
  39.9840, -105.2540, 39.9847, -105.2547,
  'shared_room', 600, '2026-06-01', '2026-08-31',
  false, false, false, false, true,
  '["wifi","yard","kitchen_access","parking"]'::jsonb, 3, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '4 days'
),

-- ============================================================
-- EAST BOULDER (3 listings)
-- ============================================================

-- 45. East Boulder - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Modern 1BR on 55th St, near tech companies',
  'Modern 1BR apartment in East Boulder near 55th and Arapahoe. Walking distance to Google, Twitter, and other tech offices. Building has a gym and pool. Great for summer interns in tech.',
  'East Boulder', '5500 Arapahoe Ave', 'Boulder', 'CO', '80303',
  40.0050, -105.2350, 40.0043, -105.2357,
  'full_apartment', 1450, '2026-05-15', '2026-08-15',
  true, true, false, false, false,
  '["wifi","parking","gym","pool","ac","laundry_in_unit"]'::jsonb, 1, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '1 day'
),
-- 46. East Boulder - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Room in East Boulder townhouse, garage parking',
  'Private room in a 3BR townhouse off Valmont Rd. Comes with a garage parking spot. Townhouse has a small yard and is near Valmont Bike Park. Quiet area, 15 min drive to campus.',
  'East Boulder', '4820 Valmont Rd', 'Boulder', 'CO', '80301',
  40.0100, -105.2300, 40.0107, -105.2293,
  'private_room', 900, '2026-05-20', '2026-08-20',
  false, false, false, false, false,
  '["wifi","parking","laundry_in_unit","yard","kitchen_access"]'::jsonb, 3, 2.5,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '2 days'
),
-- 47. East Boulder - Shared Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Budget room near Arapahoe & 55th, bus to campus',
  'Shared room in a 3BR apartment near 55th and Arapahoe. Cheapest you''ll find in a newer building. On the SKIP bus route to campus. Building has laundry and bike storage. Great for summer interns on a budget.',
  'East Boulder', '5450 Arapahoe Ave', 'Boulder', 'CO', '80303',
  40.0030, -105.2280, 40.0037, -105.2287,
  'shared_room', 575, '2026-05-15', '2026-08-15',
  false, true, false, false, false,
  '["wifi","laundry_in_building","bike_storage"]'::jsonb, 3, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '3 days'
),

-- ============================================================
-- CHAUTAUQUA (3 listings)
-- ============================================================

-- 48. Chautauqua - Full Apartment
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Stunning 1BR near Chautauqua, Flatiron views',
  'Amazing 1BR apartment near Chautauqua Park with Flatiron views from the bedroom window. Steps from hiking trails. Quiet, peaceful area — feels like a mountain retreat. 10 min bike to campus downhill.',
  'Chautauqua', '720 Baseline Rd', 'Boulder', 'CO', '80302',
  39.9940, -105.2870, 39.9947, -105.2863,
  'full_apartment', 1700, '2026-06-01', '2026-08-31',
  true, false, false, false, false,
  '["wifi","parking","balcony","yard"]'::jsonb, 1, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '1 day'
),
-- 49. Chautauqua - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Room in cottage near Chautauqua, trailhead access',
  'Private room in a charming 2BR cottage near Grant St. The Royal Arch trailhead is a 5-minute walk. Room has big windows with mountain views. Furnished with queen bed. Going to a summer program at MIT.',
  'Chautauqua', '645 Grant St', 'Boulder', 'CO', '80302',
  39.9930, -105.2860, 39.9923, -105.2867,
  'private_room', 1300, '2026-05-15', '2026-08-15',
  true, false, false, false, false,
  '["wifi","parking","yard","kitchen_access"]'::jsonb, 2, 1,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '2 days'
),
-- 50. Chautauqua - Private Room
(
  '4943eb7b-d0bd-40c6-95ce-a0f04471754e', '4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'ethan@subletbuff.com',
  'Nature lover''s room on Kinnikinic, near trails',
  'Private room in a 3BR house on Kinnikinic Rd, surrounded by nature. Walk to Chautauqua trailhead in under 5 min. The house has a wood-burning fireplace and wraparound porch. Unfurnished but spacious.',
  'Chautauqua', '580 Kinnikinic Rd', 'Boulder', 'CO', '80302',
  39.9920, -105.2880, 39.9913, -105.2873,
  'private_room', 1150, '2026-05-20', '2026-08-20',
  false, false, false, false, false,
  '["wifi","parking","yard","kitchen_access","bike_storage"]'::jsonb, 3, 1.5,
  'approved', true, true, false, false,
  ARRAY['https://placehold.co/800x600?text=Summer+Sublet'], NOW() - interval '3 days'
);
