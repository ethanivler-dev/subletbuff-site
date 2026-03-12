# Landlord Portal Components

All components for the landlord dashboard feature, gated behind `NEXT_PUBLIC_LANDLORD_PORTAL=true`.

---

## `Sidebar.tsx`

**Type:** Client component (`'use client'`)

Left sidebar navigation for the landlord portal with mobile hamburger menu.

### Props
None — reads current path via `usePathname()`.

### Usage
```tsx
import { Sidebar } from '@/components/landlord/Sidebar'
// Used in /app/landlords/portal/layout.tsx
<Sidebar />
```

### Behavior
- Desktop: fixed 240px sidebar with nav links
- Mobile: hamburger button at top-left, slide-out drawer with overlay
- Active link highlighted with `bg-primary-50 text-primary-700`

---

## `StatCard.tsx`

**Type:** Server component

Reusable KPI stat card with label, value, detail text, and icon.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | Yes | Card title (e.g. "Active Listings") |
| `value` | `string \| number` | Yes | Main metric value |
| `detail` | `string` | Yes | Supporting detail text |
| `icon` | `LucideIcon` | Yes | Icon component from lucide-react |
| `iconColor` | `string` | No | Tailwind text color class (default: `text-primary-600`) |

### Usage
```tsx
import { StatCard } from '@/components/landlord/StatCard'
import { Building2 } from 'lucide-react'

<StatCard label="Active Listings" value={12} detail="3 filled" icon={Building2} />
```

### Exports
- `StatCard` — the KPI card
- `StatCardSkeleton` — loading placeholder

---

## `TransferTable.tsx`

**Type:** Client component (`'use client'`)

Data table showing transfer requests with approve/deny actions and optimistic UI updates.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `initialRequests` | `TransferRequest[]` | Yes | Array of transfer request objects |

### `TransferRequest` type
```ts
{
  id: string
  listing_id: string
  landlord_id: string
  applicant_name: string
  applicant_email: string
  unit: string | null
  status: 'pending' | 'approved' | 'denied'
  created_at: string
}
```

### Usage
```tsx
import { TransferTable } from '@/components/landlord/TransferTable'

<TransferTable initialRequests={requests} />
```

### Behavior
- Shows empty state when no requests exist
- Pending rows show Approve/Deny buttons
- Optimistic UI: status updates immediately, reverts on error
- Desktop: full table layout; Mobile: card layout

### Exports
- `TransferTable` — main table component
- `TransferRequest` — TypeScript interface (type export)
- `TransferTableSkeleton` — loading placeholder

---

## `EmptyState.tsx`

**Type:** Server component

Centered empty state with icon, title, and description.

### Props
| Prop | Type | Required | Default |
|------|------|----------|---------|
| `title` | `string` | No | "No transfer requests yet" |
| `description` | `string` | No | "When tenants submit transfer requests..." |

### Usage
```tsx
import { EmptyState } from '@/components/landlord/EmptyState'

<EmptyState title="No listings" description="Create your first listing." />
```
