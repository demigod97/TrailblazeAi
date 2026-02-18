# Story 2.3: Pipeline Concurrency & Retry Management

Status: done

## Story

As an operator running TrailBlazeAI content extraction,
I want the pipeline to enforce concurrency limits, retry transient failures with exponential backoff, and surface permanently failed modules with a retry option,
so that the system recovers automatically from transient errors and clearly identifies permanently failed modules for manual intervention.

## Acceptance Criteria

1. scrape-module processes at most 2 jobs concurrently; extract-content processes at most 5 jobs concurrently — verified by integration tests confirming worker registration with correct `teamSize` values.
2. Failed scrape-module jobs retry up to 3 times with exponential backoff; current retry attempt count is tracked in `modules.retry_count` and visible on the module dashboard row.
3. After all retries are exhausted: job moves to the dead-letter queue (`dead-letter-scrape-module`), module status is set to `'failed'`, dashboard shows `"Failed (attempt 3/3)"` error badge and a `"Retry"` button. Clicking `"Retry"` calls `POST /api/modules/:id/retry`, which resets `retry_count` to 0, sets status to `'pending'`, and re-enqueues the module.
4. pg-boss queues are created with stage-specific retry config: `scrape-module (retryLimit: 3, retryBackoff: true, expireInHours: 1)` and `extract-content (retryLimit: 2, retryBackoff: true, expireInHours: 0.5)` — verified by integration tests confirming `createQueue` is called with these params.

## Tasks / Subtasks

- [x] Task 1: Write integration tests for existing concurrency and queue configuration (AC: 1, 4)
  - [x] 1.1: Write test in `queue-handlers.test.ts`: `registerQueueHandlers` calls boss.work with `{ teamSize: 2, teamConcurrency: 2 }` for `scrape-module`
  - [x] 1.2: Write test in `queue-handlers.test.ts`: `registerQueueHandlers` calls boss.work with `{ teamSize: 5, teamConcurrency: 5 }` for `extract-content`
  - [x] 1.3: Write test in `pg-boss.test.ts` (new file): plugin calls `boss.createQueue('scrape-module', { retryLimit: 3, retryBackoff: true, expireInHours: 1 })`
  - [x] 1.4: Write test in `pg-boss.test.ts`: plugin calls `boss.createQueue('extract-content', { retryLimit: 2, retryBackoff: true, expireInHours: 0.5 })`
  - [x] 1.5: Run `pnpm --filter @trailblaze/api test` — all pass (existing + new tests)

- [x] Task 2: Track retry_count in scrape-module worker on transient failures (AC: 2)
  - [x] 2.1: Write failing test: when scrape-module catch fires, `modules.update` is called with `retry_count` equal to `job.retryCount` (NOT `status: 'failed'` — only retry_count)
  - [x] 2.2: Extend the `BossWithWork` structural type and job callback type to expose `retryCount: number` on the job object
  - [x] 2.3: Update the scrape-module catch block to call `db.from('modules').update({ retry_count: job.retryCount, updated_at: ... })` — REMOVE the `status: 'failed'` update (dead letter handler owns that transition)
  - [x] 2.4: Run tests — all pass

- [x] Task 3: Implement dead-letter-scrape-module handler for permanent failures (AC: 3)
  - [x] 3.1: Write failing test: registering handlers includes a `dead-letter-scrape-module` worker
  - [x] 3.2: Write failing test: `dead-letter-scrape-module` handler updates module `status: 'failed'` and `retry_count: SCRAPE_MODULE_RETRY_LIMIT` (3)
  - [x] 3.3: Add `const SCRAPE_MODULE_RETRY_LIMIT = 3` constant at top of `queue-handlers.ts`
  - [x] 3.4: Register `dead-letter-scrape-module` worker in `registerQueueHandlers` — handler reads `module_id` from job data, updates `{ status: 'failed', retry_count: SCRAPE_MODULE_RETRY_LIMIT, updated_at: now }`
  - [x] 3.5: Run tests — all pass

- [x] Task 4: Add POST /api/modules/:id/retry endpoint (AC: 3)
  - [x] 4.1: Write failing test: `POST /api/modules/:id/retry` returns 200 when module.status is `'failed'`, resets `retry_count: 0`, sets `status: 'pending'`, sends `scrape-module` job
  - [x] 4.2: Write failing test: returns 400 with `VALIDATION_ERROR` when module.status is not `'failed'`
  - [x] 4.3: Write failing test: returns 404 with `NOT_FOUND` when module does not exist
  - [x] 4.4: Implement the retry endpoint in `apps/api/src/routes/modules.ts` using `app.boss.send('scrape-module', { module_id: id, run_id: null })`
  - [x] 4.5: Run tests — all pass

- [x] Task 5: Add ModuleRow error badge and Retry button in frontend (AC: 3)
  - [x] 5.1: Write failing test: `ModuleRow` with `status: 'failed'` and `retry_count: 3` renders `"Failed (attempt 3/3)"`
  - [x] 5.2: Write failing test: `ModuleRow` with `status: 'failed'` renders a `"Retry"` button
  - [x] 5.3: Write failing test: `ModuleRow` with non-failed status does NOT render a `"Retry"` button
  - [x] 5.4: Add `retryModule(moduleId: string)` Server Action to `apps/web/app/dashboard/actions.ts` — calls `POST ${VPS_API_URL}/api/modules/:id/retry` with Bearer auth, calls `revalidatePath('/dashboard')` on success
  - [x] 5.5: Create `apps/web/src/components/dashboard/module-retry-button.tsx` — Client Component (`'use client'`) with `onClick` that calls the `retryModule` Server Action; shows loading state
  - [x] 5.6: Update `apps/web/src/components/dashboard/module-row.tsx` — when `module.status === 'failed'`, show `"Failed (attempt {retry_count}/{SCRAPE_MODULE_RETRY_LIMIT})"` badge and render `<ModuleRetryButton moduleId={module.id} />`
  - [x] 5.7: Write test for `retryModule` Server Action: calls correct VPS URL with Bearer auth on success
  - [x] 5.8: Run `pnpm --filter @trailblaze/web test` — all pass

- [x] Task 6: Full test suite verification
  - [x] 6.1: Run `pnpm test` from repo root — all packages pass
  - [x] 6.2: Run `pnpm type-check` — zero errors

## Dev Notes

### Key Insight: AC1 and AC4 Already Implemented

**DO NOT re-implement** — built during Stories 2.1/2.2:
- **AC1 (Concurrency)**: `apps/api/src/pipeline/queue-handlers.ts:32-84` registers scrape-module with `{ teamSize: 2, teamConcurrency: 2 }` and extract-content with `{ teamSize: 5, teamConcurrency: 5 }`
- **AC4 (Queue config)**: `apps/api/src/plugins/pg-boss.ts:25-33` creates all 7 queues with `retryLimit`/`retryBackoff`/`expireInHours`

Tasks 1.1-1.5 write **tests to verify** this existing behavior, not new implementation. Make these tests pass by reading the existing code and asserting the right mock calls.

### DB Schema: retry_count Already Exists

`modules.retry_count integer` is already in the DB — confirmed in:
- `packages/shared/src/types/trailhead.ts:29` — `retry_count: number`
- `apps/api/src/routes/modules.ts:28` — `retry_count: z.number().int()`

No DB migration needed. The column exists and is already served by GET /api/modules.

### Job Type Extension Required for Task 2

The current structural type in `queue-handlers.ts` exposes only `{ data: unknown }` on the job. Extend it to include `retryCount`:

```typescript
// BEFORE:
type BossWithWork = {
  work(
    queue: string,
    options: { teamSize: number; teamConcurrency: number },
    handler: (job: { data: unknown }) => Promise<void>,
  ): Promise<void>;
};

// AFTER:
type BossJob = {
  data: unknown;
  retryCount: number;
};

type BossWithWork = {
  work(
    queue: string,
    options: { teamSize: number; teamConcurrency: number },
    handler: (job: BossJob) => Promise<void>,
  ): Promise<void>;
};
```

Update the handler callbacks from `job: { data: unknown }` to `job: BossJob`.

### Dead Letter Queue Pattern (Architecture Decision 8)

Per architecture, dead letter queues are named `dead-letter-{queue-name}`. pg-boss automatically routes jobs that have exhausted all retries to the dead letter queue.

Register the dead letter worker using the same `boss.work()` call pattern:

```typescript
// Dead letter handler — fires after all retryLimit retries exhausted
await (boss as unknown as BossWithWork).work(
  'dead-letter-scrape-module',
  { teamSize: 1, teamConcurrency: 1 },
  async (job: BossJob) => {
    const { module_id } = job.data as { module_id: string; run_id: string | null };
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    const db = supabase as unknown as PipelineClient;
    await db.from('modules').update({
      status: 'failed',
      retry_count: SCRAPE_MODULE_RETRY_LIMIT,
      updated_at: new Date().toISOString(),
    }).eq('id', module_id);
  },
);
```

### Catch Block Fix (Task 2.3)

The current catch block in the scrape-module handler:
```typescript
// CURRENTLY (WRONG — sets 'failed' on transient failures):
await db.from('modules').update({ status: 'failed', updated_at: ... }).eq('id', module_id);
throw err;

// SHOULD BE (right — only tracks retry_count, dead letter owns 'failed' transition):
await db.from('modules').update({ retry_count: job.retryCount, updated_at: ... }).eq('id', module_id);
throw err; // pg-boss will retry
```

### Retry Endpoint Implementation

The retry endpoint needs `app.boss` for re-enqueueing. The `modulesRoutes` plugin registers after `pgBossPlugin` (see `apps/api/src/app.ts`), so `app.boss` is available via Fastify decoration.

```typescript
// POST /api/modules/:id/retry
app.post<{ Params: { id: string }; Reply: ApiResponse<{ module_id: string }> }>(
  '/api/modules/:id/retry',
  async (request, reply) => {
    const { id } = request.params;
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

    // Fetch and validate module exists and is in 'failed' status
    const { data, error: dbError } = await supabase
      .from('modules')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (dbError || !data) throw new NotFoundError('Module', id);
    if (data.status !== 'failed') {
      return reply.code(400).send(error('VALIDATION_ERROR', 'Module is not in failed state'));
    }

    // Reset and re-enqueue
    await supabase.from('modules').update({
      status: 'pending',
      retry_count: 0,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    await app.boss.send('scrape-module', { module_id: id, run_id: null });

    return reply.send(success({ module_id: id }));
  },
);
```

### Frontend Pattern: Server Action + Client Component

The web app uses Server Actions for API calls (confirmed in `apps/web/app/dashboard/actions.ts`). The retry button follows the same pattern as the import toolbar.

**`apps/web/app/dashboard/actions.ts`** — add:
```typescript
export async function retryModule(moduleId: string): Promise<{ success: true } | { error: string }> {
  const vpsApiUrl = process.env.VPS_API_URL;
  const vpsApiSecret = process.env.VPS_API_SECRET;
  if (!vpsApiUrl || !vpsApiSecret) {
    return { error: 'Server configuration error' };
  }
  try {
    const response = await fetch(`${vpsApiUrl}/api/modules/${moduleId}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vpsApiSecret}` },
    });
    if (!response.ok) return { error: 'Retry failed' };
    revalidatePath('/dashboard');
    return { success: true };
  } catch {
    return { error: 'Retry failed' };
  }
}
```

**`module-retry-button.tsx`** (new Client Component):
```typescript
'use client';
import { useState } from 'react';
import { retryModule } from '../../../app/dashboard/actions';

export default function ModuleRetryButton({ moduleId }: { moduleId: string }) {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    await retryModule(moduleId);
    setLoading(false);
  };

  return (
    <button onClick={handleRetry} disabled={loading}>
      {loading ? 'Retrying...' : 'Retry'}
    </button>
  );
}
```

**`module-row.tsx`** update: import `ModuleRetryButton`, render when `module.status === 'failed'`. Change the failed badge text to `"Failed (attempt {module.retry_count}/{SCRAPE_MODULE_RETRY_LIMIT})"` using a constant `const SCRAPE_MODULE_RETRY_LIMIT = 3`.

### pg-boss.ts Tests Pattern

The `pgBossPlugin` test needs to mock `PgBoss` constructor and verify `createQueue` is called. Use `vi.hoisted()` pattern:

```typescript
const { mockBossInstance, MockPgBoss } = vi.hoisted(() => {
  const mockBossInstance = {
    on: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    createQueue: vi.fn().mockResolvedValue(undefined),
  };
  return { mockBossInstance, MockPgBoss: vi.fn().mockReturnValue(mockBossInstance) };
});

vi.mock('pg-boss', () => ({ default: MockPgBoss }));
```

Then test:
```typescript
it('creates scrape-module queue with correct retry config', async () => {
  // ... register plugin ...
  expect(mockBossInstance.createQueue).toHaveBeenCalledWith(
    'scrape-module',
    expect.objectContaining({ retryLimit: 3, retryBackoff: true, expireInHours: 1 })
  );
});
```

### Testing Patterns from Story 2.2

- **All mocks**: use `vi.hoisted()` — required for ESM (CRITICAL)
- **Mock Supabase**: `vi.mock('@trailblaze/db', () => ({ createClient: mockCreateClient }))`
- **Mock pg-boss**: Use structural mock for BossWithWork (same as existing queue-handlers.test.ts)
- **Spy types**: `import type { MockInstance } from 'vitest'`
- **No fake timers** for retry tests (use instant spies instead — learned from Story 2.2)

### Frontend Testing

- Framework: Vitest + React Testing Library (setup in `apps/web/src/test/setup.ts`)
- The `retryModule` Server Action is tested separately from the Client Component
- Mock Server Action in component test: `vi.mock('../../../app/dashboard/actions', () => ({ retryModule: vi.fn() }))`
- Use `userEvent.click()` to simulate button click (import from `@testing-library/user-event`)

### PipelineClient Type — Already Has update()

The `PipelineClient` structural type in `queue-handlers.ts:18-29` already has `.from().update().eq()` chain. No change needed for the dead letter handler — it matches the existing update pattern. Ensure the `status` field in the update object is typed correctly: `'failed' as const` or via a union.

### Project Structure Notes

Files to create or modify for Story 2.3:

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/src/plugins/pg-boss.test.ts` | CREATE | Tests for queue creation config (AC4) |
| `apps/api/src/pipeline/queue-handlers.ts` | MODIFY | Extend BossJob type, fix catch block, add dead letter handler |
| `apps/api/src/pipeline/queue-handlers.test.ts` | MODIFY | Add tests for concurrency, retry_count, dead letter handler |
| `apps/api/src/routes/modules.ts` | MODIFY | Add POST /api/modules/:id/retry endpoint |
| `apps/api/src/routes/modules.test.ts` | MODIFY | Add retry endpoint tests |
| `apps/web/app/dashboard/actions.ts` | MODIFY | Add retryModule Server Action |
| `apps/web/src/components/dashboard/module-retry-button.tsx` | CREATE | Client Component for Retry button |
| `apps/web/src/components/dashboard/module-row.tsx` | MODIFY | Error badge + Retry button |
| `apps/web/src/components/dashboard/module-row.test.tsx` | MODIFY | Add error badge and Retry button tests |

Do NOT modify:
- `apps/api/src/plugins/pg-boss.ts` — queue config ALREADY correct
- `packages/shared/src/types/trailhead.ts` — Module type ALREADY has retry_count
- `supabase/migrations/` — retry_count column ALREADY exists in DB

### References

- [Source: apps/api/src/plugins/pg-boss.ts] — queue configs with retryLimit/retryBackoff (AC4 done)
- [Source: apps/api/src/pipeline/queue-handlers.ts] — teamSize/teamConcurrency (AC1 done), catch block to fix
- [Source: apps/api/src/routes/modules.ts] — moduleSchema with retry_count, pattern for new endpoint
- [Source: apps/web/app/dashboard/actions.ts] — Server Action pattern with VPS_API_URL + VPS_API_SECRET
- [Source: apps/web/src/components/dashboard/pipeline-toolbar.tsx] — Client Component pattern
- [Source: packages/shared/src/types/trailhead.ts:29] — retry_count field on Module
- [Source: _bmad-output/planning-artifacts/architecture.md] — Decision 8: dead letter queue naming
- [Source: .ralph-progress.md] — Key learnings from Story 2.2: vi.hoisted(), MockInstance, timer patterns

## Dev Agent Record

### Agent Model Used

claude-haiku-4-5 (ralph-implementer)

### Debug Log References

None — all tests passed on first or second attempt with no blockers.

### Completion Notes List

1. **Task 1 (Tests for concurrency & queue config)**: Added specific tests for scrape-module retry config (retryLimit: 3, retryBackoff: true, expireInHours: 1) and extract-content config (retryLimit: 2, retryBackoff: true, expireInHours: 0.5) to pg-boss.test.ts. All existing tests already covered concurrency settings.

2. **Task 2 (retry_count tracking)**: Extended BossJob type to include retryCount field, updated scrape-module catch block to track retry_count instead of setting status to 'failed'. Removed status update from catch block to allow dead letter handler to own the final transition.

3. **Task 3 (Dead letter handler)**: Implemented dead-letter-scrape-module worker registration with handler that sets module status to 'failed' and retry_count to SCRAPE_MODULE_RETRY_LIMIT (3) when job exhausts retries.

4. **Task 4 (Retry endpoint)**: Implemented POST /api/modules/:id/retry endpoint that validates module is in 'failed' status, resets retry_count to 0 and status to 'pending', then re-enqueues to scrape-module queue.

5. **Task 5 (Frontend)**: Created ModuleRetryButton client component, added retryModule Server Action, updated ModuleRow to display "Failed (attempt {retry_count}/3)" badge and render Retry button when status is 'failed'.

6. **Type safety fix**: Used `(supabase as any)` for update() call to work around TypeScript type inference limitation where structural type mocking causes 'never' type issues.

### File List

**Created:**
- `/mnt/d/ailocal/TrailblazeAi/apps/web/src/components/dashboard/module-retry-button.tsx` (Client Component for Retry button)
- `/mnt/d/ailocal/TrailblazeAi/apps/web/app/dashboard/actions.test.ts` (Server Action tests)

**Modified:**
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/plugins/pg-boss.test.ts` (Added queue config tests)
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/queue-handlers.ts` (Extended BossJob type, fixed catch block, added dead letter handler)
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/queue-handlers.test.ts` (Added retry_count and dead letter tests)
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/routes/modules.ts` (Added retry endpoint)
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/routes/modules.test.ts` (Added retry endpoint tests)
- `/mnt/d/ailocal/TrailblazeAi/apps/web/app/dashboard/actions.ts` (Added retryModule Server Action)
- `/mnt/d/ailocal/TrailblazeAi/apps/web/src/components/dashboard/module-row.tsx` (Added error badge with retry count and Retry button)
- `/mnt/d/ailocal/TrailblazeAi/apps/web/src/components/dashboard/module-row.test.tsx` (Added error badge and Retry button tests)
