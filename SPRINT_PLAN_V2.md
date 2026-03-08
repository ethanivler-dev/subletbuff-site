# SubletBuff Dev Sprint Plan — Claude Code Reference

## Context

SubletBuff.com is a Boulder, CO short-term housing marketplace built with **Next.js 14 (App Router)**, **Supabase**, **Tailwind CSS**, and deployed on **Vercel**.

A direct competitor — **BoulderSublet (bouldersublet.top)** — just launched targeting the exact same market. They have a polished frontend with features we're missing. They have **1 listing**. We have **8+**. Their site is pure client-side JS (Google can't index it). Ours is Next.js with SSR (Google CAN index us). We need to close their feature gaps and then pull ahead with landlord tools they don't have.

**This document is the single source of truth for what to build.** Sections 1 (SEO) and 2 (Neighborhoods) are already done. **Start at Section 3.** Work through each section in order. Ship each feature before moving to the next. Speed > perfection.

---

## Current Site Structure

```
Nav:  Browse Listings | Neighborhoods | How It Works | Safety | Post a Listing | Sign In | Sign Up
Pages:
  / ..................... Homepage with hero, date search, featured listings
  /listings ............. Browse all listings with search
  /listings/[id] ........ Individual listing detail
  /neighborhoods ........ Neighborhood guide (NEW — just shipped)
  /how-it-works ......... How it works page
  /safety ............... Safety info
  /post ................. Post a listing wizard
  /auth/login ........... Sign in
  /auth/signup .......... Sign up
  /terms ................ Terms of use
  /privacy .............. Privacy policy

Footer sections: Explore, Support
```

**Existing listing card data:** title, price, neighborhood, room type (Private Room / Full Apartment / Shared Room), move-in date, move-out date, tags (Intern-Friendly, Furnished, Pet Friendly, Move In Now, All Inclusive, Near Campus), photos.

---

## COMPLETED

- ✅ Section 1: SEO Overhaul (meta tags, sitemap, robots, JSON-LD, canonical URLs, alt tags)
- ✅ Section 2: Neighborhoods Page

---

## SPRINT 1: Close the Gaps

### 3. Clean Up Test Listings (URGENT)

Multiple live listings have the title "Testing Post a Listing Wizard." This looks unprofessional and is the first thing students see. There's also a listing at $8,100/mo (Shared Room on Ethelridge Rd) that is clearly a pricing error.

**Actions:**

Query the listings table for problem listings:
```sql
SELECT id, title, price FROM listings WHERE title ILIKE '%testing%' OR price > 5000;
```

For each listing with "Testing" in the title, update to a realistic title. Use names that match the neighborhood and room type, for example:
- "Furnished Room near Chautauqua" 
- "Private Room in Lower Chautauqua — Summer Sublet"
- "Sunny Room on University Hill"

For the $8,100/mo listing — either fix the price to something reasonable ($810/mo?) or delete it if it's test data.

Also check all listings for:
- Missing photos (placeholder/broken images)
- Empty descriptions
- Dates that have already passed
- Any other obviously fake data

> **DONE WHEN:** Every listing on /listings has a realistic title (no "Testing" anywhere), reasonable pricing (nothing over $3,000/mo for a room), and no obviously broken data. Load /listings in the browser and confirm every card looks like a real listing a student would take seriously.

---

### 4. Verified Listing Badge (HIGH)

BoulderSublet has a "Verified Buff" badge on listings. We need our own version.

**Database change:**
```sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
```

**Component — create `components/VerifiedBadge.tsx`:**
```tsx
export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium ${className}`}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      Verified
    </span>
  );
}
```

**Display in two places:**
1. **Listing cards** (`components/listings/ListingCard.tsx`): Show the badge in the top-right corner of the listing photo, overlaying the image. Only show when `listing.verified === true`.
2. **Listing detail page** (`app/listings/[id]/page.tsx`): Show the badge next to the listing title.

**Mark existing listings as verified:**
```sql
UPDATE listings SET verified = true, verified_at = now() WHERE status = 'published';
```

> **DONE WHEN:** Listing cards on /listings show a green "Verified ✓" badge overlaying the photo in the top-right corner for verified listings. The badge also appears on individual listing detail pages next to the title. Run the SQL to mark existing published listings as verified and confirm the badges appear.

---

### 5. In-Platform Messaging (HIGH)

BoulderSublet has a chat icon in their nav. We only have an inquiry form. Build basic messaging — keep it simple, no websockets needed.

**Database — new table:**
```sql
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  receiver_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast conversation lookups
CREATE INDEX idx_messages_listing_users ON messages(listing_id, sender_id, receiver_id);
CREATE INDEX idx_messages_receiver_read ON messages(receiver_id, read);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can mark messages as read"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);
```

**API Routes:**
- `GET /api/messages?listing_id=X` — Get message thread between current user and other party for a listing
- `GET /api/messages/conversations` — Get all conversations for current user, grouped by listing + other user. Return last message, unread count, listing title/photo, other user's name.
- `POST /api/messages` — Send a message. Body: `{ listing_id, receiver_id, content }`. Validate sender is authenticated and not messaging themselves.
- `PATCH /api/messages/[id]/read` — Mark message as read. Only the receiver can do this.

**UI Components to build:**

1. **Listing detail page** — Replace or supplement the inquiry form with a "Message Lister" button. When clicked, opens a simple message thread panel (inline on the page or slide-over). If not logged in, redirect to login.

2. **Message thread component** (`components/messages/MessageThread.tsx`) — Shows chronological messages between two users about a listing. Each message shows sender name, content, timestamp. Text input at bottom with send button. On send, POST to API and append the new message to the list. No websockets — just refetch or optimistically append.

3. **Conversations list page** (`app/messages/page.tsx`) — Lists all conversations for the logged-in user. Each conversation shows: listing photo thumbnail, listing title, other person's name, last message preview (truncated), timestamp, unread indicator (bold or dot). Click to open the full thread.

4. **Nav message icon** — Add a chat bubble icon to the nav bar (to the left of Sign In, only visible when logged in). Show a red unread count badge when there are unread messages.
```tsx
import { MessageSquare } from "lucide-react";

// In nav, for logged-in users:
<Link href="/messages" className="relative">
  <MessageSquare className="w-5 h-5" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
      {unreadCount}
    </span>
  )}
</Link>
```

To get the unread count, fetch on nav render:
```sql
SELECT COUNT(*) FROM messages WHERE receiver_id = auth.uid() AND read = false;
```

**Keep this simple.** No typing indicators, no read receipts, no file uploads, no real-time websockets. Just text messages between two users about a listing. Refetch on page load is fine. Polish later.

> **DONE WHEN:** 
> 1. A logged-in user can click "Message Lister" on a listing detail page and send a message.
> 2. The lister receives the message and can reply.
> 3. /messages page shows all conversations with last message preview and unread counts.
> 4. A chat bubble icon in the nav shows the unread count.
> 5. Non-logged-in users are redirected to login when trying to message.
> 6. RLS prevents users from reading other people's messages (test this in Supabase).

---

### 6. How It Works Page Update (MEDIUM)

BoulderSublet splits their How It Works into "For Students Looking" and "For Students Listing." Update our /how-it-works page to match this pattern AND add a landlord section they don't have.

**New page structure:**

```
Section 1: "For Students Looking"
  Step 1: "Browse Verified Listings"
          "Search by neighborhood, price, and dates. Every listing is verified by our team."
  Step 2: "Message the Lister" 
          "Chat directly through SubletBuff. Ask questions, request a tour, get to know them."
  Step 3: "Move In"
          "Confirm dates, sign the sublease agreement, and move in with confidence."

Section 2: "For Students Listing"
  Step 1: "Post Your Place"
          "Create a listing with photos, dates, and house rules. Free to post — always."
  Step 2: "Get Verified"
          "We verify your identity and listing. Verified listings get more visibility."
  Step 3: "Choose Your Subletter"
          "Review requests, message applicants, and pick the best fit for your place."

Section 3: "For Landlords" (OUR ADVANTAGE — BoulderSublet doesn't have this)
  Step 1: "Opt In"
          "Register your properties on SubletBuff. Free during our pilot program."
  Step 2: "Approve Subtenants"
          "Review and approve every subletter from your dashboard. One-click approve or reject."
  Step 3: "Stay in Control"
          "Auto-generated sublease agreements with your rules built in. Full visibility, zero surprises."
  CTA button: "Learn More" → links to /landlords
```

Design each section as a 3-column card layout with step numbers (1, 2, 3), icons, title, and description. Use different background colors or subtle dividers between the three sections. Match existing site styling.

> **DONE WHEN:** /how-it-works has three distinct sections: "For Students Looking" (3 steps), "For Students Listing" (3 steps), and "For Landlords" (3 steps with CTA to /landlords). Page renders correctly on mobile (stacks to 1 column). The landlord section is clearly visible and links to /landlords.

---

### 7. Homepage Updates (MEDIUM)

**7a. Add landlord CTA section below featured listings:**

```tsx
<section className="bg-gray-50 py-16">
  <div className="max-w-4xl mx-auto text-center px-4">
    <h2 className="text-2xl font-bold text-gray-900 mb-3">
      Property Managers: Fill Your Summer Vacancies
    </h2>
    <p className="text-gray-600 mb-6">
      Join Boulder landlords who use SubletBuff to manage approved summer sublets.
      Free to get started.
    </p>
    <a href="/landlords"
       className="inline-block bg-green-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-800 transition">
      Learn More
    </a>
  </div>
</section>
```

**7b. Add "Share on Facebook" button to every listing detail page:**

```tsx
<a
  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://subletbuff.com/listings/${listing.id}`)}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
>
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  Share on Facebook
</a>
```

Place this near the contact/message buttons on the listing detail page.

**7c. Update footer — add "For Landlords" section:**

Add alongside the existing Explore and Support footer columns:
```
### For Landlords
- Why SubletBuff → /landlords
- Landlord Login → /landlords/login (can link to /landlords for now)
- Contact Us → mailto:subletbuff@gmail.com
```

> **DONE WHEN:** 
> 1. Homepage has a "Property Managers: Fill Your Summer Vacancies" section below featured listings with a "Learn More" button linking to /landlords.
> 2. Every listing detail page has a "Share on Facebook" button that opens a Facebook share dialog with the listing URL.
> 3. Footer has a "For Landlords" column with 3 links.

---

### 8. Mobile Responsiveness Fixes (HIGH)

BoulderSublet appears fully responsive on mobile. Audit every page and fix issues.

**Priority fixes:**

1. **Next.js Image `sizes` prop** — Fix the misconfiguration from the original audit that serves oversized images to mobile. Every `<Image>` component should have an appropriate `sizes` attribute:
```tsx
// Listing card images:
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"

// Hero image:
sizes="100vw"

// Listing detail main image:
sizes="(max-width: 768px) 100vw, 50vw"
```

2. **Hamburger nav for mobile** — If not already implemented, add a mobile hamburger menu / drawer nav. On screens below 768px, collapse the nav links into a hamburger icon. When clicked, open a drawer/dropdown with all nav links. Include the message icon with unread count in the mobile nav.

3. **Listing cards** — Ensure they stack to 1 column on mobile (< 640px), 2 columns on tablet (640-1024px), 3 columns on desktop.

4. **Neighborhoods page** — 1 column on mobile, 2 on tablet, 3 on desktop.

5. **Forms** — All inputs on /post and the landlord contact form should be full-width on mobile.

6. **Message thread** — Thread should be full-width on mobile with proper padding. Input should not be cut off.

> **DONE WHEN:** Open every page on mobile viewport (375px width in Chrome DevTools): homepage, /listings, a listing detail page, /neighborhoods, /how-it-works, /safety, /post, /messages. All pages are fully usable with no horizontal scroll, no overlapping elements, no cut-off text, and a working hamburger nav. Images load quickly (no oversized images being served to mobile).

---

## SPRINT 2: Pull Ahead

### 9. Landlord Landing Page — `/landlords` (CRITICAL)

This is the single biggest strategic differentiator. BoulderSublet has NOTHING for landlords.

#### Route: `app/landlords/page.tsx`

This is a `'use client'` page with form interactivity and smooth scroll behavior.

**Sections to build (all on one page, in order):**

**1. Hero Section**
- Headline: "Stop Losing Money on Empty Summer Units"
- Subheadline: "SubletBuff helps Boulder landlords fill summer vacancies with verified, approved subtenants. You stay in control."
- CTA button: "Get Started Free" — smooth scrolls to the contact form (#contact)
- Secondary link: "See How It Works" — smooth scrolls to how-it-works section (#how-it-works)
- Background: Dark gradient overlay on a Boulder/Flatirons photo, or a subtle dark-to-green gradient

**2. Problem Section**
- Headline: "Your Tenants Are Already Subletting. You Just Don't Know About It."
- 3 cards in a row:
  - Card 1: Icon DollarSign (from lucide-react). Title "Lost Revenue". Text "Empty units May through August cost you thousands in lost rent while tenants sublet through Facebook and keep the money."
  - Card 2: Icon EyeOff. Title "Zero Visibility". Text "Unauthorized subtenants mean unscreened people in your property. No background checks. No lease agreement. No control."
  - Card 3: Icon ShieldAlert. Title "Liability Risk". Text "When something goes wrong with an unauthorized subtenant, you're still on the hook. Protect yourself."

**3. How It Works Section** (id="how-it-works")
- Headline: "How SubletBuff Works for Landlords"
- 3 numbered steps in a horizontal layout:
  - Step 1: "Your Tenant Requests to Sublet" — "When your tenant wants to sublet for the summer, they submit a request through SubletBuff instead of posting on Facebook."
  - Step 2: "You Review & Approve" — "See the subtenant's profile, ID verification status, and proposed dates. Approve or reject from your dashboard with one click."
  - Step 3: "Everyone's Protected" — "A sublease agreement is auto-generated with your rules built in. You maintain full visibility throughout."

**4. Features Grid**
- Headline: "Built for Property Managers"
- 6 cards in a 3x2 grid (2x3 on mobile):
  - "Approval Dashboard" — LayoutDashboard icon — "Review and manage all sublet requests in one place."
  - "Verified Subtenants" — ShieldCheck icon — "Every user is ID-verified. No anonymous strangers in your units."
  - "Auto Sublease Agreements" — FileText icon — "Colorado-compliant agreements generated automatically with your rules."
  - "Occupancy Analytics" — BarChart3 icon — "Track summer occupancy, average sublet pricing, and demand trends."
  - "Custom Rules" — Settings icon — "Set pet policies, noise rules, parking restrictions per property."
  - "Background Checks" — Search icon — "Optional background checks. Applicant-paid. Results shared with you."

**5. Social Proof Section**
- Testimonial quote (placeholder): "SubletBuff gave us visibility into summer subletting that we never had before. Instead of students going behind our backs, we now approve every subtenant." — Boulder Property Manager
- Stats row: "50+ Verified Listings" | "10+ Property Partners" | "$0 to Get Started"
- (Placeholder numbers are fine for now)

**6. Pricing Section**
- Headline: "Simple, Transparent Pricing"
- Single card: "Free Pilot Program"
- Text: "We're onboarding our first group of Boulder property managers at no cost. Full access to the landlord dashboard, approval tools, and sublease agreements."
- CTA: "Apply for Free Pilot" — scrolls to contact form
- Small text: "No credit card required. No commitment."

**7. Contact Form** (id="contact")
- Headline: "Get Started with SubletBuff"
- Form fields:
  - Full Name (text, required)
  - Company / Property Management Name (text)
  - Email (email, required)
  - Phone (tel)
  - Number of Units Managed (select: "1-10", "11-50", "51-100", "100+")
  - Message (textarea, optional, placeholder: "Tell us about your properties")
- Submit button: "Request Access"
- Use `useState` for form state and submission status
- On submit: POST to Supabase `landlord_leads` table
- Success state: Show "Thanks! We'll reach out within 24 hours to set up your free pilot."
- Error state: Show "Something went wrong. Please email us at subletbuff@gmail.com."

**Database — create table:**
```sql
CREATE TABLE landlord_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  unit_count TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE landlord_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a lead"
  ON landlord_leads FOR INSERT
  WITH CHECK (true);
```

**Nav update:** Add "For Landlords" link to the main navigation, between Safety and Post a Listing.

**Design requirements:**
- Match SubletBuff's existing design system — same fonts, Tailwind utility classes, green/earth tones
- Professional but approachable tone (not enterprise SaaS)
- Fully responsive — looks great on mobile, tablet, desktop
- Smooth scroll for CTA buttons
- Import icons from `lucide-react`

> **DONE WHEN:**
> 1. /landlords loads with all 7 sections rendering correctly.
> 2. "Get Started Free" button smooth-scrolls to the contact form.
> 3. Form submits successfully — fill it out with test data and check that a row appears in the landlord_leads table in Supabase.
> 4. Success message appears after submission.
> 5. "For Landlords" link appears in the main nav.
> 6. Page looks good on mobile (375px viewport).
> 7. Page is server-rendered (check view source — real content in the HTML, not just empty divs).

---

### 10. Saved Search Alerts (MEDIUM)

Let users save their search criteria and get emailed when matching listings appear. Neither BoulderSublet nor Facebook can do this. This is a genuine reason to create a SubletBuff account.

**Database:**
```sql
CREATE TABLE saved_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  neighborhoods TEXT[],
  min_price INTEGER,
  max_price INTEGER,
  move_in_after DATE,
  move_out_before DATE,
  room_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved searches"
  ON saved_searches FOR ALL
  USING (auth.uid() = user_id);
```

**UI:**
- On the /listings page, after the user applies filters, show a "Save this search & get alerts" button. If not logged in, prompt login first.
- When clicked, save the current filter state (neighborhoods, price range, dates, room types) to the saved_searches table.
- Show confirmation: "Saved! We'll email you when new listings match."
- Add a "Saved Searches" section in the user's profile/account page showing their active alerts with a delete button.

**Email trigger (MVP approach):**
When a new listing is inserted, use a Supabase database function or Edge Function:
```sql
-- Pseudo-logic for the trigger:
-- 1. New listing inserted
-- 2. Query saved_searches where neighborhoods overlap AND price is in range AND dates overlap
-- 3. For each match, send email notification to user_id
```

For MVP, this can be a Supabase Edge Function triggered by a database webhook on listing insert. The email can use Supabase's built-in email or a service like Resend/SendGrid.

If email integration is too complex for now, skip the email trigger and just build the save/display UI. The email trigger can be added later.

> **DONE WHEN:** 
> 1. A logged-in user on /listings can click "Save this search" after applying filters.
> 2. The saved search appears in their account/profile with a delete option.
> 3. (Stretch) New listing inserts trigger email notifications to users with matching saved searches.

---

## SPRINT 3: The Moat

### 11. Landlord Dashboard (CRITICAL)

This is the moat. BoulderSublet cannot match this without fundamentally rebuilding their product.

**Database — new tables:**
```sql
CREATE TABLE landlord_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT,
  phone TEXT,
  plan_tier TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE landlord_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords manage own profile"
  ON landlord_profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  neighborhood TEXT,
  unit_count INTEGER DEFAULT 1,
  subletting_allowed BOOLEAN DEFAULT true,
  rules_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords manage own properties"
  ON properties FOR ALL
  USING (
    landlord_id IN (SELECT id FROM landlord_profiles WHERE user_id = auth.uid())
  );

CREATE TABLE sublet_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id),
  landlord_id UUID REFERENCES landlord_profiles(id),
  subtenant_user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decision_notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ
);

ALTER TABLE sublet_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords see their requests"
  ON sublet_requests FOR SELECT
  USING (
    landlord_id IN (SELECT id FROM landlord_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Landlords can update their requests"
  ON sublet_requests FOR UPDATE
  USING (
    landlord_id IN (SELECT id FROM landlord_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Authenticated users can create requests"
  ON sublet_requests FOR INSERT
  WITH CHECK (auth.uid() = subtenant_user_id);

-- Add columns to existing listings table:
ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS landlord_approved BOOLEAN DEFAULT false;
```

**Pages to build:**

1. **`app/landlords/dashboard/page.tsx`** — Main dashboard. Shows:
   - Welcome message with company name
   - Stats cards: Total properties, Total pending requests, Approved this month, Summer occupancy rate
   - Quick links to Properties and Requests

2. **`app/landlords/dashboard/properties/page.tsx`** — Property management:
   - List of all properties with address, neighborhood, unit count, subletting status
   - "Add Property" button → form with: address, neighborhood (dropdown matching our neighborhoods list), unit count, rules text, subletting_allowed toggle
   - Edit/delete existing properties

3. **`app/landlords/dashboard/requests/page.tsx`** — Approval queue:
   - List of pending sublet requests showing: listing title, listing photo, subtenant name, proposed dates, price
   - One-click "Approve" and "Reject" buttons on each request
   - Reject button opens a small input for optional rejection notes
   - When approved: set `sublet_requests.status = 'approved'`, set `listings.landlord_approved = true`
   - Tab or filter to view approved/rejected history

**API Routes:**
- `GET /api/landlords/dashboard` — Aggregate stats for the dashboard
- `GET /api/landlords/properties` — List landlord's properties
- `POST /api/landlords/properties` — Create a new property
- `PATCH /api/landlords/properties/[id]` — Update a property (use allowlist pattern for fields)
- `DELETE /api/landlords/properties/[id]` — Delete a property
- `GET /api/landlords/requests` — List sublet requests (filterable by status)
- `POST /api/landlords/requests/[id]/approve` — Approve a request
- `POST /api/landlords/requests/[id]/reject` — Reject with optional notes

**Landlord registration flow:**
- Create `app/landlords/register/page.tsx` — Registration form for landlords: name, company, email, phone, password. On submit, create auth user + landlord_profiles entry.
- Or simpler: use existing auth + add a "Complete landlord profile" step after login that creates the landlord_profiles entry.

**"Landlord Approved" badge:**
Create a `LandlordApprovedBadge` component — distinct from the regular Verified badge. Use a different color (blue or gold) and text "Landlord Approved ✓". Show on listing cards and detail pages when `listing.landlord_approved === true`. This is a stronger trust signal than BoulderSublet's "Verified Buff" because it means the actual property owner signed off.

> **DONE WHEN:**
> 1. A landlord can register, log in, and see their dashboard at /landlords/dashboard.
> 2. They can add properties with address, neighborhood, rules, and unit count.
> 3. When a tenant creates a sublet request for one of their properties, it appears in the landlord's approval queue.
> 4. The landlord can approve or reject with one click.
> 5. Approved listings show a "Landlord Approved ✓" badge on listing cards and detail pages.
> 6. All RLS policies work correctly — landlords only see their own data.
> 7. Dashboard stats update accurately.

---

### 12. Sublease Agreement Generator (HIGH)

Auto-generate a Colorado-compliant sublease template when a sublet is approved.

**When a landlord approves a sublet request:**
1. Auto-generate a PDF sublease agreement populated with:
   - Original tenant name (from the listing creator's profile)
   - Subtenant name (from the requesting user's profile)
   - Property address (from properties table)
   - Landlord name and company (from landlord_profiles)
   - Sublease start date and end date (from the listing)
   - Monthly rent amount (from the listing)
   - Security deposit amount (default to one month's rent, editable)
   - Landlord's custom rules (from properties.rules_text)
   - Signature lines (blank for physical/digital signing)
   - Date lines

2. Store the generated PDF:
```sql
CREATE TABLE sublease_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sublet_request_id UUID REFERENCES sublet_requests(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sublease_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Involved parties can view agreement"
  ON sublease_agreements FOR SELECT
  USING (
    sublet_request_id IN (
      SELECT id FROM sublet_requests 
      WHERE landlord_id IN (SELECT id FROM landlord_profiles WHERE user_id = auth.uid())
      OR subtenant_user_id = auth.uid()
      OR listing_id IN (SELECT id FROM listings WHERE user_id = auth.uid())
    )
  );
```

3. Upload the PDF to Supabase Storage and store the URL in sublease_agreements.

**Use `@react-pdf/renderer` or `jspdf`** to generate the PDF. Keep the template simple and professional — a standard sublease format with the auto-filled fields.

**Make the PDF downloadable** from:
- The landlord's dashboard (on the approved request)
- The tenant's and subtenant's messages/account page

> **DONE WHEN:** When a landlord approves a sublet request, a PDF sublease agreement is auto-generated with all fields populated. The PDF is stored in Supabase Storage. All three parties (landlord, tenant, subtenant) can download it from their respective views.

---

### 13. Error Pages (MEDIUM)

From the original audit — still not shipped.

**`app/not-found.tsx`:**
- Friendly 404 message: "This page doesn't exist"
- Search bar to search listings
- Link: "Browse all listings" → /listings
- Link: "Go home" → /
- Match site styling

**`app/error.tsx`:**
- Client error boundary component (`'use client'`)
- Friendly message: "Something went wrong"
- "Try again" button that calls `reset()`
- Link: "Go home" → /
- Match site styling

> **DONE WHEN:** Navigating to /nonexistent-page shows a styled 404 page with a search bar and link to /listings. The error page can be tested by temporarily throwing an error in a component.

---

## Nav Update Summary

**New nav order:** Browse Listings | Neighborhoods | How It Works | Safety | For Landlords | Post a Listing | [Message Icon] | Sign In | Sign Up

On mobile: hamburger menu containing all links. Message icon with unread badge visible in mobile nav.

---

## Priority Order

1. ~~SEO overhaul~~ ✅
2. ~~Neighborhoods page~~ ✅
3. Clean test listings — **first impression**
4. Verified badge — **trust signal**
5. In-platform messaging — **closes feature gap**
6. How It Works update — **polish**
7. Homepage updates + footer — **landlord CTA + Facebook sharing**
8. Mobile responsiveness — **parity with competitor**
9. Landlord landing page — **strategic differentiator**
10. Saved search alerts — **retention**
11. Landlord dashboard — **the moat**
12. Sublease agreement generator — **transaction layer**
13. Error pages — **polish**

---

## Key Principles

- **Ship ugly, ship fast.** A live feature beats a perfect mockup. Polish later.
- **SSR everything.** Every page should render real content on the server. This is our #1 technical advantage over BoulderSublet.
- **Free for students, always.** BoulderSublet charges $99. We charge $0. This is our #1 marketing advantage.
- **Landlord tools = moat.** Neither BoulderSublet nor Facebook can offer landlord approval workflows. Build this and we win.
- **Check after each section.** Don't let multiple features pile up without verifying they work.
