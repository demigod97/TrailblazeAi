# Story 1.3: Trailmix Import & Module Discovery

Status: done

## Story

As a user,
I want to submit a Trailmix URL and see all discovered modules with their metadata,
so that I know exactly what content will be processed.

## Acceptance Criteria

1. **Empty state URL input**: On the dashboard, when no modules exist in the database, I see a focused URL input with placeholder "Paste a Trailhead trail or module URL..." that auto-focuses on render.

2. **URL submission**: When I paste a valid Trailmix URL and press Enter, the input shows a spinner during import. `POST /api/trailmix/import` creates a run record and enumerates modules from the Trailmix page. Each discovered module is stored with: name, type, track, estimated_minutes, unit_count, and status "pending". The dashboard module list refreshes after import.

3. **URL validation**: When I paste an invalid URL (not a Trailhead URL) and submit, an inline validation error shows: "Enter a valid Trailhead URL" with a red border on the input. The input retains focus for correction.

4. **Module list display**: When modules exist in the database, the dashboard renders a list of all modules showing: module name, trail label (track field), and "queued" status badge using `var(--status-queued)` color.

5. **Import failure toast**: When the API returns an error (network failure, invalid page, parse error), a persistent toast notification appears: "Import failed — check URL". The toast persists until dismissed (Sonner error toast default behavior).

6. **Domain types verified**: `Module`, `Unit`, and `TrailMix` types in `packages/shared/src/types/trailhead.ts` use snake_case matching database columns. Verify all module fields match the `modules` table schema from migration 001.

## Tasks / Subtasks

- [x] Task 1: API route — POST /api/trailmix/import (AC: #2, #3)
  - [x] 1.1 Install `node-html-parser` in apps/api: `pnpm --filter @trailblaze/api add node-html-parser`
  - [x] 1.2 Create `apps/api/src/routes/trailmix.ts` with route plugin exporting `trailmixRoutes`
  - [x] 1.3 Add Zod body schema: `z.object({ url: z.string().url() })`. Validate URL contains `trailhead.salesforce.com` or `trailhead.com` — throw `ValidationError` if not
  - [x] 1.4 Implement `discoverModules(trailmixUrl: string): Promise<DiscoveredModule[]>` in same file that fetches the page and parses module links from HTML
  - [x] 1.5 Write test for `discoverModules()` with mocked `fetch()` and fixture HTML
  - [x] 1.6 Create `runs` record in Supabase via service role client: `{ trailmix_id: crypto.randomUUID(), status: 'active', started_at: new Date().toISOString() }`
  - [x] 1.7 For each discovered module, insert into `modules` table: `{ trailmix_id, name, url, status: 'pending', type, track, estimated_minutes, unit_count }`
  - [x] 1.8 Enqueue `scrape-module` pg-boss job for each module (using `app.pgBoss.send('scrape-module', { module_id })`)
  - [x] 1.9 Return `ApiSuccess<{ run: Run; modules: Module[] }>` with `reply.code(201).send(success({ run, modules }))`
  - [x] 1.10 Write route handler tests in `apps/api/src/routes/trailmix.test.ts` (Fastify inject, mock Supabase + pg-boss)
  - [x] 1.11 Register route in `apps/api/src/app.ts`: import `trailmixRoutes` and `await app.register(trailmixRoutes)` AFTER `bearerAuth` plugin

- [x] Task 2: Shared types verification (AC: #6)
  - [x] 2.1 Read `packages/shared/src/types/trailhead.ts` and compare `Module` interface fields against `modules` table columns from migration 001
  - [x] 2.2 Ensure `Module` has all fields: `id, trailmix_id, name, url, status, priority, badge_url, badge_earned, retry_count, type, track, estimated_minutes, unit_count, user_id, created_at, updated_at` (fix any missing or mismatched fields)
  - [x] 2.3 Add a `TrailMix` interface if missing: `{ id: string; url: string; trailmix_id: string; }` (simple shape — no DB table, just a domain concept)
  - [x] 2.4 Run `pnpm --filter @trailblaze/shared type-check` to verify types compile

- [x] Task 3: Frontend — Server Action (AC: #2, #5)
  - [x] 3.1 Create `apps/web/app/dashboard/actions.ts` with `'use server'` directive
  - [x] 3.2 Implement `importTrailmix(formData: FormData): Promise<{ modules: Module[] } | { error: string }>`
  - [x] 3.3 Extract `url` from formData, call `fetch(${process.env.VPS_API_URL}/api/trailmix/import, { method: 'POST', headers: { Authorization: Bearer ${process.env.VPS_API_SECRET}, 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })`
  - [x] 3.4 Parse response as `ApiResponse<{ run: Run; modules: Module[] }>`. If `data` is non-null, call `revalidatePath('/dashboard')` and return `{ modules: data.modules }`. If `error` is non-null, return `{ error: error.message }`
  - [x] 3.5 Handle network failures with try/catch — return `{ error: 'Import failed — check URL' }` on exception
  - [x] 3.6 Add `VPS_API_URL` and `VPS_API_SECRET` to `.env.example` with comments (server-only vars, no NEXT_PUBLIC_ prefix)

- [x] Task 4: PipelineToolbar component (AC: #1, #3, #5)
  - [x] 4.1 Install Sonner: `pnpm dlx shadcn@latest add sonner --cwd apps/web` (or add manually if shadcn CLI unavailable — see Dev Notes)
  - [x] 4.2 Add `<Toaster position="bottom-right" />` to `apps/web/app/layout.tsx` (inside `<body>`, after all other content)
  - [x] 4.3 Create `apps/web/src/components/dashboard/pipeline-toolbar.tsx` — Client Component (`'use client'`)
  - [x] 4.4 Implement URL input form: `autoFocus`, placeholder "Paste a Trailhead trail or module URL...", `required`, `type="url"`
  - [x] 4.5 Client-side validation before submit: check if value includes `trailhead.salesforce.com` or `trailhead.com`. If invalid, set error state and `return` (no server call). Show error message below input with `className="text-destructive text-sm"` and add `className="border-destructive"` to input.
  - [x] 4.6 On valid submit: call `setLoading(true)`, call `importTrailmix(formData)` server action in try/finally
  - [x] 4.7 On success: reset form, clear error — the page will refresh via `revalidatePath` from server action
  - [x] 4.8 On error: `toast.error(result.error ?? 'Import failed — check URL')` (Sonner error toast is persistent by default)
  - [x] 4.9 `finally` block: `setLoading(false)` always
  - [x] 4.10 Show spinner in submit button: `{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Import'}` from `lucide-react`
  - [x] 4.11 Write tests in `apps/web/src/components/dashboard/pipeline-toolbar.test.tsx` (see Dev Notes)

- [x] Task 5: ModuleRow component (AC: #4)
  - [x] 5.1 Create `apps/web/src/components/dashboard/module-row.tsx` — Server Component (no `'use client'`)
  - [x] 5.2 Props: `{ module: Module }` — import `Module` from `@trailblaze/shared`
  - [x] 5.3 Render: module name in `font-medium`, track in `text-sm text-muted-foreground` (trail label), and a status badge span with `style={{ color: 'var(--status-queued)' }}` showing "Queued"
  - [x] 5.4 Outer div: `className="flex items-center justify-between px-4 py-3 rounded-md border"`
  - [x] 5.5 Write tests in `apps/web/src/components/dashboard/module-row.test.tsx`

- [x] Task 6: Dashboard page update (AC: #1, #4)
  - [x] 6.1 Update `apps/web/app/dashboard/page.tsx` — Server Component (no `'use client'`)
  - [x] 6.2 Fetch modules from Supabase server-side: `const supabase = await createClient(); const { data: modules } = await supabase.from('modules').select('*').order('created_at', { ascending: false })`
  - [x] 6.3 If `modules.length === 0`: render empty state with centered `<PipelineToolbar />`
  - [x] 6.4 If modules exist: render module list — `<PipelineToolbar />` at top (for additional imports), then module list `<div className="space-y-2">` with `modules.map(m => <ModuleRow key={m.id} module={m} />)`
  - [x] 6.5 Handle Supabase fetch error gracefully — if error, show empty state (don't throw)
  - [x] 6.6 Create `apps/web/src/components/dashboard/index.ts` — barrel exports for `PipelineToolbar` and `ModuleRow`

- [x] Task 7: Type-check and test verification (AC: all)
  - [x] 7.1 Run `pnpm --filter @trailblaze/api test` — all tests pass (includes new trailmix tests)
  - [x] 7.2 Run `pnpm --filter @trailblaze/web test` — all tests pass (includes new pipeline-toolbar + module-row tests)
  - [x] 7.3 Run `pnpm type-check` — zero errors across all packages

## Dev Notes

### Current Codebase State (IMPORTANT — read before implementing)

**API — files that exist and are correct (do NOT recreate):**
- `apps/api/src/app.ts` — `buildApp()` registers: cors → rateLimit → healthRoute → bearerAuth → pgBossPlugin → errorHandlerSetup. New routes MUST be registered AFTER `bearerAuth` so they require auth.
- `apps/api/src/lib/errors.ts` — `AppError`, `ValidationError`, `NotFoundError`, `PipelineError`. Use these.
- `apps/api/src/lib/response.ts` — `success(data)` and `error(...)` helpers. Use `success({ run, modules })`.
- `apps/api/src/plugins/pg-boss.ts` — registers `app.pgBoss` (pg-boss instance). The `scrape-module` queue is already created in this plugin.
- `apps/api/src/types/api.ts` — `ApiSuccess<T>`, `ApiError`, `ApiResponse<T>` types.

**API — new file to create:**
- `apps/api/src/routes/trailmix.ts` — follow pattern from `apps/api/src/routes/health.ts`:
```typescript
import type { FastifyPluginAsync } from 'fastify';
export const trailmixRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/trailmix/import', {
    schema: {
      body: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    }
  }, async (request, reply) => { ... });
};
```

**Web — files that exist and are correct:**
- `apps/web/middleware.ts` — session validation with getClaims()
- `apps/web/src/lib/supabase/server.ts` — `createClient()` for Server Components
- `apps/web/src/lib/supabase/client.ts` — `createBrowserClient()` for Client Components
- `apps/web/src/components/layout/layout-context.ts` — `useLayout()` hook
- `apps/web/src/components/layout/three-column-shell.tsx` — accepts `sidebar` prop
- `apps/web/vitest.config.ts` — happy-dom environment, `@/*` alias resolves to `./src/*`
- All shadcn/ui components in `src/components/ui/` including `skeleton.tsx`

**Web — new files to create:**
- `apps/web/app/dashboard/actions.ts` — Server Action
- `apps/web/src/components/dashboard/pipeline-toolbar.tsx` — Client Component
- `apps/web/src/components/dashboard/module-row.tsx` — Server Component
- `apps/web/src/components/dashboard/index.ts` — barrel export

**Web — file to update:**
- `apps/web/app/dashboard/page.tsx` — replace stub content
- `apps/web/app/layout.tsx` — add `<Toaster />`

### Module Discovery Implementation (Task 1.4)

The `discoverModules` function fetches the Trailmix page and parses module links. Implement it as follows:

```typescript
interface DiscoveredModule {
  name: string;
  url: string;
  type: string | null;
  track: string | null;
  estimated_minutes: number | null;
  unit_count: number | null;
}

async function discoverModules(trailmixUrl: string): Promise<DiscoveredModule[]> {
  let html: string;
  try {
    const response = await fetch(trailmixUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrailBlazeAI/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) return [];
    html = await response.text();
  } catch {
    return [];
  }

  const { parse } = await import('node-html-parser');
  const root = parse(html);

  // Strategy 1: Look for JSON-LD structured data
  const jsonLdScript = root.querySelector('script[type="application/ld+json"]');
  if (jsonLdScript) {
    try {
      const data: unknown = JSON.parse(jsonLdScript.text);
      // Parse structured data if it has module listings
      // Return modules found in JSON-LD
    } catch { /* fall through */ }
  }

  // Strategy 2: Look for anchor tags with Trailhead module URL patterns
  const moduleLinks = root.querySelectorAll('a[href*="/modules/"], a[href*="/trails/"]');
  const seen = new Set<string>();
  const modules: DiscoveredModule[] = [];

  for (const link of moduleLinks) {
    const href = link.getAttribute('href') ?? '';
    if (!href || seen.has(href)) continue;
    seen.add(href);

    const url = href.startsWith('http') ? href : `https://trailhead.salesforce.com${href}`;
    // Extract name from link text or URL slug
    const name = link.text.trim() || href.split('/').pop()?.replace(/-/g, ' ') || 'Unknown Module';

    modules.push({
      name,
      url,
      type: null,
      track: null,
      estimated_minutes: null,
      unit_count: null,
    });
  }

  return modules;
}
```

**IMPORTANT**: If `discoverModules()` returns an empty array (JS-rendered page, fetch failure), the endpoint MUST still succeed — it creates the run record and returns it with `modules: []`. The actual module enumeration will be enhanced in Story 2.1 (Playwright). Do NOT throw an error when modules array is empty.

### Environment Variables

Add to `apps/web/.env.example` (or root `.env.example`):
```bash
# VPS API (server-only — never NEXT_PUBLIC_)
VPS_API_URL=http://localhost:3001
VPS_API_SECRET=<same value as API_BEARER_TOKEN in api .env>
```

In development, ensure `.env.local` in `apps/web/` has:
```
VPS_API_URL=http://localhost:3001
VPS_API_SECRET=<your_bearer_token_32_chars_minimum>
```

### Sonner Toast Installation

If `pnpm dlx shadcn@latest add sonner` fails, install manually:
```bash
pnpm --filter @trailblaze/web add sonner
```

Then add to layout.tsx:
```typescript
import { Toaster } from 'sonner';
// In <body>:
<Toaster position="bottom-right" />
```

In PipelineToolbar:
```typescript
import { toast } from 'sonner';
// On error:
toast.error('Import failed — check URL');
```

### PipelineToolbar Test Pattern

Tests for PipelineToolbar follow the happy-dom + @testing-library/react pattern established in Story 1.2. Mock the server action:

```typescript
vi.mock('../../../app/dashboard/actions', () => ({
  importTrailmix: vi.fn(),
}));

// Import after mock:
import { importTrailmix } from '../../../app/dashboard/actions';
```

Test cases to write:
1. Renders URL input with correct placeholder
2. Input has autoFocus attribute
3. Shows validation error when submitted with non-Trailhead URL
4. Shows spinner when loading (submit with valid URL, mock pending promise)
5. Calls `importTrailmix` on valid URL submit
6. Shows toast error when action returns `{ error: '...' }` (mock `toast.error`)

### API Test Pattern

Follow `apps/api/src/routes/health.test.ts` pattern using `app.inject()`. Mock external dependencies:

```typescript
// Mock Supabase client
vi.mock('../plugins/pg-boss.js', () => ({
  pgBossPlugin: vi.fn().mockImplementation(async (app) => {
    app.decorate('pgBoss', { send: vi.fn() });
  }),
}));

// Mock fetch for discoverModules
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  text: async () => '<html>...<a href="/modules/test-module">Test Module</a>...</html>',
});
```

Test cases to write for trailmix route:
1. Returns 401 without Bearer token
2. Returns 400 when URL is missing in body
3. Returns 400 when URL is not a Trailhead URL (e.g., `https://google.com`)
4. Returns 201 with `{ run, modules }` on valid Trailhead URL
5. Returns 201 with `{ run, modules: [] }` when discovery returns no modules
6. Calls pg-boss send for each discovered module

### Supabase Client in API Routes

The API uses a Supabase service role client. Import it from packages/db:
```typescript
import { createClient } from '@trailblaze/db';
import { config } from '../config.js';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
```

The `createClient` function from `@trailblaze/db` wraps `@supabase/supabase-js` `createClient`.

### Module Row Status Badge

The status badge for "pending" modules should display "Queued" (user-facing label for pending status). Use the CSS custom property:
```tsx
<span
  className="text-xs font-medium px-2 py-0.5 rounded-full border"
  style={{ color: 'var(--status-queued)', borderColor: 'var(--status-queued)' }}
>
  Queued
</span>
```

### Route Registration in app.ts

After `app.register(pgBossPlugin)`, add:
```typescript
import { trailmixRoutes } from './routes/trailmix.js';
// In buildApp():
await app.register(trailmixRoutes);
```

### Accessing pg-boss in Route Handler

The `pgBossPlugin` decorates the app with `app.pgBoss`. To access it in route handlers:
```typescript
import type { PgBoss } from 'pg-boss';

// In Fastify plugin type augmentation (add to route file or a .d.ts):
declare module 'fastify' {
  interface FastifyInstance {
    pgBoss: PgBoss;
  }
}

// In handler:
await app.pgBoss.send('scrape-module', { module_id: module.id });
```

The type declaration already exists in `apps/api/src/plugins/pg-boss.ts` — import the type from there if it's exported.

### TypeScript ESM Import Pattern (API only)

All imports in apps/api use `.js` extension (ESM). Next.js files do NOT:
```typescript
// In apps/api:
import { success } from '../lib/response.js';
import { ValidationError } from '../lib/errors.js';

// In apps/web (no .js extension):
import { importTrailmix } from './actions';
```

### Key Patterns from Stories 1.1 and 1.2 (Carry Forward)

1. **happy-dom for Vitest** — `apps/web/vitest.config.ts` uses `environment: 'happy-dom'`. Do NOT switch to jsdom.
2. **No `any` types** — Use `unknown` + type narrowing or Zod parsing. `vi.mocked()` instead of `(fn as any)`.
3. **Server Actions**: `'use server'` at top. `redirect()` throws — catch errors, return `{ error }` instead of throwing.
4. **`try/catch/finally`** — Always use finally to reset loading state in client components.
5. **`vi.mocked()` for TypeScript-safe mocking** — `vi.mocked(importTrailmix).mockResolvedValue(...)`.
6. **Barrel exports** — new component directories need `index.ts`.

### Alignment with Architecture

- **Decision 8 (pg-boss)**: `scrape-module` queue already created in pg-boss plugin (from Story 1.1). Enqueue via `app.pgBoss.send()`.
- **Decision 12 (Database)**: `modules.trailmix_id` is `TEXT NOT NULL` (not a UUID FK). Generate UUID for trailmix_id: `crypto.randomUUID()`.
- **Decision 10 (Auth)**: Route requires Bearer token — registered AFTER `bearerAuth` plugin. Server Action passes `VPS_API_SECRET` server-side.
- **Decision 9 (Realtime)**: Module list shown via Server Component initial render. Real-time updates deferred to Story 1.4 (`router.refresh` on Realtime events).
- **UX7**: URL input component with inline validation for Trailhead URL patterns, auto-focus on empty state.
- **UX15**: Toast notifications via Sonner — error type (persistent), bottom-right.
- **UX20**: Empty state: single actionable sentence + focused URL input.
- **AR18**: API response envelope: `ApiSuccess<T> | ApiError` with snake_case JSON.

## References

- [Source: epics.md#Story-1.3] — Acceptance criteria definition
- [Source: architecture.md#Decision-8] — pg-boss queue-per-stage: `scrape-module` queue config
- [Source: architecture.md#Decision-12] — Database schema: `modules` table columns, `trailmix_id TEXT`
- [Source: architecture.md#Decision-10] — Bearer token auth, VPS API secret pattern
- [Source: architecture.md#Implementation-Patterns] — ApiResponse envelope, AppError hierarchy, ESM imports
- [Source: architecture.md#Project-Structure] — `apps/api/src/routes/`, `apps/web/src/components/dashboard/`
- [Source: packages/db/supabase/migrations/001_core_tables.sql] — `modules`, `units`, `runs` table definitions
- [Source: packages/shared/src/types/trailhead.ts] — `Module`, `Unit`, `ModuleStatus` types
- [Source: apps/api/src/app.ts] — `buildApp()` plugin registration order
- [Source: ux-design-specification.md#UX7] — URL input component pattern
- [Source: ux-design-specification.md#UX15] — Toast notifications via Sonner
- [Source: ux-design-specification.md#UX20] — Empty state pattern
- [Source: 1-2-frontend-shell-and-authentication.md#Dev-Notes] — Package versions: next@^16, ai@^6, happy-dom test env

## Dev Agent Record

### Agent Model Used

Claude Haiku 4.5 (fast mode capable, as per environment config)

### Debug Log References

1. **Issue**: `crypto is not defined` in API route handler
   - **Resolution**: Imported `randomUUID` from 'crypto' module instead of using global `crypto.randomUUID()`

2. **Issue**: Supabase TypeScript types for dynamic table names (runs/modules)
   - **Resolution**: Cast supabase client to a simple typed interface with generic from/insert/select/single chain to avoid generated types mismatch

3. **Issue**: happy-dom test environment not recognizing inline styles via `toHaveStyle()`
   - **Resolution**: Changed tests to check `getAttribute('style').includes()` instead

### Completion Notes List

- All 47 API tests passing (13 new trailmix route tests + 34 existing)
- All 28 web tests passing (8 new pipeline-toolbar + 7 new module-row + 13 existing)
- Full type-check passes with zero errors
- Sonner toast library installed and Toaster component added to root layout
- PipelineToolbar component implements client-side URL validation before server call
- ModuleRow component displays module name, track, and queued status badge
- Dashboard page shows empty state with centered toolbar when no modules exist
- When modules exist, dashboard displays toolbar at top with module list below
- Server Action `importTrailmix` handles network failures and returns error toast on failure
- All acceptance criteria met: URL submission, validation errors, module display, import failure toast

### File List

**API (Backend):**
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/routes/trailmix.ts` (NEW - 173 lines)
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/routes/trailmix.test.ts` (NEW - 288 lines)
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/app.ts` (MODIFIED - added trailmixRoutes registration)

**Frontend (Web):**
- `/mnt/d/ailocal/TrailblazeAi/apps/web/app/dashboard/actions.ts` (NEW - 50 lines server action)
- `/mnt/d/ailocal/TrailblazeAi/apps/web/src/components/dashboard/pipeline-toolbar.tsx` (NEW - 51 lines)
- `/mnt/d/ailocal/TrailblazeAi/apps/web/src/components/dashboard/pipeline-toolbar.test.tsx` (NEW - 125 lines)
- `/mnt/d/ailocal/TrailblazeAi/apps/web/src/components/dashboard/module-row.tsx` (NEW - 24 lines)
- `/mnt/d/ailocal/TrailblazeAi/apps/web/src/components/dashboard/module-row.test.tsx` (NEW - 74 lines)
- `/mnt/d/ailocal/TrailblazeAi/apps/web/src/components/dashboard/index.ts` (NEW - barrel export)
- `/mnt/d/ailocal/TrailblazeAi/apps/web/app/dashboard/page.tsx` (MODIFIED - full rewrite with server-side fetch)
- `/mnt/d/ailocal/TrailblazeAi/apps/web/app/layout.tsx` (MODIFIED - added Toaster component)

**Configuration:**
- `/mnt/d/ailocal/TrailblazeAi/.env.example` (MODIFIED - updated VPS API variables)

**Shared:**
- No changes to `/mnt/d/ailocal/TrailblazeAi/packages/shared/src/types/trailhead.ts` (types already existed and matched requirements)
