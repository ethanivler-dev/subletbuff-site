/*
  generate-test-listings.js
  ─────────────────────────
  Run from the browser console while signed in as an admin on the site,
  OR load via a <script> tag on any page that already has Supabase initialised.

  Usage (browser console):
    1. Open your site in a browser and sign in
    2. Open DevTools → Console
    3. Paste this entire file
    4. Run:  generateTestListings(10)   // creates 10 listings
    5. Run:  deleteTestListings()       // removes all generated test listings

  Each listing gets a unique combo of address, neighborhood, photos,
  description, pricing, dates, etc. — no two are the same.
*/

/* ──────────────────── CONFIG ──────────────────── */
const SUPABASE_URL  = 'https://doehqqwqwjebhfgdvyum.supabase.co';
const SUPABASE_ANON = 'sb_publishable_ZZ4mKcw6_e9diz7oFfbVag_YA9zkqFW';

/* ──────────────────── DATA POOLS ──────────────────── */
const FIRST_NAMES = ['Alex','Jordan','Sam','Casey','Morgan','Taylor','Riley','Avery','Quinn','Drew','Jamie','Skyler','Reese','Dakota','Peyton','Cameron','Hayden','Emery','Finley','Rowan'];
const LAST_NAMES = ['Smith','Johnson','Martinez','Chen','Nguyen','Patel','Garcia','Brown','Lee','Wilson','Lopez','Anderson','Kim','Jackson','Robinson','Clark','Lewis','Young','Hall','Wright'];

const ADDRESSES = [
  { street: '1234 College Ave',      neighborhood: 'University Hill', lat: 40.0066, lng: -105.2675 },
  { street: '567 Broadway St',       neighborhood: 'North Boulder',   lat: 40.0220, lng: -105.2811 },
  { street: '890 Pearl St',          neighborhood: 'Downtown',        lat: 40.0176, lng: -105.2797 },
  { street: '345 Arapahoe Ave',      neighborhood: 'Arapahoe',        lat: 40.0145, lng: -105.2630 },
  { street: '2100 Canyon Blvd',      neighborhood: 'Central Boulder', lat: 40.0160, lng: -105.2715 },
  { street: '750 Baseline Rd',       neighborhood: 'Martin Acres',    lat: 40.0000, lng: -105.2660 },
  { street: '420 Euclid Ave',        neighborhood: 'University Hill', lat: 40.0055, lng: -105.2710 },
  { street: '1600 Table Mesa Dr',    neighborhood: 'Table Mesa',      lat: 39.9900, lng: -105.2580 },
  { street: '3200 28th St',          neighborhood: 'Iris',            lat: 40.0320, lng: -105.2560 },
  { street: '1850 Folsom St',        neighborhood: 'Whittier',        lat: 40.0190, lng: -105.2703 },
  { street: '2450 Spruce St',        neighborhood: 'Mapleton',        lat: 40.0230, lng: -105.2855 },
  { street: '1100 Marine St',        neighborhood: 'Marine',          lat: 40.0135, lng: -105.2775 },
  { street: '3750 Moorhead Ave',     neighborhood: 'Palo Park',       lat: 40.0260, lng: -105.2505 },
  { street: '510 Aurora Ave',        neighborhood: 'Aurora',          lat: 40.0100, lng: -105.2500 },
  { street: '2200 Bluff St',         neighborhood: 'Newlands',        lat: 40.0280, lng: -105.2800 },
  { street: '980 18th St',           neighborhood: 'University Hill', lat: 40.0082, lng: -105.2720 },
  { street: '1425 Grandview Ave',    neighborhood: 'Grandview',       lat: 40.0088, lng: -105.2580 },
  { street: '605 Pleasant St',       neighborhood: 'Goss-Grove',      lat: 40.0110, lng: -105.2735 },
  { street: '1775 Alpine Ave',       neighborhood: 'Alpine-Balsam',   lat: 40.0210, lng: -105.2730 },
  { street: '2800 Kalmia Ave',       neighborhood: 'North Boulder',   lat: 40.0300, lng: -105.2700 },
  { street: '130 Bear Creek Ave',    neighborhood: 'South Boulder',   lat: 39.9935, lng: -105.2610 },
  { street: '4500 Thunderbird Dr',   neighborhood: 'Williams Village',lat: 40.0050, lng: -105.2480 },
  { street: '1950 Walnut St',        neighborhood: 'Whittier',        lat: 40.0200, lng: -105.2680 },
  { street: '660 Mohawk Dr',         neighborhood: 'Frasier Meadows', lat: 39.9970, lng: -105.2430 },
  { street: '3100 Iris Ave',         neighborhood: 'Iris',            lat: 40.0350, lng: -105.2620 },
];

const UNIT_NUMBERS = [null, null, null, 'Apt 1A', 'Apt 2B', 'Unit 3', 'Apt 4', '#5', 'Suite 6', 'Apt 7C', '#101', '#202', 'Unit 8', 'Apt 9D'];

const BEDS_OPTIONS   = ['Studio', '1', '2', '3', '4', '5+'];
const BATHS_OPTIONS  = ['1', '1.5', '2', '2.5', '3+'];
const HOUSING_TYPES  = ['apartment', 'house', 'condo'];
const UNIT_TYPES     = ['entire', 'room-shared', 'shared-room'];
const LEASE_TYPES    = ['Sublease', 'Lease Takeover'];
const GENDER_PREFS   = ['', 'Male only', 'Female only', 'Non-binary friendly', 'Any / all welcome'];
const PARKING_OPTS   = ['Included', 'Available (extra cost)', 'Street parking', 'None'];
const PETS_OPTS      = ['No', 'Dogs', 'Cats', 'Dogs; Cats', 'Dogs; Cats; Small animals', 'Fish', 'Birds; Fish', 'Dogs; small yard available'];
const CONTACT_PREFS  = ['Email', 'Text'];
const BEST_TIMES     = ['', 'Morning (8am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–9pm)'];
const FURNISHED_OPTS = ['Yes', 'No', 'Yes (Bed frame, desk, dresser included)', 'Yes (Fully furnished with couch, TV, kitchen essentials)', 'Yes (Desk and chair only)', 'No'];

const DESCRIPTIONS = [
  "Bright and spacious 2-bedroom apartment just steps from campus. Hardwood floors throughout, updated kitchen with stainless steel appliances, and in-unit laundry. Building has a rooftop deck with mountain views. Utilities (water, trash) included in rent. Looking for a responsible tenant who will take good care of the space. Available for summer sublease — perfect for anyone taking summer classes or doing research on campus.",

  "Cozy room in a shared 3-bedroom house in the heart of University Hill. Walking distance to CU campus, Pearl Street, and the best coffee shops in Boulder. The house has a big backyard, fire pit, and covered porch. Shared kitchen is fully stocked. Your room is furnished with a queen bed and desk. We're two friendly grad students looking for a chill roommate who keeps common areas tidy.",

  "Modern studio apartment with floor-to-ceiling windows and gorgeous Flatirons views. Located in a newer building with gym, bike storage, and package lockers. Kitchen has granite countertops and a dishwasher. Super fast internet included. One reserved parking spot in the garage. Quiet building — great for studying. Bus stop right outside for easy commute to campus.",

  "Entire 1-bedroom condo available for lease takeover. Ground floor unit with private patio and access to community pool and hot tub. Open floor plan with modern finishes. Kitchen has gas range, microwave, and full-size fridge. Bedroom fits a king bed comfortably. Small pets allowed with deposit. Walking distance to grocery stores and restaurants on Arapahoe.",

  "Furnished room in a beautiful 4-bedroom house near campus. Large private bedroom with a closet and two windows for natural light. Shared bathroom with one other person. House has a spacious living room, full kitchen, washer/dryer, and a big front porch. Neighborhood is quiet and safe. Two blocks from the bus stop and a 10-minute bike ride to campus.",

  "Sun-drenched 2-bed/2-bath apartment in North Boulder. Each bedroom has its own bathroom — no sharing! Open kitchen with breakfast bar, ample cabinet space, and newer appliances. Living room opens to a private balcony facing the mountains. Community has a pool, hot tub, and sand volleyball court. Covered parking included. RTD bus stop nearby for quick campus access.",

  "Spacious room in a 3-bedroom apartment right on the Hill. Perfect location — you can roll out of bed and be in class in 5 minutes. Room comes with a full-size bed, nightstand, and desk. Shared living spaces are kept clean. Building has laundry on each floor. Rent includes water, trash, and high-speed WiFi. Looking for a summer subletter from May through August.",

  "Charming 1-bedroom cottage behind a main house in Mapleton. Very private and quiet with its own entrance. Exposed brick wall in the living area, updated bathroom with rainfall shower, and a small but functional kitchen. Shared garden space with the landlord who is super friendly. No pets please. Street parking available. Perfect for a grad student or young professional.",

  "Large 3-bedroom apartment available for sublease. All bedrooms are good-sized and have closets. Two full bathrooms. Kitchen has new countertops and a dishwasher. Living room is big enough for a couch, TV area, and study nook. Free laundry in the building. Includes one garage parking spot. Located on the free Skip bus route so getting to campus is a breeze.",

  "Top-floor 2-bedroom apartment with vaulted ceilings and skylights. So much natural light! Open kitchen with bar seating. Both bedrooms are spacious with big closets. In-unit washer and dryer. Building is pet-friendly. Small fitness room and bike storage on-site. Quiet street but only a 5-minute walk to Pearl Street restaurants and shops. Mountain views from the balcony!",

  "Shared room in a 2-bedroom apartment — ideal if you're looking for the most affordable option near campus. The room is split between two people with a divider for privacy. Comes with a twin XL bed and small desk. Shared kitchen and bathroom with 3 other people total. Building has laundry and bike racks. Rent is super affordable for the location.",

  "Beautifully renovated 2-bedroom house with a fenced backyard and detached garage. Hardwood floors, new kitchen with quartz countertops, and a gas fireplace in the living room. Master bedroom has an en-suite bathroom. Second bedroom is great for an office or guest room. Washer/dryer hookups in the basement. Dog-friendly — the backyard is perfect for pups.",

  "Entire unit in a recently built apartment complex near Whole Foods and the Twenty Ninth Street Mall. 1 bed/1 bath with modern finishes — quartz counters, soft-close cabinets, LVP flooring. Includes AC (rare in Boulder!), in-unit laundry, and a balcony. Covered parking and EV charging available. Gym and rooftop terrace in the building.",

  "Private room in a 5-bedroom house with a huge living room, two full bathrooms, and a massive backyard. House is on the Hill and is a classic Boulder college home. Big kitchen with two fridges. Your room fits a full bed and desk easily. Front porch is perfect for hanging out. Walking distance to everything — campus, food, nightlife. Lease runs through next May.",

  "Quiet 1-bedroom apartment in Table Mesa. Perfect for someone who wants to be close to campus but in a more peaceful neighborhood. Apartment has a nice little patio facing a grassy area. Kitchen has everything you need. Bathroom was recently updated. Building laundry room is well-maintained. Bus stop is a 2-minute walk away. No smoking on the premises.",

  "Spacious 3-bed/2-bath townhome near Baseline and Broadway. Two stories — bedrooms upstairs, kitchen and living downstairs. Attached 1-car garage plus driveway parking. Small patio out back. Kitchen has newer appliances. HOA covers snow removal, landscaping, water, and trash. Washer and dryer included. Great for a group of friends looking to lease together.",

  "Stylish furnished apartment in Downtown Boulder. Walk to Pearl Street in 3 minutes. 1 bedroom with a lofted area that works great as an office or reading nook. Italian tile in the bathroom. Chef's kitchen with gas stove. Exposed beam ceilings give it tons of character. Building has a lovely courtyard. Available June through December — flexible on exact dates.",

  "Room in a shared 2-bedroom apartment with one female roommate. Apartment is clean, well-maintained, and in a safe neighborhood. Your room is unfurnished so bring your own stuff. Shared spaces include a nice living room, kitchen with new appliances, and a shared bathroom. Laundry in the building. Close to the bus line. Looking for a female roommate.",

  "Huge 4-bedroom house perfect for a group lease takeover. Located in Frasier Meadows — super quiet but only 10 minutes to campus by bike. House has two full bathrooms, a big kitchen, separate dining room and living room. Massive unfinished basement for storage or hanging out. Big backyard with a grill. Two-car garage. Pets negotiable.",

  "Modern micro-studio near campus — perfect for minimalists. Murphy bed, built-in desk, compact kitchenette with mini fridge and microwave. Full bathroom. Building has a co-working lounge, rooftop BBQ area, and bike repair station. Rent includes all utilities, WiFi, and a parking spot. Lock in a great price for the summer while most students are away.",
];

// Use picsum photos with known-good IDs so none 404
const KNOWN_GOOD_PICSUM_IDS = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  100, 101, 102, 103, 104, 106, 107, 108, 109, 110, 111, 112, 113, 114, 116, 117,
  118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133,
  134, 135, 136, 137, 139, 140, 141, 142, 143, 144, 145, 146, 147, 149, 151, 152,
  153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168,
  169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184,
];

function getPhotoUrls(index) {
  const count = 3 + Math.floor(Math.random() * 5); // 3-7 photos
  const urls = [];
  for (let i = 0; i < count; i++) {
    const id = KNOWN_GOOD_PICSUM_IDS[(index * 7 + i * 3) % KNOWN_GOOD_PICSUM_IDS.length];
    urls.push(`https://picsum.photos/id/${id}/800/600`);
  }
  return urls;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateStartDate(index) {
  // Spread dates: some start in the past, some future
  const base = new Date('2026-05-01');
  base.setDate(base.getDate() + (index * 7) % 120 - 30);
  return base.toISOString().split('T')[0];
}

function generateEndDate(startDate, index) {
  const start = new Date(startDate);
  const months = [2, 3, 4, 5, 6, 8, 12][index % 7]; // variety of lease lengths
  start.setMonth(start.getMonth() + months);
  return start.toISOString().split('T')[0];
}

function buildListing(index) {
  const addr = ADDRESSES[index % ADDRESSES.length];
  const startDate = generateStartDate(index);
  const endDate = generateEndDate(startDate, index);
  const rent = [650, 750, 800, 900, 950, 1050, 1100, 1200, 1350, 1400, 1500, 1650, 1800, 1950, 2100, 2300, 2500, 2800][index % 18];
  const petsVal = pick(PETS_OPTS);
  const furnVal = FURNISHED_OPTS[index % FURNISHED_OPTS.length];
  const unitType = UNIT_TYPES[index % UNIT_TYPES.length];
  const beds = unitType === 'shared-room' ? '1' : BEDS_OPTIONS[(index + 2) % BEDS_OPTIONS.length];
  const deposit = Math.random() > 0.3 ? rent : null;

  const priceReduction = Math.random() > 0.6;

  return {
    id: crypto.randomUUID(),
    email: `testuser${index}@colorado.edu`,
    first_name: FIRST_NAMES[index % FIRST_NAMES.length],
    last_name: LAST_NAMES[(index + 5) % LAST_NAMES.length],
    monthly_rent: rent,
    address: addr.street,
    unit_number: UNIT_NUMBERS[index % UNIT_NUMBERS.length],
    neighborhood: addr.neighborhood,
    lat: addr.lat + (Math.random() - 0.5) * 0.004,   // slight jitter
    lng: addr.lng + (Math.random() - 0.5) * 0.004,
    beds,
    baths: BATHS_OPTIONS[(index + 1) % BATHS_OPTIONS.length],
    furnished: furnVal,
    start_date: startDate,
    end_date: endDate,
    flexible_movein: Math.random() > 0.5 ? 'yes' : 'no',
    flexible_movein_notes: Math.random() > 0.7 ? 'Can adjust by a week or two if needed' : null,
    phone: `(303) ${randInt(200,999)}-${String(randInt(1000,9999))}`,
    preferred_contact: pick(CONTACT_PREFS),
    best_time: pick(BEST_TIMES),
    housing_type: HOUSING_TYPES[index % HOUSING_TYPES.length],
    unit_type: unitType,
    gender_preference: GENDER_PREFS[index % GENDER_PREFS.length] || null,
    parking: pick(PARKING_OPTS),
    pets: petsVal,
    description: DESCRIPTIONS[index % DESCRIPTIONS.length],
    lease_type: LEASE_TYPES[index % LEASE_TYPES.length],
    security_deposit: deposit,
    price_reduction_enabled: priceReduction,
    price_reduction_days: priceReduction ? pick([7, 10, 14, 21, 30]) : null,
    price_reduction_amount: priceReduction ? pick([25, 50, 75, 100]) : null,
    price_reduction_count: priceReduction ? pick([1, 2, 3]) : null,
    photo_urls: getPhotoUrls(index),
    photos_meta: getPhotoUrls(index).map((url, i) => ({
      path: `test/${index}/${i}.jpg`,
      url,
      order: i,
      note: i === 0 ? 'Cover photo' : null
    })),
    status: 'approved',
    verified: true,
    paused: false,
    filled: false
  };
}

/* ──────────────────── PUBLIC API ──────────────────── */

/**
 * Generate and insert N test listings directly into Supabase.
 * @param {number} count  Number of listings to create (default 10)
 */
async function generateTestListings(count = 10) {
  const sb = window.sbAuth?.supabaseClient || null;

  if (!sb) {
    console.error('[gen] Supabase client not available. Make sure you are signed in on a page that loads auth.js.');
    return;
  }

  console.log(`[gen] Generating ${count} test listings...`);
  const listings = [];
  for (let i = 0; i < count; i++) {
    listings.push(buildListing(i));
  }

  // Insert in batches of 25
  const batchSize = 25;
  let inserted = 0;
  for (let i = 0; i < listings.length; i += batchSize) {
    const batch = listings.slice(i, i + batchSize);
    const { data, error } = await sb.from('listings').insert(batch);
    if (error) {
      console.error(`[gen] Batch insert error at offset ${i}:`, error.message);
      console.error('[gen] First failing row:', JSON.stringify(batch[0], null, 2));
      // Try one-by-one to find the problematic row
      for (const row of batch) {
        const { error: singleErr } = await sb.from('listings').insert([row]);
        if (singleErr) {
          console.error(`[gen] Row ${row.id} failed:`, singleErr.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log(`[gen] ✅ Done! Inserted ${inserted}/${count} test listings.`);
  console.log('[gen] Refresh the listings page to see them.');
  console.log('[gen] To clean up, run: deleteTestListings()');
  return inserted;
}

/**
 * Delete all test-generated listings (identified by _test_generated = true).
 */
async function deleteTestListings() {
  const sb = window.sbAuth?.supabaseClient || null;

  if (!sb) {
    console.error('[gen] Supabase client not available. Make sure you are signed in.');
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    console.error('[gen] Not signed in. Please sign in first.');
    return;
  }

  console.log('[gen] Deleting test listings via API (bypasses RLS)...');
  try {
    const resp = await fetch('/api/delete-test-listings', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + session.access_token,
        'Content-Type': 'application/json',
      },
    });
    const result = await resp.json();
    if (!resp.ok) {
      console.error('[gen] Delete API error:', result.error);
    } else {
      console.log(`[gen] ✅ ${result.message}`);
    }
  } catch (err) {
    console.error('[gen] Network error:', err.message);
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 Test Listing Generator loaded!');
console.log('');
console.log('  generateTestListings(20)  → create 20 listings');
console.log('  deleteTestListings()      → remove all test listings');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
