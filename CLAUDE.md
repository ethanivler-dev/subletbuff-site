# SubletBuff — Overnight Session: Landlord Dashboard

## Task
Build the landlord dashboard portal starting at `/app/landlords/portal/page.tsx`.
This is a brand new feature, fully isolated from all existing functionality.
It is gated behind an environment variable and must never be visible in production
until Ethan manually flips the flag in Vercel.

---

## HARD RULES — NEVER VIOLATE

- **NEVER** run `git push`, `git merge`, `git push origin main`, or any command that touches `main`
- **NEVER** run any Vercel CLI deploy commands (`vercel --prod`, `vercel deploy`, etc.)
- **NEVER** modify `vercel.json`, `.env.production`, or any deployment config
- **NEVER** modify files outside `/app/landlords/`, `/components/landlord/`, and `/supabase/migrations/`
- **NEVER** touch existing auth logic in `/app/auth/`
- **NEVER** modify existing listings logic in `/app/listings/`
- **NEVER** modify existing database tables — only CREATE new ones
- All work stays on the `staging` branch only
- If any action could affect production, STOP and add it to Needs Human Review
- **Never ask Ethan for permission or confirmation** — make your best judgment call, document it in Needs Human Review, and keep moving

---

## Feature Flag

This entire feature is gated behind:
```
NEXT_PUBLIC_LANDLORD_PORTAL=true
```

This flag is set to `true` in Vercel's Preview environment only. Production stays `false`.
Every new page and route must redirect to `/` if the flag is not `true`.

```tsx
if (process.env.NEXT_PUBLIC_LANDLORD_PORTAL !== 'true') {
  redirect('/')
}
```

---

## Stack & Patterns

- **Framework**: Next.js 14 App Router
- **Database**: Supabase — use the existing client in `/lib/supabase.ts`
- **Styling**: Tailwind CSS only — no new npm packages without flagging in Needs Human Review
- **Email**: Resend — do not touch existing email logic
- **Auth**: Use existing session/auth patterns — do not rewrite or modify auth
- **Reference pattern for data fetching**: follow `/app/listings/page.tsx`
- **Reference pattern for components**: follow existing component conventions in `/components/`

---

## Visual Reference

Fetch and read these URLs fully before writing any UI code.

- **https://www.buildium.com/features/** — primary layout reference
  - Left sidebar navigation
  - KPI stat cards in a row at the top of the main content area
  - Data tables below the stat cards
  - Professional, data-dense but readable

- **https://www.avail.co/landlords** — applicant review flow reference
  - Clean applicant cards
  - Clear approve/deny action buttons on each row
  - Simple status indicators

### Design Direction
- Professional and data-rich like Buildium — not minimal, not a toy
- Approachable approve/deny flow like Avail
- Left sidebar nav, stat cards row, data table below — in that order
- SubletBuff's existing Tailwind color scheme throughout
- Fully mobile responsive — sidebar collapses on mobile

---

## Phase 1 — Core Dashboard

Work through these in order. Check each box as you complete it by changing `[ ]` to `[x]`.

### Database
- [x] Create migration file: `supabase/migrations/[timestamp]_create_transfer_requests.sql`
- [x] Table `transfer_requests` with columns: `id`, `listing_id`, `landlord_id`, `applicant_name`, `applicant_email`, `unit`, `status` (enum: pending/approved/denied), `created_at`
- [x] RLS enabled on `transfer_requests` — landlords can only see rows where `landlord_id` matches their user id
- [x] Migration written but NOT auto-applied — add to Needs Human Review

### Feature Flag Gate
- [x] Every new page redirects to `/` if `NEXT_PUBLIC_LANDLORD_PORTAL !== 'true'`

### Layout & Sidebar
- [x] `/app/landlords/portal/layout.tsx` — sidebar + main content wrapper
- [x] `/components/landlord/Sidebar.tsx` — nav links: Dashboard, Listings, Transfer Requests, Settings
- [x] Active link is visually highlighted
- [x] Sidebar collapses to bottom nav or hamburger on mobile

### Stat Cards
- [x] `/components/landlord/StatCard.tsx` — reusable KPI card component
- [x] Three cards at top of dashboard: Active Listings, Pending Transfer Requests, Occupancy Rate
- [x] Each card shows label, value, and a subtle supporting detail
- [x] Occupancy Rate = active listings with tenant / total active listings

### Transfer Requests Table
- [x] `/components/landlord/TransferTable.tsx`
- [x] Columns: Applicant Name, Email, Unit, Date Submitted, Status, Actions
- [x] Status badge: yellow = pending, green = approved, red = denied
- [x] Approve button updates `status` to `approved` in Supabase
- [x] Deny button updates `status` to `denied` in Supabase
- [x] Optimistic UI update — no full page reload
- [x] `/components/landlord/EmptyState.tsx` — shown when no requests exist

### Main Page
- [x] `/app/landlords/portal/page.tsx` — assembles layout, stat cards, and transfer table
- [x] Pulls real data from Supabase
- [x] Loading state handled gracefully

---

## Phase 2 — Additional Pages

Only start after every Phase 1 box is checked.

- [x] `/app/landlords/portal/listings/page.tsx` — table of landlord's active listings with Edit button per row (Edit is a placeholder)
- [x] `/app/landlords/portal/settings/page.tsx` — landlord name, email display, notification preference toggles (UI only, no backend yet)
- [x] Add loading skeleton components to all data-fetching components
- [x] Audit every component for mobile responsiveness — fix any issues
- [x] `/components/landlord/README.md` — document every component: name, props, what it does, usage example

---

## Phase 3 — Transfer Requests Deep Dive

Only start after every Phase 2 box is checked.

- [x] `/app/landlords/portal/transfer-requests/page.tsx` — full page with filter tabs: All, Pending, Approved, Denied
- [x] Filter tabs update table without page reload
- [x] Search input filters by applicant name
- [x] Clicking a row expands inline to show full applicant detail
- [x] `/LANDLORD_FEATURE_NOTES.md` in project root — summarizes what was built, what is stubbed, what needs review before launch

---

## Allowed File Paths

```
/app/landlords/portal/page.tsx
/app/landlords/portal/layout.tsx
/app/landlords/portal/listings/page.tsx
/app/landlords/portal/settings/page.tsx
/app/landlords/portal/transfer-requests/page.tsx
/components/landlord/Sidebar.tsx
/components/landlord/StatCard.tsx
/components/landlord/TransferTable.tsx
/components/landlord/EmptyState.tsx
/components/landlord/README.md
/supabase/migrations/[timestamp]_create_transfer_requests.sql
/LANDLORD_FEATURE_NOTES.md
```

Do not create files outside these paths without noting the deviation in Needs Human Review.

---

## If You Get Stuck

1. Complete everything else on the checklist first
2. Add the blocker to Needs Human Review
3. Keep making progress on other items
4. Never stop and wait — there is always something else to work on

---

## Morning Rundown

When Ethan types "give me the rundown" respond in exactly this format:

### Current Checklist State
Reprint all three phases with current checkbox states.

### Files Created
Every new file — full path and one line describing what it does.

### Files Modified
Every modified file — full path, what changed, and why.

### Database
Every migration created and what it does.
Reminder: all migrations need manual review before applying.

### Packages Added
Any new npm packages. If none: "None added."

### Assumptions Made
Any judgment calls that deviate from this file.

### Skipped / Blocked
Anything not completed and why.

### Needs Human Review
Everything Ethan must look at before testing on staging or flipping the production flag.
