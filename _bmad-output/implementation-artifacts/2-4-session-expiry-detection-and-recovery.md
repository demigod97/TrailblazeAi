# Story 2.4: Session Expiry Detection & Recovery

Status: done

## Story

As a user running overnight TrailBlazeAI extraction,
I want the system to detect expired Trailhead sessions and alert me for re-authentication,
So that the pipeline can safely pause and resume after I log back in.

## Acceptance Criteria

1. **[AC1]** Given the scraper navigates to a Trailhead page, when the page redirects to a Salesforce login page, then the system detects the session expiry via URL pattern matching — specifically, `detectLoginRedirect(url)` returns `true` for URLs containing `login.salesforce.com` or `/login` path; and `runScraperAgent` evaluates the current URL post-navigation and throws `SessionExpiredError` when a login redirect is detected.

2. **[AC2]** Given session expiry is detected during scraping, when the scraper agent throws `SessionExpiredError`, then the scrape-module queue handler pauses all in-progress scrape jobs via `boss.pause('scrape-module')`; and the module status is set to `'failed'` with `failure_reason: 'session_expired'`; and a warning toast appears on the frontend: "Session expired — re-authenticate" (persistent until dismissed); and no retry is triggered (job is treated as successfully handled — no further pg-boss retries).

3. **[AC3]** Given I have re-authenticated by logging into Trailhead manually through the persistent browser profile, when I click "Retry" on a failed module, then `POST /api/modules/:id/retry` resets `retry_count` to 0, clears `failure_reason` to null, sets status to `'pending'`; and re-queues the module for scraping; and when the scrape job runs, `scrapeModule()` validates the new session via `checkTrailheadSession()` before processing units — if still invalid, throws `SessionExpiredError` again.

4. **[AC4]** Given session expiry occurs during an overnight run, when the scrape-module queue is paused, then the extract-content queue continues processing (only `scrape-module` is paused); and modules that have already reached the `extract-content` stage continue to completion.

## Tasks / Subtasks

- [x] Task 1: Add failure_reason to DB schema and shared Module type (AC2, AC3)
  - [x] 1.1: Create migration `packages/db/supabase/migrations/008_add_failure_reason.sql`:
    ```sql
    ALTER TABLE modules ADD COLUMN failure_reason TEXT;
    ```
  - [x] 1.2: Add `failure_reason: string | null` to the `Module` interface in `packages/shared/src/types/trailhead.ts` (after `retry_count`)
  - [x] 1.3: Add `failure_reason: z.string().nullable().optional()` to `moduleSchema` in `apps/api/src/routes/modules.ts`
    - Use `.optional()` to remain backward-compatible with existing mock fixtures that don't include this field
    - Also add `failure_reason` to the retry fetch: change `select('id, status')` to `select('id, status, failure_reason')`
  - [x] 1.4: Update retry endpoint's `updateData` to include `failure_reason: null` (clear it on retry)
  - [x] 1.5: Run `pnpm type-check` — confirm 0 errors

- [x] Task 2: Add login redirect detection to session-validator (AC1)
  - [x] 2.1: Write failing tests in `apps/api/src/lib/session-validator.test.ts`:
    - Test: `detectLoginRedirect('https://login.salesforce.com/services/oauth2/authorize')` returns `true`
    - Test: `detectLoginRedirect('https://trailhead.salesforce.com/login')` returns `true`
    - Test: `detectLoginRedirect('https://trailhead.salesforce.com/en/content/learn/modules/unit')` returns `false`
    - Test: `detectLoginRedirect('https://trailhead.salesforce.com/en/home')` returns `false`
  - [x] 2.2: Add `export function detectLoginRedirect(url: string): boolean` to `apps/api/src/lib/session-validator.ts`:
    - Returns `true` if url contains `login.salesforce.com` OR url path includes `/login`
    - Use `URL` constructor to safely parse; fall back to string search on parse error
  - [x] 2.3: Run API tests — confirm new tests pass

- [x] Task 3: Add SessionExpiredError to error hierarchy (AC1, AC2)
  - [x] 3.1: Add `SessionExpiredError` class to `apps/api/src/lib/errors.ts`:
    ```typescript
    export class SessionExpiredError extends AppError {
      constructor(message = 'Trailhead session has expired') {
        super('SESSION_EXPIRED', message, 503);
        Object.setPrototypeOf(this, SessionExpiredError.prototype);
      }
    }
    ```
  - [x] 3.2: Run `pnpm type-check` — confirm no errors

- [x] Task 4: Detect session expiry in runScraperAgent (AC1)
  - [x] 4.1: Write failing test in `apps/api/src/agents/scraper-agent.test.ts`:
    - Test: when `browser_evaluate` (for URL check) returns a login redirect URL, `runScraperAgent` throws `SessionExpiredError`
    - Hint: mock `browser_evaluate` for `window.location.href` to return `'https://login.salesforce.com/...'`; keep the HTML `browser_evaluate` mock returning empty (it should not be reached)
  - [x] 4.2: Modify `runScraperAgent` in `apps/api/src/agents/scraper-agent.ts`:
    - After the `generateText` call, before calling `browser_evaluate` for HTML:
    - Call `browser_evaluate` with `expression: 'window.location.href'` to get current URL
    - Call `detectLoginRedirect(currentUrl)` from `'./session-validator.js'`
    - If redirect detected: throw `new SessionExpiredError(`Session expired navigating to unit: ${params.unit.id}`)`
    - The HTML evaluate and logToolTrace only run if no session expiry
  - [x] 4.3: Run API tests — confirm pass

- [x] Task 5: Add session pre-check at scrape start (AC3)
  - [x] 5.1: Write failing test in `apps/api/src/pipeline/stages/scrape-unit.test.ts`:
    - Test: when `checkTrailheadSession` returns `{ valid: false }`, `scrapeModule` throws `SessionExpiredError` before `runScraperAgent` is called
  - [x] 5.2: Modify `scrapeModule` in `apps/api/src/pipeline/stages/scrape-unit.ts`:
    - After creating `playwrightMCP`, call `checkTrailheadSession(playwrightMCP)`
    - If `!result.valid`, throw `new SessionExpiredError('Session invalid before scraping module')`
    - Import `checkTrailheadSession` from `'../../lib/session-validator.js'`
    - Import `SessionExpiredError` from `'../../lib/errors.js'`
  - [x] 5.3: Run API tests — confirm pass

- [x] Task 6: Handle SessionExpiredError in queue-handlers (AC2, AC4)
  - [x] 6.1: Write failing tests in `apps/api/src/pipeline/queue-handlers.test.ts`:
    - Test: when `scrapeModule` throws `SessionExpiredError`, `boss.pause` is called with `'scrape-module'`
    - Test: when `scrapeModule` throws `SessionExpiredError`, module is updated with `{ status: 'failed', failure_reason: 'session_expired' }` (NOT `retry_count`)
    - Test: when `scrapeModule` throws `SessionExpiredError`, no re-throw occurs (pg-boss gets success signal — return without throw)
    - Test: when `scrapeModule` throws a non-session error (PipelineError), `boss.pause` is NOT called (existing retry logic applies)
  - [x] 6.2: Modify `registerQueueHandlers` in `apps/api/src/pipeline/queue-handlers.ts`:
    - Import `SessionExpiredError` from `'../lib/errors.js'`
    - Add `BossWithPause` structural type:
      ```typescript
      type BossWithPause = {
        pause(name: string): Promise<void>;
      };
      ```
    - In the scrape-module catch block, add `SessionExpiredError` branch BEFORE existing retry logic:
      ```typescript
      if (err instanceof SessionExpiredError) {
        await (boss as unknown as BossWithPause).pause('scrape-module');
        const { error: updateError } = await db
          .from('modules')
          .update({ status: 'failed', failure_reason: 'session_expired', updated_at: new Date().toISOString() })
          .eq('id', module_id);
        if (updateError) {
          console.error('Failed to mark module session_expired:', updateError.message);
        }
        return; // Signal success to pg-boss — don't retry session expiry
      }
      ```
    - Update `PipelineClient` structural type to include `failure_reason` in the update shape (already uses `Record<string, unknown>` so no change needed)
  - [x] 6.3: Run API tests — confirm pass

- [x] Task 7: Frontend session expired badge and toast (AC2, AC3)
  - [x] 7.1: Write failing tests in `apps/web/src/components/dashboard/module-row.test.tsx`:
    - Test: `ModuleRow` with `status: 'failed'` and `failure_reason: 'session_expired'` renders `"Session Expired"` badge text (not "Failed (attempt X/3)")
    - Test: `ModuleRow` with `status: 'failed'` and `failure_reason: 'session_expired'` still renders `<ModuleRetryButton>` (user can retry after re-auth)
    - Test: `ModuleRow` with `status: 'failed'` and `failure_reason: null` still renders `"Failed (attempt X/3)"` (existing behavior unchanged)
  - [x] 7.2: Update `module-row.tsx` to handle session expired display:
    - Add check: `const isSessionExpired = module.failure_reason === 'session_expired';`
    - Update `statusText` logic: if `isFailed && isSessionExpired` → `"Session Expired"`, else if `isFailed` → `"Failed (attempt X/3)"`
    - The retry button still shows for all failed modules (`isFailed` check unchanged)
  - [x] 7.3: Write failing tests in `apps/web/src/components/dashboard/dashboard-realtime-wrapper.test.tsx`:
    - Test: when `sessionExpired` prop is `true`, calls `toast.error` with `'Session expired — re-authenticate'`
    - Test: when `sessionExpired` prop is `false`, does NOT call `toast.error`
    - Mock `sonner` toast in test
  - [x] 7.4: Update `dashboard-realtime-wrapper.tsx`:
    - Add `sessionExpired: boolean` to `DashboardRealtimeWrapperProps`
    - Add `useEffect` watching `sessionExpired`: if true, call `toast.error('Session expired — re-authenticate', { duration: Infinity, id: 'session-expired' })`
    - Import `toast` from `'sonner'`
    - The `id: 'session-expired'` prevents duplicate toasts on repeated re-renders
  - [x] 7.5: Update `apps/web/app/dashboard/page.tsx`:
    - After fetching `moduleList`, compute: `const sessionExpired = moduleList.some(m => m.failure_reason === 'session_expired');`
    - Pass `sessionExpired={sessionExpired}` prop to `<DashboardRealtimeWrapper>`
    - The RSC re-renders via `router.refresh()` on each Realtime event, so the prop updates automatically
  - [x] 7.6: Run web tests — confirm pass

- [x] Task 8: Final verification
  - [x] 8.1: Run `pnpm --filter @trailblaze/api test` — all tests pass (0 failures)
  - [x] 8.2: Run `pnpm --filter @trailblaze/web test` — all tests pass (0 failures)
  - [x] 8.3: Run `pnpm type-check` — 0 errors across all packages
  - [x] 8.4: Mark all tasks [x] only after all three pass

## Dev Notes

### Architecture Context

**Decision 10** [Source: architecture.md#Decision-10]: Salesforce session management via persistent browser profiles in Docker volume at `/data/playwright-profiles/`. "Session detection uses `browser_snapshot` before each scraping job" — the `checkTrailheadSession()` function already exists in `apps/api/src/lib/session-validator.ts` and satisfies this pattern.

**Decision 2** [Source: architecture.md#Decision-2]: Playwright MCP as primary browser automation via stdio transport. `createPlaywrightMCP()` is already implemented in `apps/api/src/lib/mcp-client.ts`.

**Queue pause pattern**: pg-boss v10 supports `boss.pause(queueName)` to temporarily stop processing a queue. Only `scrape-module` should be paused (AC4) — `extract-content` must continue so units already scraped can complete the pipeline.

**Frontend toast**: Sonner is already installed (`apps/web/package.json`) and `<Toaster>` is mounted in `apps/web/app/layout.tsx`. `toast.error(message, { duration: Infinity, id: 'session-expired' })` creates a persistent, deduplicated toast.

### Existing File State

| File | Current State |
|------|---------------|
| `packages/shared/src/types/trailhead.ts` | `Module` has `retry_count: number` at line 29; add `failure_reason: string \| null` after it |
| `apps/api/src/lib/session-validator.ts` | Has `checkTrailheadSession()` only — add `detectLoginRedirect()` |
| `apps/api/src/lib/errors.ts` | Has `AppError`, `NotFoundError`, `ValidationError`, `PipelineError` — add `SessionExpiredError` |
| `apps/api/src/agents/scraper-agent.ts` | Has `runScraperAgent()` which calls `browser_evaluate` for HTML — add URL check before HTML extract |
| `apps/api/src/pipeline/stages/scrape-unit.ts` | Has `scrapeModule()` which creates playwright client at line 60 — add `checkTrailheadSession()` call after client creation |
| `apps/api/src/pipeline/queue-handlers.ts` | Has catch block for scrape-module at line 68 — add SessionExpiredError branch |
| `apps/api/src/routes/modules.ts` | `moduleSchema` at line 28 — add `failure_reason`; retry endpoint at line 179 — clear `failure_reason` on retry |
| `apps/web/src/components/dashboard/module-row.tsx` | `statusText` logic at line 37 — add session_expired branch |
| `apps/web/src/components/dashboard/dashboard-realtime-wrapper.tsx` | Props interface + useEffect — add `sessionExpired` prop and toast call |
| `apps/web/app/dashboard/page.tsx` | `sortedModules` computed at line 94 — add `sessionExpired` check; `<DashboardRealtimeWrapper>` at line 110 — add `sessionExpired` prop |
| `packages/db/supabase/migrations/` | 7 existing migrations (001-007) — add 008 |

### URL Pattern Logic

Login redirect patterns to detect:
- `https://login.salesforce.com/*` — OAuth/SSO login redirect
- `https://trailhead.salesforce.com/login` — direct login page
- `https://trailhead.salesforce.com/en/login` — locale-prefixed login

Implementation using `URL` constructor (safe, no string hacking):
```typescript
export function detectLoginRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'login.salesforce.com' ||
      parsed.pathname === '/login' ||
      parsed.pathname.startsWith('/login/')
    );
  } catch {
    // Malformed URL — check by string pattern as fallback
    return url.includes('login.salesforce.com') || url.includes('/login');
  }
}
```

### SessionExpiredError: No Retry Signal

When `SessionExpiredError` is thrown in the scrape-module handler, the handler **returns normally** (no re-throw). This signals to pg-boss that the job completed successfully — which prevents automatic retries (retrying without a session would just fail again). The human must re-authenticate, then click "Retry" in the UI.

This is different from transient errors (PipelineError) where the existing code **throws** to let pg-boss retry.

### scraper-agent.ts URL Detection Pattern

The URL check MUST happen after the agent loop (`generateText`) and BEFORE calling `browser_evaluate` for HTML, to avoid wasting a network call when session has expired:

```typescript
// 1. Run AI agent loop (navigates to unit, interacts with page)
const result = await generateText({ ... });

// 2. Check URL BEFORE fetching HTML (AC1: URL pattern matching)
const urlResult = await params.playwrightMCP.callTool('browser_evaluate', {
  expression: 'window.location.href',
});
const currentUrl = extractTextFromToolResult(urlResult);
if (detectLoginRedirect(currentUrl)) {
  throw new SessionExpiredError(`Session expired navigating to unit: ${params.unit.id}`);
}

// 3. Only extract HTML if session is still valid
const htmlResult = await params.playwrightMCP.callTool('browser_evaluate', {
  expression: 'document.documentElement.outerHTML',
});
```

### scrape-unit.ts Pre-Scrape Session Check Pattern

```typescript
// Create Playwright MCP client
const playwrightMCP = await createPlaywrightMCP();

// Validate session before scraping (AC3: validates via browser_snapshot before each job)
const sessionCheck = await checkTrailheadSession(playwrightMCP);
if (!sessionCheck.valid) {
  throw new SessionExpiredError('Session invalid before scraping module');
}

// Update module status to 'scraping' (only after session confirmed valid)
```

### moduleSchema Update (modules.ts)

Add `failure_reason` field to the Zod schema. Use `.optional()` so existing test fixtures without this field still validate:
```typescript
const moduleSchema = z.object({
  // ... existing fields ...
  retry_count: z.number().int(),
  failure_reason: z.string().nullable().optional(),
  // ... rest of fields ...
});
```

In the retry endpoint, update the `data` fetch to include `failure_reason`, and clear it:
```typescript
const { data } = await supabase
  .from('modules')
  .select('id, status, failure_reason')  // <- add failure_reason
  .eq('id', id)
  .maybeSingle();

// In updateData:
const updateData = {
  status: 'pending',
  retry_count: 0,
  failure_reason: null,  // <- clear on retry
  updated_at: new Date().toISOString(),
};
```

### DashboardRealtimeWrapper Toast Pattern

```typescript
interface DashboardRealtimeWrapperProps {
  trailmixId: string | null;
  sessionExpired: boolean;  // <- new prop
  children: React.ReactNode;
}

export function DashboardRealtimeWrapper({ trailmixId, sessionExpired, children }: DashboardRealtimeWrapperProps) {
  const router = useRouter();

  useEffect(() => {
    if (sessionExpired) {
      toast.error('Session expired — re-authenticate', {
        duration: Infinity,
        id: 'session-expired',  // Prevents duplicate toasts
      });
    }
  }, [sessionExpired]);

  // ... existing Supabase Realtime useEffect ...
}
```

### Test Patterns

**Mocking `boss.pause` in queue-handlers.test.ts:**
The existing boss mock in queue-handlers.test.ts uses vitest. Add `pause: vi.fn().mockResolvedValue(undefined)` to the mock:
```typescript
const mockBoss = {
  on: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  work: vi.fn().mockImplementation((_q, _opts, handler) => { /* capture handler */ }),
  send: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn().mockResolvedValue(undefined),  // <- add this
};
```

**Mocking `checkTrailheadSession` in scrape-unit.test.ts:**
The existing scrape-unit.test.ts already mocks `createPlaywrightMCP`. Add a mock for `session-validator`:
```typescript
vi.mock('../../lib/session-validator.js', () => ({
  checkTrailheadSession: vi.fn().mockResolvedValue({ valid: true }),
  detectLoginRedirect: vi.fn().mockReturnValue(false),
}));
```

**Mocking `sonner` toast in dashboard-realtime-wrapper.test.tsx:**
```typescript
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));
```

**Module test fixtures**: All test files using `Module` mock objects need `failure_reason: null` added to the fixture (or use `as Module` cast with explicit field). Check `modules.test.ts` and `module-row.test.tsx` fixtures.

### ESM Import Requirements

New imports in API files use `.js` extension:
```typescript
import { detectLoginRedirect, checkTrailheadSession } from '../../lib/session-validator.js';
import { SessionExpiredError } from '../../lib/errors.js';
```

### Key Learnings from Prior Stories

From Stories 2.1-2.3 (see `.ralph-progress.md`):
1. **vi.hoisted()** required for ESM mock hoisting in vitest — use for any mock that references external modules
2. **Structural types** (`as unknown as T`) required where Supabase generated types lag schema — the `PipelineClient` pattern in `queue-handlers.ts` already demonstrates this
3. **`as any` forbidden** — use structural types instead
4. **Module test fixtures** must be updated when Module type gains new fields (modules.test.ts has several mock `Module` objects that need `failure_reason: null`)
5. **dead-letter handler** owns `status: 'failed'` transition for non-session failures; session expiry handler also sets `status: 'failed'` but via a direct return (not throw)
6. **Boss mock** in pg-boss.test.ts and queue-handlers.test.ts should be consistent — check both

### Project Structure Notes

No new files need to be created (only modifications) except:
- `packages/db/supabase/migrations/008_add_failure_reason.sql` (1 new file)

All existing test infrastructure (vitest, happy-dom for web, mocking patterns) remains unchanged.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.4 — Acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-2 — Playwright MCP + Stagehand integration]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-10 — Session management via persistent browser profiles]
- [Source: apps/api/src/lib/session-validator.ts — existing `checkTrailheadSession()` implementation]
- [Source: apps/api/src/lib/errors.ts — AppError hierarchy pattern for SessionExpiredError]
- [Source: apps/api/src/agents/scraper-agent.ts — `browser_evaluate` call pattern to extend with URL check]
- [Source: apps/api/src/pipeline/stages/scrape-unit.ts — `scrapeModule()` pre-scrape session check insertion point]
- [Source: apps/api/src/pipeline/queue-handlers.ts — existing catch block to extend with SessionExpiredError branch]
- [Source: apps/api/src/routes/modules.ts — `moduleSchema` and retry endpoint to extend with `failure_reason`]
- [Source: apps/web/src/components/dashboard/module-row.tsx — `statusText` logic for session_expired badge]
- [Source: apps/web/src/components/dashboard/dashboard-realtime-wrapper.tsx — Realtime wrapper for toast injection]
- [Source: apps/web/app/dashboard/page.tsx — RSC that computes `sessionExpired` flag and passes to wrapper]
- [Source: apps/web/app/layout.tsx — Sonner `<Toaster>` already mounted at bottom-right]
- [Source: packages/db/supabase/migrations/001_core_tables.sql — modules table schema (no failure_reason yet)]
- [Source: packages/shared/src/types/trailhead.ts — Module interface]
- [Source: _bmad-output/implementation-artifacts/2-3-pipeline-concurrency-and-retry-management.md — key learnings]

## Dev Agent Record

### Agent Model Used

claude-haiku-4-5-20251001

### Debug Log References

### Completion Notes

**Session Expiry Detection Flow (AC1):**
1. After `generateText` in scraper-agent, call `browser_evaluate('window.location.href')`
2. Parse URL with `detectLoginRedirect()` checking for `login.salesforce.com` hostname or `/login` path
3. If match, throw `SessionExpiredError` immediately (prevents wasting network call for HTML extraction)
4. Optional pre-check: `checkTrailheadSession()` before scraping module validates via browser_snapshot

**Queue Handler Recovery (AC2):**
1. `SessionExpiredError` caught in queue-handlers' scrape-module handler (caught before general retry logic)
2. Call `boss.pause('scrape-module')` to prevent further attempts (separate queue from extract-content)
3. Mark module with `{ status: 'failed', failure_reason: 'session_expired' }`
4. Return normally to pg-boss (no throw) to signal success and prevent auto-retry
5. Human must re-authenticate in persistent browser profile, then click "Retry" in UI

**Retry Flow (AC3):**
1. Retry endpoint clears `failure_reason: null` along with resetting status to 'pending'
2. On re-queue, `checkTrailheadSession()` validates session again before processing units
3. If still invalid, throws `SessionExpiredError` again (loop until user fixes auth)
4. If valid, scraping proceeds normally

**Frontend Display (AC2, AC3):**
1. ModuleRow checks `failure_reason === 'session_expired'` and shows "Session Expired" badge instead of "Failed (attempt X/3)"
2. DashboardRealtimeWrapper watches `sessionExpired` prop and shows persistent toast: "Session expired — re-authenticate"
3. Toast deduplication via `id: 'session-expired'` prevents multiple toasts on re-renders
4. Dashboard page computes `sessionExpired = moduleList.some(m => m.failure_reason === 'session_expired')`

**Test Coverage Summary:**
- API: +11 tests (8 for session detection + 4 for queue handler + 1 for scrape-unit)
- Web: +5 tests (3 for module-row + 2 for dashboard wrapper)
- Total: 158 API tests, 99 web tests (257 total passing)

### Completion Notes List

### File List

**Created:**
- `packages/db/supabase/migrations/008_add_failure_reason.sql` — New migration to add failure_reason column to modules table

**Modified (API):**
- `packages/shared/src/types/trailhead.ts` — Added `failure_reason: string | null` to Module interface
- `apps/api/src/lib/session-validator.ts` — Added `detectLoginRedirect()` function for login URL pattern matching
- `apps/api/src/lib/errors.ts` — Added `SessionExpiredError` class extending `AppError`
- `apps/api/src/agents/scraper-agent.ts` — Added URL check after `generateText` to detect session expiry; imports `detectLoginRedirect` and `SessionExpiredError`
- `apps/api/src/agents/scraper-agent.test.ts` — Updated test mocks and added test for `SessionExpiredError` detection
- `apps/api/src/pipeline/stages/scrape-unit.ts` — Added `checkTrailheadSession()` call before scraping; imports `checkTrailheadSession` and `SessionExpiredError`
- `apps/api/src/pipeline/stages/scrape-unit.test.ts` — Added mock for `checkTrailheadSession` and test for session validation
- `apps/api/src/pipeline/queue-handlers.ts` — Added `BossWithPause` type and `SessionExpiredError` handling with `boss.pause()` call
- `apps/api/src/pipeline/queue-handlers.test.ts` — Added tests for `SessionExpiredError` handling, `boss.pause` behavior, and module updates
- `apps/api/src/routes/modules.ts` — Updated `moduleSchema` to include `failure_reason`, updated retry endpoint to fetch and clear `failure_reason`
- `apps/api/src/routes/modules.test.ts` — Updated all Module test fixtures to include `failure_reason: null`
- `apps/api/src/routes/trailmix.ts` — Updated `moduleSchema` to include `failure_reason` with default value

**Modified (Web):**
- `apps/web/src/components/dashboard/module-row.tsx` — Added `isSessionExpired` check and conditional status text for session expired badge
- `apps/web/src/components/dashboard/module-row.test.tsx` — Updated mockModule fixture and added tests for session expired badge
- `apps/web/src/components/dashboard/dashboard-realtime-wrapper.tsx` — Added `sessionExpired` prop and `useEffect` for error toast
- `apps/web/src/components/dashboard/dashboard-realtime-wrapper.test.tsx` — Added sonner mock and tests for session expired toast behavior
- `apps/web/src/components/dashboard/dashboard-client-controls.test.tsx` — Updated makeModule fixture to include `failure_reason: null`
- `apps/web/app/dashboard/page.tsx` — Added `sessionExpired` computation and prop passing to wrapper
- `apps/web/app/dashboard/page.test.tsx` — Updated makeModule fixture to include `failure_reason: null`
