# Landlord Portal — Feature Notes

## Overview
The landlord portal is a dashboard for property managers to view their listings, manage transfer requests, and track occupancy. It lives at `/landlords/portal/` and is gated behind `NEXT_PUBLIC_LANDLORD_PORTAL=true`.

## What Was Built

### Pages
- **Dashboard** (`/landlords/portal/`) — KPI stat cards (Active Listings, Pending Requests, Occupancy Rate) + recent transfer requests table
- **Listings** (`/landlords/portal/listings/`) — table of landlord's own listings with status badges. Edit button is a placeholder (disabled).
- **Transfer Requests** (`/landlords/portal/transfer-requests/`) — full-page view with filter tabs (All/Pending/Approved/Denied), search by applicant name, expandable row detail, and approve/deny actions
- **Settings** (`/landlords/portal/settings/`) — displays user name + email, notification preference toggles (UI only, no backend)

### Components
- `Sidebar` — left sidebar nav (desktop) / hamburger slide-out (mobile)
- `StatCard` — reusable KPI card with icon, label, value, detail
- `TransferTable` — data table with optimistic approve/deny
- `EmptyState` — centered empty state placeholder

### Database
- `transfer_requests` table with RLS (landlord can only see/update their own rows)
- Status enum: `pending` | `approved` | `denied`

## What Is Stubbed
- **Edit button** on listings page — disabled, placeholder only
- **Notification toggles** on settings page — UI renders but toggles are disabled and not wired to any backend
- **No email notifications** — approve/deny does not trigger any Resend emails yet

## Seed Data for Testing

Paste this into the Supabase SQL editor to create test transfer requests.
It picks the first 3 approved listings and creates pending requests for each.

```sql
-- Seed transfer requests for demo/testing
-- Uses real listing IDs from the first 3 approved listings
INSERT INTO transfer_requests (id, listing_id, landlord_id, applicant_name, applicant_email, unit, status, created_at)
SELECT
  gen_random_uuid(),
  l.id,
  COALESCE(l.lister_id, l.user_id),
  names.name,
  names.email,
  NULL,
  'pending',
  NOW() - (random() * interval '7 days')
FROM (
  SELECT id, lister_id, user_id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
  FROM listings
  WHERE status = 'approved'
  LIMIT 3
) l
JOIN (
  VALUES
    (1, 'Jordan Rivera', 'jordan.test@colorado.edu'),
    (2, 'Alex Chen', 'alex.test@colorado.edu'),
    (3, 'Sam Patel', 'sam.test@colorado.edu')
) AS names(rn, name, email) ON l.rn = names.rn;
```

---

## What Needs Review Before Launch

1. **Run the migration** — `supabase/migrations/20260312_create_transfer_requests.sql` must be executed in the Supabase SQL editor manually
2. **Set the feature flag** — add `NEXT_PUBLIC_LANDLORD_PORTAL=true` to the Vercel Preview environment (it should NOT be set in Production until ready)
3. **Auth requirements** — the portal requires an authenticated user. There is no separate "landlord" role check; any authenticated user can access the portal. Consider adding role-based access if needed.
4. **Occupancy rate** — currently calculated as `filled listings / total active listings`. Verify this matches the intended business definition.
5. **Transfer request creation** — the table and RLS allow inserts, but there is no UI for tenants or admins to create transfer requests yet. Seed data or an admin tool will be needed for testing.
