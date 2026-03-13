# SubletBuff — Session: Full Tenant-to-Landlord Transfer Request Pipeline

## Task
Build the complete end-to-end transfer request flow:
1. Tenant submits a transfer request from a listing page
2. Landlord gets an email notification via Resend
3. Landlord approves or denies in the portal
4. Tenant gets an email back with the decision

When this session is complete, the entire transfer request lifecycle should
work from start to finish with no manual steps.

---

## HARD RULES — NEVER VIOLATE

- **NEVER** run `git push`, `git merge`, `git push origin main`, or any command that touches `main`
- **NEVER** run any Vercel CLI deploy commands (`vercel --prod`, `vercel deploy`, etc.)
- **NEVER** modify `vercel.json`, `.env.production`, or any deployment config
- All work stays on the `staging` branch only
- If any action could affect production, STOP and add it to Needs Human Review
- **Never ask Ethan for permission or confirmation** — make your best judgment call, document it in Needs Human Review, and keep moving

---

## Existing Schema — Read This Carefully

### profiles table
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id)
email TEXT
full_name TEXT
role TEXT DEFAULT 'student' -- 'student' | 'landlord' | 'admin'
phone TEXT
landlord_details JSONB
```

### transfer_requests table (already exists)
```sql
id UUID PRIMARY KEY
listing_id UUID REFERENCES listings(id)
landlord_id UUID REFERENCES auth.users(id)
applicant_name TEXT
applicant_email TEXT
unit TEXT
status TEXT DEFAULT 'pending' -- 'pending' | 'approved' | 'denied'
created_at TIMESTAMPTZ
```

### listings table (relevant columns)
```sql
id UUID
title TEXT
lister_id UUID REFERENCES auth.users(id)
rent_monthly INTEGER
room_type TEXT
neighborhood TEXT
status TEXT -- 'approved' means active/live
```

---

## Email System — Read This Carefully

All emails live in `lib/email.ts`. The pattern is:

```ts
// 1. Build HTML using wrap()
const html = wrap(`
  <h2 style="font-family:Georgia,serif;color:#B8922A;margin-top:0">Title here</h2>
  <p>Body content</p>
`)

// 2. Export a named function that calls send()
export function sendSomeEmail(email: string, name: string, ...) {
  return send(email, 'Subject line', html)
}
```

- FROM address is already set in the file — do not change it
- `wrap()` handles the outer email shell — always use it
- `isStaging` prefix on subject is handled automatically by `send()`
- Match the existing visual style: gold headings (`#B8922A`), clean body text, gold CTA buttons
- **Only ADD new functions to `lib/email.ts` — never modify existing ones**

---

## Allowed File Paths

```
lib/email.ts                                          ← ADD new functions only
app/api/transfer-requests/route.ts                    ← new API route
app/api/transfer-requests/[id]/approve/route.ts       ← approve endpoint
app/api/transfer-requests/[id]/deny/route.ts          ← deny endpoint
app/listings/[id]/RequestTransferButton.tsx           ← new client component
app/listings/[id]/TransferRequestModal.tsx            ← new modal component
components/landlord/TransferTable.tsx                 ← modify approve/deny to call API
```

Do not modify any other files without adding the deviation to Needs Human Review.

---

## Phase 1 — Email Functions

Add these four functions to `lib/email.ts`. Follow the exact same pattern
as existing functions. Never modify existing functions.

- [ ] `sendTransferRequestReceivedEmail(landlordEmail, landlordName, applicantName, listingTitle, requestId)` 
  — sent to landlord when a new request comes in
  - Subject: `"${applicantName} wants to take over your lease at "${listingTitle}""`
  - Body: applicant name, listing title, gold CTA button "Review Request →" linking to `https://subletbuff.com/landlords/portal/transfer-requests`
  - Staging uses `staging.subletbuff.com` in links

- [ ] `sendTransferRequestSubmittedEmail(applicantEmail, applicantName, listingTitle)`
  — sent to tenant confirming their request was submitted
  - Subject: `"Transfer request submitted for "${listingTitle}""`
  - Body: confirmation message, set expectations (landlord will review), no action needed

- [ ] `sendTransferRequestApprovedEmail(applicantEmail, applicantName, listingTitle)`
  — sent to tenant when landlord approves
  - Subject: `"Great news — your transfer request was approved!"`
  - Body: congratulations, next steps (contact landlord to finalize), warm tone

- [ ] `sendTransferRequestDeniedEmail(applicantEmail, applicantName, listingTitle)`
  — sent to tenant when landlord denies
  - Subject: `"Update on your transfer request for "${listingTitle}""`
  - Body: respectful decline message, encourage them to browse other listings, link to browse page

---

## Phase 2 — API Routes

### POST `/api/transfer-requests` — Submit a new request
- [ ] Create `app/api/transfer-requests/route.ts`
- [ ] Accepts: `{ listing_id, applicant_name, applicant_email, message (optional) }`
- [ ] Validates: user must be logged in, listing must exist and be active (status = 'approved')
- [ ] Looks up the listing's `lister_id` to get the landlord
- [ ] Looks up landlord's profile to get their email and name
- [ ] Inserts row into `transfer_requests` with `status = 'pending'`
- [ ] Calls `sendTransferRequestReceivedEmail` to notify landlord
- [ ] Calls `sendTransferRequestSubmittedEmail` to confirm to applicant
- [ ] Returns `{ success: true, requestId }` or error
- [ ] Force `status = 'pending'` server-side — never trust client input for status

### POST `/api/transfer-requests/[id]/approve` — Landlord approves
- [ ] Create `app/api/transfer-requests/[id]/approve/route.ts`
- [ ] Auth check: user must be logged in and must be the landlord for this request
- [ ] Updates `transfer_requests` set `status = 'approved'` where id matches and landlord_id matches auth.uid()
- [ ] Looks up applicant email and name from the request row
- [ ] Calls `sendTransferRequestApprovedEmail` to notify applicant
- [ ] Returns `{ success: true }` or error

### POST `/api/transfer-requests/[id]/deny` — Landlord denies
- [ ] Create `app/api/transfer-requests/[id]/deny/route.ts`
- [ ] Auth check: same as approve — must be the landlord for this request
- [ ] Updates `transfer_requests` set `status = 'denied'`
- [ ] Calls `sendTransferRequestDeniedEmail` to notify applicant
- [ ] Returns `{ success: true }` or error

---

## Phase 3 — Tenant-Side UI

### Request Transfer Button
- [ ] Create `app/listings/[id]/RequestTransferButton.tsx` — client component
- [ ] Shows on the listing detail page (find the existing listing detail page and add it)
- [ ] Only visible when user is logged in and is NOT the lister
- [ ] Button label: "Request Lease Transfer"
- [ ] Opens `TransferRequestModal` on click

### Transfer Request Modal
- [ ] Create `app/listings/[id]/TransferRequestModal.tsx` — client component
- [ ] Fields:
  - Full name (pre-filled from profile if available)
  - Email (pre-filled from profile if available)
  - Message to landlord (optional textarea, max 500 chars)
- [ ] On submit: POST to `/api/transfer-requests`
- [ ] Loading state on submit button
- [ ] Success state: close modal, show inline success message "Request sent! The landlord will be in touch."
- [ ] Error state: show error message inline, don't close modal
- [ ] Match existing modal/dialog patterns in the codebase if any exist

---

## Phase 4 — Wire Approve/Deny in Landlord Portal

The landlord portal's `TransferTable` currently has approve/deny buttons
but they update Supabase directly from the client. Update them to call
the new API routes instead so emails get sent.

- [ ] Modify `components/landlord/TransferTable.tsx`
- [ ] Approve button: POST to `/api/transfer-requests/[id]/approve`
- [ ] Deny button: POST to `/api/transfer-requests/[id]/deny`
- [ ] Keep optimistic UI update on success
- [ ] Show error toast/message if API call fails
- [ ] Remove direct Supabase client update — server handles it now

---

## Phase 5 — Seed Data for Testing (if time allows)

- [ ] Write a seed SQL snippet (NOT a migration — just a comment block in LANDLORD_FEATURE_NOTES.md)
  that Ethan can paste into Supabase SQL editor to create 2-3 test transfer requests
  so the landlord portal table is not empty during demo
- [ ] Seed should use real listing IDs from the listings table (query the first 3 approved listings)

---

## If You Get Stuck

1. Complete everything else on the checklist first
2. Add the blocker to Needs Human Review
3. Keep making progress — never stop and wait

---

## Morning Rundown

When Ethan types "give me the rundown" respond in exactly this format:

### Current Checklist State
Reprint all phases with current checkbox states.

### Files Created
Every new file — full path and one line describing what it does.

### Files Modified
Every modified file — full path, what changed, and why.

### Database
Any new migrations. If none: "None — existing transfer_requests table used."

### Packages Added
Any new npm packages. If none: "None added."

### Assumptions Made
Any judgment calls that deviate from this file.

### Skipped / Blocked
Anything not completed and why.

### Needs Human Review
Everything Ethan must look at before testing on staging or merging to main.
