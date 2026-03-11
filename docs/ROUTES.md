# ROUTES + FILE PURPOSES

## Canonical Naming Convention
- `listings.html` = browse/search page for many approved listings
- `listings-logic.js` = logic for `listings.html`
- `listing.html` = single listing detail page (`?id=<uuid>`)
- `listing-logic.js` = logic for `listing.html`
- `admin.html` / `admin-logic.js` = admin portal only
- `form.html` / `form-logic.js` = listing submission form only

## Routes

### Home
- URL: `/`
- File: `index.html`
- Purpose: landing page + featured listings teaser

### Listings Browse
- URL: `/listings.html`
- File: `listings.html`
- Script: `listings-logic.js?v=2026-02-23a`
- Purpose: public browse/search/filter for approved listings

### Listing Detail
- URL: `/listing.html?id=<listing_uuid>`
- File: `listing.html`
- Script: `listing-logic.js?v=2026-02-23a`
- Purpose: full detail page for a single listing

#### Admin Preview Mode
- URL: `/listing.html?id=<listing_uuid>&preview=1`
- Access: authenticated Supabase user whose `auth.uid()` exists in `public.admins`
- Behavior:
  - authorized admin: can preview pending/approved listing by id
  - non-admin/non-authenticated: shows `Not authorized`

### Admin Portal
- URL: `/admin.html`
- File: `admin.html`
- Script: `admin-logic.js?v=2026-02-23a`
- Purpose: admin moderation + edit workflow

### Submission Form
- URL: `/form.html`
- File: `form.html`
- Script: `form-logic.js`
- Purpose: listing submission workflow

### Account Dashboard
- URL: `/account.html`
- File: `account.html`
- Script: `account-logic.js`
- Purpose: signed-in user dashboard showing their listings + view statistics
- Auth: Google OAuth via Supabase (any Google account)

### Shared Auth Module
- File: `auth.js`
- Loaded on every page (index, listings, listing, form, account)
- Purpose: manages Google sign-in state in nav bar, exposes `window.sbAuth` API

## Link/Open Rules (Enforced)
- Public detail open: `/listing.html?id=<id>`
- Admin preview open (pending): `/listing.html?id=<id>&preview=1`
- Back link on detail page: `/listings.html`

## Where to Edit Nav Links
- `index.html`
- `form.html`
- `listings.html`
- `listing.html` (only back link + page-local controls)
- `account.html`

## Archive Policy
- Legacy backup files are stored in `/_archive`.
- Active app code must not reference files in `/_archive`.
