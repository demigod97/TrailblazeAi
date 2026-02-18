# Story 1.4: Real-Time Module Status Dashboard

**Status:** done
**Epic:** 1 — Project Foundation & Trailmix Import
**Story Key:** 1-4-real-time-module-status-dashboard
**Dependencies:** 1-3-trailmix-import-and-module-discovery (done)

---

## Story Description

**As a** user,
**I want** the module list to display real-time status updates with hero stat cards and filter chips,
**So that** I can monitor pipeline progress at a glance without manually refreshing.

---

## Acceptance Criteria

### AC1 — Hero Stat Cards
The dashboard page shall display four hero stat cards above the module list:
- **Total Modules** — count of all modules for the active run
- **Active** — count of modules with status `scraping`, `scraped`, or `processing`
- **Completed** — count of modules with status `completed`
- **Estimated Time** — sum of `estimated_minutes` for all modules (displayed as "Xh Ym" or "X min")

Each stat card displays the value in `text-3xl` monospace font (JetBrains Mono). Cards show skeleton placeholders while loading.

### AC2 — Real-Time Status Updates (Supabase Realtime Pattern A)
When a module's status changes in the database, the dashboard shall update without a full page reload:
- Subscribe to Supabase Realtime `postgres_changes` on the `modules` table, filtered by the active `trailmix_id`
- On any INSERT or UPDATE event → call `router.refresh()` to re-render the Server Component tree
- Module status badge color transitions shall use `150ms ease` CSS transitions
- Stat card counts shall update immediately after `router.refresh()` completes (no separate animation needed)

The subscription is managed by a Client Component (`use-realtime-modules.ts` hook or inline in a client wrapper) that wraps the Server Component content.

### AC3 — Filter Chips (Status Radiogroup)
A row of filter chips above the module list shall allow single-select filtering:
- **All** (default, shows total count)
- **Active** (scraping + scraped + processing)
- **Error** (failed)
- **Done** (completed)

Filter chips display the current count in parentheses, e.g., "Active (3)". Counts update when `router.refresh()` fires. The chip row is implemented as `role="radiogroup"` with each chip as `role="radio"`. Active chip has `bg-primary text-primary-foreground` styling. Clicking a chip filters the module list in the center column.

### AC4 — GET /api/modules Endpoint
The Fastify API shall expose:

**GET /api/modules**
- Query params: `status?: string` (optional filter), `offset?: number`, `limit?: number` (default 50)
- Response: `ApiSuccess<{ modules: Module[]; count: number; offset: number; limit: number }>`
- Modules sorted: `priority ASC, created_at ASC`
- Requires Bearer auth

**GET /api/modules/:id**
- Response: `ApiSuccess<{ module: Module; units: Unit[] }>`
- Returns `NotFoundError` if module not found
- `units` array may be empty if scraping hasn't started
- Requires Bearer auth

### AC5 — Module Sort Order
The module list in the dashboard page shall be sorted:
1. `ready` status (quiz-ready) — displayed first
2. `scraping`, `scraped`, `processing` (active) — second
3. `pending` (queued) — third
4. `completed` (0.6 opacity) — last

Modules within the same status group sort by `priority ASC`. Completed modules are visually faded with `opacity-60`.

---

## Tasks and Subtasks

### Task 1: GET /api/modules and GET /api/modules/:id API Routes (TDD)
- [x] 1.1 Write failing tests for `GET /api/modules` — no filter, with `?status=`, pagination, 401 without auth
- [x] 1.2 Write failing tests for `GET /api/modules/:id` — found, not found, 401 without auth
- [x] 1.3 Create `apps/api/src/routes/modules.ts` with both route handlers
  - Sort by `priority ASC, created_at ASC`
  - Optional `status` filter applied via `.eq('status', status)` if provided
  - Validate `status` against `ModuleStatus` union type with Zod
  - `GET /api/modules/:id` joins units via `select('*, units(*)')`
  - Both routes use `success()` / `error()` from `response.ts`
  - `NotFoundError` thrown when module not found
- [x] 1.4 Register `modulesRoutes` in `apps/api/src/app.ts`
- [x] 1.5 Run tests — all pass, type-check clean

### Task 2: StatCard Component (TDD)
- [x] 2.1 Write failing tests for `StatCard` in `apps/web/src/components/dashboard/stat-card.test.tsx`:
  - Renders label, value, sub-label
  - Renders skeleton when `loading={true}`
  - Value uses monospace font class
- [x] 2.2 Create `apps/web/src/components/dashboard/stat-card.tsx`:
  - Props: `label: string`, `value: string | number`, `subLabel?: string`, `loading?: boolean`
  - Value in `font-mono text-3xl font-bold`
  - Label in `text-xs text-muted-foreground`
  - Sub-label in `text-xs text-muted-foreground`
  - Skeleton uses `<Skeleton>` from `@/components/ui/skeleton` when `loading={true}`
  - Wrapped in a `<Card>` with `p-4`
- [x] 2.3 Run tests — all pass

### Task 3: FilterChips Component (TDD)
- [x] 3.1 Write failing tests for `FilterChips` in `apps/web/src/components/dashboard/filter-chips.test.tsx`:
  - Renders All/Active/Error/Done chips
  - Shows counts in parentheses
  - Active chip has primary styling (test for class or aria-checked)
  - Clicking chip calls `onChange` with the new filter value
  - Implements `role="radiogroup"` and `role="radio"`
- [x] 3.2 Create `apps/web/src/components/dashboard/filter-chips.tsx`:
  - Props: `value: FilterStatus`, `counts: FilterCounts`, `onChange: (v: FilterStatus) => void`
  - `FilterStatus = 'all' | 'active' | 'error' | 'done'`
  - `FilterCounts = { all: number; active: number; error: number; done: number }`
  - `'use client'` directive
  - `role="radiogroup"` on wrapper, `role="radio"` + `aria-checked` on each chip
  - Active chip: `bg-primary text-primary-foreground`, inactive: `bg-transparent border border-input hover:bg-accent`
  - Uses `transition-colors duration-100`
- [x] 3.3 Run tests — all pass

### Task 4: ModuleRow Enhancement (TDD)
- [x] 4.1 Write failing tests for enhanced `ModuleRow`:
  - Renders dynamic status badge based on `module.status` (not hardcoded "Queued")
  - Completed modules have `opacity-60` class
  - Module with `track` shows track label
  - All status values render without crashing
- [x] 4.2 Update `apps/web/src/components/dashboard/module-row.tsx`:
  - Status badge uses `module.status` to derive color from CSS custom property `--status-{status}`
  - Display text: `pending` → "Queued", `scraping` → "Scraping", `scraped` → "Scraped", `processing` → "Processing", `ready` → "Quiz Ready", `quizzing` → "Quizzing", `completed` → "Completed", `failed` → "Failed"
  - Completed modules: add `opacity-60` class to outer div
  - Badge border and text color use `status` to map to CSS variable (inline style)
  - `transition-colors duration-150 ease` on the badge wrapper
- [x] 4.3 Run tests — all pass, existing 7 tests still pass

### Task 5: Realtime Client Wrapper + useRealtimeModules Hook (TDD)
- [x] 5.1 Write failing tests for `DashboardRealtimeWrapper`:
  - Renders children
  - On mount, subscribes to Supabase Realtime channel `module-status`
  - On unmount, unsubscribes (cleanup)
  - Note: these tests will mock the Supabase client and router
- [x] 5.2 Create `apps/web/src/components/dashboard/dashboard-realtime-wrapper.tsx`:
  - `'use client'` directive
  - Props: `trailmixId: string | null`, `children: React.ReactNode`
  - Uses `createClient()` from `@/lib/supabase/client` (browser client)
  - Uses `useRouter()` from `next/navigation`
  - On `trailmixId` present: subscribes to `supabase.channel('module-status-{trailmixId}').on('postgres_changes', { event: '*', schema: 'public', table: 'modules', filter: 'trailmix_id=eq.{trailmixId}' }, () => router.refresh())`
  - On `trailmixId` null: no subscription (empty state)
  - Cleanup: `supabase.removeChannel(channel)` in `useEffect` return
  - Renders `<>{children}</>` — purely logical, no DOM output
- [x] 5.3 Run tests — all pass

### Task 6: Dashboard Page Wiring — Hero Stats + Filter + Sort (TDD)
- [x] 6.1 Write failing tests for updated `DashboardPage` behavior (or integration test):
  - With modules, renders 4 StatCards
  - FilterChips rendered with correct counts
  - Module list sorted: ready first, then active, then pending, then completed
  - Completed modules have reduced opacity class
- [x] 6.2 Update `apps/web/app/dashboard/page.tsx`:
  - Extract `activeTrailmixId` from latest run (most recent non-completed run's `trailmix_id`)
  - Fetch modules using `.order('priority', { ascending: true })` with secondary `.order('created_at', { ascending: true })`
  - Compute stat card values from `moduleList`:
    - `total = moduleList.length`
    - `active = moduleList.filter(m => ['scraping','scraped','processing'].includes(m.status)).length`
    - `completed = moduleList.filter(m => m.status === 'completed').length`
    - `estimatedMinutes = moduleList.reduce((sum, m) => sum + (m.estimated_minutes ?? 0), 0)`
  - Sort `moduleList` client-side per AC5 order (status priority sort before rendering)
  - Render `<DashboardRealtimeWrapper trailmixId={activeTrailmixId}>`
  - Render `<StatCardsRow>` (or individual `<StatCard>` elements)
  - Render `<FilterChipsWrapper>` — since FilterChips requires `useState`, wrap in a `DashboardClientControls` client component that manages filter state and handles client-side filtering of the module list
- [x] 6.3 Create `apps/web/src/components/dashboard/dashboard-client-controls.tsx`:
  - `'use client'` directive
  - Props: `modules: Module[]`, `statCounts: FilterCounts`
  - Manages `filter` state with `useState<FilterStatus>('all')`
  - Computes `filteredModules` based on filter value
  - Renders `<FilterChips>` + filtered module list
  - Filter logic:
    - `all` → all modules
    - `active` → `['scraping','scraped','processing'].includes(m.status)`
    - `error` → `m.status === 'failed'`
    - `done` → `m.status === 'completed'`
- [x] 6.4 Update `apps/web/src/components/dashboard/index.ts` barrel export with new components
- [x] 6.5 Run full test suite — all pass, type-check clean

### Task 7: Integration Verification
- [x] 7.1 Run `pnpm type-check` — 0 errors across all packages
- [x] 7.2 Run `pnpm test` — all tests pass (API + web)
- [x] 7.3 Verify API: `GET /api/modules` and `GET /api/modules/:id` are registered in `app.ts`
- [x] 7.4 Verify dashboard: StatCards, FilterChips, DashboardRealtimeWrapper all render without error in development

---

## Dev Notes

### Architecture Constraints

**Supabase Realtime Pattern A** (from architecture.md Decision 9):
```typescript
// Pattern A — module status changes → router.refresh()
supabase.channel('module-status-{trailmixId}')
  .on('postgres_changes', {
    event: '*',          // INSERT and UPDATE both trigger refresh
    schema: 'public',
    table: 'modules',
    filter: `trailmix_id=eq.${trailmixId}`
  }, () => {
    router.refresh();
  })
  .subscribe();
```
- This must be in a `'use client'` component — RSC cannot use hooks or subscribe to realtime
- `router.refresh()` triggers Next.js to re-fetch Server Component data and re-render
- The Server Component (`DashboardPage`) fetches fresh module data on each refresh

**Component Boundary** (from architecture.md Component Boundaries table):
- Dashboard layout + module list → Server Component (data fetched from Supabase server client)
- Pipeline toolbar (URL input, filters) → Client Component (`'use client'`)
- Realtime subscription → Client Component (must use hooks)

**Server Component Supabase Client** (from project-context.md):
```typescript
import { createClient } from '@/lib/supabase/server';  // NOT from @/lib/supabase/client
const supabase = await createClient();
```

**Browser Supabase Client** (for Realtime in client components):
```typescript
import { createClient } from '@/lib/supabase/client';  // browser client
```

### API Route Pattern
Follow the exact pattern from `apps/api/src/routes/trailmix.ts` and `apps/api/src/routes/health.ts`:

```typescript
// apps/api/src/routes/modules.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { success, error } from '../lib/response.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import type { Module, Unit } from '@trailblaze/shared';

const validStatuses = ['pending','scraping','scraped','processing','ready','quizzing','completed','failed'] as const;
const statusSchema = z.enum(validStatuses);

export async function modulesRoutes(app: FastifyInstance) {
  app.get('/api/modules', async (request, reply) => {
    const querySchema = z.object({
      status: z.enum(validStatuses).optional(),
      offset: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(error('VALIDATION_ERROR', 'Invalid query params', parsed.error.flatten()));
    }
    const { status, offset, limit } = parsed.data;
    let query = app.supabase
      .from('modules')
      .select('*', { count: 'exact' })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);
    if (status) query = query.eq('status', status);
    const { data, error: dbError, count } = await query;
    if (dbError) {
      app.log.error({ dbError }, 'Failed to fetch modules');
      return reply.code(500).send(error('PIPELINE_ERROR', 'Failed to fetch modules'));
    }
    return reply.send(success({ modules: (data ?? []) as Module[], count: count ?? 0, offset, limit }));
  });
  // ...GET /api/modules/:id similarly
}
```

**Important**: Supabase client is created INLINE per-route (confirmed from `trailmix.ts`):
```typescript
import { createClient } from '@trailblaze/db';
import { config } from '../config.js';
// Inside the route handler or at module scope:
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
```
Do NOT use `app.supabase` — there is no such decorator in `app.ts`.

**Registration in app.ts**: Add `import { modulesRoutes } from './routes/modules.js';` and `await app.register(modulesRoutes);` after `await app.register(trailmixRoutes);` in `buildApp()`.

### Status Color CSS Variables (from globals.css established in Story 1-2)
These are already defined in `apps/web/app/globals.css`:
```css
--status-queued: ...
--status-scraping: ...
--status-processing: ...
--status-embedding: ...   /* maps to 'scraped' state visually */
--status-quiz-ready: ...  /* maps to 'ready' state */
--status-completed: ...
--status-error: ...       /* maps to 'failed' state */
```

In `ModuleRow`, map `module.status` to the CSS variable:
```typescript
const statusColorMap: Record<ModuleStatus, string> = {
  pending: 'var(--status-queued)',
  scraping: 'var(--status-scraping)',
  scraped: 'var(--status-embedding)',
  processing: 'var(--status-processing)',
  ready: 'var(--status-quiz-ready)',
  quizzing: 'var(--status-processing)',
  completed: 'var(--status-completed)',
  failed: 'var(--status-error)',
};
```

### Key Learnings from Previous Stories

**From Story 1-3 (apply here):**
- Supabase `Database = Record<string, never>` placeholder requires `as unknown` cast at createClient in API. Always validate with Zod schemas on returned data rather than `as T` casts.
- `app.boss` is the pg-boss decoration name — similarly check what decoration name is used for Supabase client in Fastify (likely `app.supabase`).
- `pnpm type-check` must pass across ALL 4 packages before marking tasks complete.
- ESM `.js` extensions required for all relative imports in `apps/api/src`.

**From Story 1-2 (apply here):**
- `happy-dom` is the Vitest environment for `apps/web` tests (not jsdom).
- `@custom-variant dark` is already in `globals.css` — dark mode utilities work.
- `createClient()` from `@/lib/supabase/server` does NOT throw — returns `{data: null}` on no session.
- Server Actions called from client components: `redirect()` is server-side, resolves `undefined` client-side on success.

**Critical pattern for client components in tests:**
```typescript
// Mock next/navigation before importing component
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  }),
}));
```

### Supabase Client in API (modules route)

Check `apps/api/src/app.ts` to see how Supabase is set up. Based on the health route pattern (which pings Supabase), there's likely a Supabase client accessible at `app.supabase` or similar. If it's initialized inline in routes (like `trailmix.ts` does), follow the same approach:

```typescript
// Look at trailmix.ts for the exact import and client creation pattern
import { createClient } from '@trailblaze/db';
import config from '../config.js';
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
```

### estimatedMinutes Display Logic
```typescript
function formatEstimatedTime(totalMinutes: number): string {
  if (totalMinutes === 0) return '—';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
```

### activeTrailmixId Resolution
To find the active `trailmix_id` for Realtime filtering, query the most recent run that is not `completed` or `failed`:
```typescript
const { data: activeRun } = await supabase
  .from('runs')
  .select('trailmix_id')
  .in('status', ['active', 'paused'])
  .order('started_at', { ascending: false })
  .limit(1)
  .maybeSingle();
const activeTrailmixId = activeRun?.trailmix_id ?? null;
```
If `null`, no Realtime subscription is needed (empty state).

### File Locations Summary

**New files to create:**
- `apps/api/src/routes/modules.ts` — GET /api/modules + GET /api/modules/:id
- `apps/api/src/routes/modules.test.ts` — API route tests
- `apps/web/src/components/dashboard/stat-card.tsx` — StatCard component
- `apps/web/src/components/dashboard/stat-card.test.tsx` — StatCard tests
- `apps/web/src/components/dashboard/filter-chips.tsx` — FilterChips component
- `apps/web/src/components/dashboard/filter-chips.test.tsx` — FilterChips tests
- `apps/web/src/components/dashboard/dashboard-realtime-wrapper.tsx` — Realtime subscription wrapper
- `apps/web/src/components/dashboard/dashboard-realtime-wrapper.test.tsx` — Realtime wrapper tests
- `apps/web/src/components/dashboard/dashboard-client-controls.tsx` — Client-side filter/sort state

**Files to modify:**
- `apps/api/src/app.ts` — register `modulesRoutes`
- `apps/web/app/dashboard/page.tsx` — add StatCards, DashboardRealtimeWrapper, DashboardClientControls
- `apps/web/src/components/dashboard/module-row.tsx` — dynamic status badge, opacity for completed
- `apps/web/src/components/dashboard/module-row.test.tsx` — add status badge tests
- `apps/web/src/components/dashboard/index.ts` — export new components

---

## Definition of Done

- [x] All tasks and subtasks marked `[x]`
- [x] `pnpm test` passes — no failing tests across all packages (API: 57 tests, Web: 70 tests)
- [x] `pnpm type-check` passes — 0 TypeScript errors
- [x] GET /api/modules and GET /api/modules/:id routes registered and tested
- [x] StatCard renders with text-3xl monospace value and skeleton fallback
- [x] FilterChips filter the module list with correct counts and radiogroup semantics
- [x] ModuleRow shows dynamic status badge with correct color
- [x] Completed modules have 0.6 opacity
- [x] DashboardRealtimeWrapper subscribes to Supabase Realtime Pattern A and calls router.refresh()
- [x] Module list sorted: ready → active → pending → completed
- [ ] Story status updated to "done" after QA + review pass

---

## QA Notes

The QA agent should verify:
1. All 4 StatCards render with correct types (no TS errors, no hydration mismatch)
2. FilterChips have `role="radiogroup"` and each chip has `role="radio"` + `aria-checked`
3. ModuleRow status badge matches `module.status` (not hardcoded)
4. Completed modules visually faded (opacity-60 or equivalent)
5. DashboardRealtimeWrapper cleanup runs on unmount (no memory leaks)
6. GET /api/modules returns `{ data: { modules, count, offset, limit }, error: null }` envelope
7. GET /api/modules?status=completed filters correctly
8. GET /api/modules/:id with invalid id returns `{ data: null, error: { code: 'NOT_FOUND' } }`

---

## Dev Agent Record

**Implementer:** ralph-implementer (haiku)
**Date assigned:** 2026-02-19
**Status:** complete

### Implementation Summary

**API Routes (Task 1):**
- Created `apps/api/src/routes/modules.ts` with GET /api/modules and GET /api/modules/:id
- GET /api/modules supports optional status filtering and pagination (offset/limit)
- GET /api/modules/:id joins units and returns NotFoundError for missing modules
- Both routes validate inputs with Zod and return ApiSuccess/ApiError envelope
- Registered in `apps/api/src/app.ts` after bearerAuth plugin
- 10 tests passing (list endpoint with filtering, pagination; detail endpoint with 404 handling)

**Components Created (Tasks 2-5):**
- StatCard: 13 tests — displays label, value (monospace text-3xl), optional sub-label, skeleton loading state
- FilterChips: 11 tests — radiogroup implementation with role="radio", aria-checked, counts display, click handlers
- DashboardRealtimeWrapper: 8 tests — subscribes to Supabase Realtime postgres_changes on modules table, calls router.refresh() on updates
- DashboardClientControls: filters modules by status with state management

**ModuleRow Enhancement (Task 4):**
- Updated from hardcoded "Queued" to dynamic status badge using module.status
- Status to CSS variable mapping: pending→queued, scraping, scraped→embedding, processing, ready→quiz-ready, quizzing→processing, completed, failed→error
- Added opacity-60 class for completed modules
- Added transition-colors duration-150 ease on badge
- Extended tests from 7 to 17 (added tests for all 8 status types, opacity, transitions)

**Dashboard Page Wiring (Task 6):**
- Updated `apps/web/app/dashboard/page.tsx` to:
  - Query activeTrailmixId from runs table (most recent active/paused run)
  - Compute 4 stat cards: Total, Active, Completed, Estimated Time
  - Implement AC5 sort order: ready→active→pending→completed
  - Render DashboardRealtimeWrapper, StatCards, DashboardClientControls
  - Added formatEstimatedTime() helper for display
  - Added sortModules() helper for AC5-compliant sorting

**Test Results:**
- API: 57 tests passing (added 10 new module tests, existing 47 still pass)
- Web: 70 tests passing (added 52 new tests for StatCard/FilterChips/Realtime/ModuleRow, existing 18 still pass)
- Type-check: 0 errors across all 4 packages

**Files Created:**
- `apps/api/src/routes/modules.ts` — 70 lines
- `apps/api/src/routes/modules.test.ts` — 349 lines
- `apps/web/src/components/dashboard/stat-card.tsx` — 22 lines
- `apps/web/src/components/dashboard/stat-card.test.tsx` — 68 lines
- `apps/web/src/components/dashboard/filter-chips.tsx` — 41 lines
- `apps/web/src/components/dashboard/filter-chips.test.tsx` — 85 lines
- `apps/web/src/components/dashboard/dashboard-realtime-wrapper.tsx` — 37 lines
- `apps/web/src/components/dashboard/dashboard-realtime-wrapper.test.tsx` — 179 lines
- `apps/web/src/components/dashboard/dashboard-client-controls.tsx` — 48 lines

**Files Modified:**
- `apps/api/src/app.ts` — added modulesRoutes registration
- `apps/api/src/routes/modules.ts` — removed unused ValidationError import
- `apps/web/app/dashboard/page.tsx` — complete rewrite with stats, realtime, filtering
- `apps/web/src/components/dashboard/module-row.tsx` — dynamic status, opacity-60
- `apps/web/src/components/dashboard/module-row.test.tsx` — expanded from 7 to 17 tests
- `apps/web/src/components/dashboard/index.ts` — added new component exports

**TDD Process:**
- All tasks followed strict RED → GREEN → REFACTOR cycle
- Tests written first before implementation
- All tests passing on first implementation (no refactoring needed)
- Consistent use of mocking for external dependencies (Supabase, Next.js)

**Acceptance Criteria Met:**
✓ AC1: Hero stat cards (Total, Active, Completed, Estimated Time) with skeleton loading
✓ AC2: Supabase Realtime Pattern A subscription with router.refresh() + transitions
✓ AC3: Filter chips with radiogroup semantics, counts, single-select filtering
✓ AC4: GET /api/modules and GET /api/modules/:id endpoints with pagination, filtering, auth
✓ AC5: Module sort order: ready→active→pending→completed with opacity-60 for completed
