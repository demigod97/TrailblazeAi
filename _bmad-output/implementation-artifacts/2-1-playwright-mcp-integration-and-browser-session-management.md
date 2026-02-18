# Story 2.1: Playwright MCP Integration & Browser Session Management

Status: done

## Story

As a user,
I want the system to maintain an authenticated Trailhead session using persistent browser profiles,
So that content extraction works across multiple runs without re-authentication.

## Acceptance Criteria

1. **[AC1]** Given the Worker container has Playwright MCP installed, when the MCP client is initialized, then it connects via stdio transport with the persistent browser profile at `/data/playwright-profiles/`; and the profile is stored in a Docker volume that survives container restarts.

2. **[AC2]** Given a persistent browser profile exists with a valid Trailhead session, when the system checks session validity via `browser_snapshot` on a known Trailhead page, then it confirms the session is active and proceeds with scraping.

3. **[AC3]** Given the browser encounters dynamic content with Shadow DOM / LWC, when the system needs to interact with the page, then it uses accessibility tree snapshots (getByRole, getByLabel, :has-text()) instead of CSS selectors.

4. **[AC4]** Given Playwright MCP fails to extract content from a specific page, when the accessibility tree approach returns incomplete data, then Stagehand v3 fallback is invoked with a Zod schema for structured extraction; and the fallback result is logged with `tool_type: "stagehand"` in agent_logs.

## Tasks / Subtasks

- [x] Task 1: Update Docker configuration for Playwright MCP profile path (AC1)
  - [x] 1.1 Update `docker/docker-compose.yml`: change the `playwright-profiles` volume mount in the `worker` service from `/home/worker/.cache/ms-playwright` to `/data/playwright-profiles`
  - [x] 1.2 Update `docker/worker.Dockerfile`: replace `mkdir -p /home/worker/.cache/ms-playwright && chown -R worker:nodejs /home/worker/.cache` with `mkdir -p /data/playwright-profiles && chown -R worker:nodejs /data/playwright-profiles`
  - [x] 1.3 Create directory `apps/api/src/agents/` — add a `.gitkeep` file (this directory is created now for Story 2-2 scraper-agent; the MCP client lives in `apps/api/src/lib/`)

- [x] Task 2: Add Stagehand dependency (AC4)
  - [x] 2.1 Add `"@browserbasehq/stagehand": "^3"` to `dependencies` in `apps/api/package.json` (NOTE: the story spec said `@anthropic-ai/stagehand` but that package does not exist on npm; `@browserbasehq/stagehand` is the canonical v3 package from the Stagehand team)
  - [x] 2.2 Run `pnpm install` to update lockfile

- [x] Task 3: Create Playwright MCP client factory (AC1, AC3)
  - [x] 3.1 Write failing test `apps/api/src/lib/mcp-client.test.ts`:
    - Test: `createPlaywrightMCP()` calls `createMCPClient` with `type: 'stdio'`, `command: 'npx'`, args including `@playwright/mcp@latest` and `--profile-dir /data/playwright-profiles/trailhead`
    - Test: returned client exposes `tools()` method (smoke-test the factory return)
  - [x] 3.2 Create `apps/api/src/lib/mcp-client.ts`:
    - Import `createMCPClient` from `@ai-sdk/mcp`
    - Export `createPlaywrightMCP()` async function: calls `createMCPClient({ transport: { type: 'stdio', command: 'npx', args: ['@playwright/mcp@latest', '--profile-dir', '/data/playwright-profiles/trailhead'] } })`
    - Export `PlaywrightMCPClient` type alias for the return type
  - [x] 3.3 Run API tests; confirm 3.1 tests pass

- [x] Task 4: Create session validator (AC2, AC3)
  - [x] 4.1 Write failing test `apps/api/src/lib/session-validator.test.ts`:
    - Test: `checkTrailheadSession()` with a mock client whose `callTool('browser_navigate', ...)` and `callTool('browser_snapshot', ...)` resolve → returns `{ valid: true }` when snapshot aria-label includes authenticated user indicator (no "Log In" button present)
    - Test: `checkTrailheadSession()` returns `{ valid: false }` when snapshot contains "Log In" text
    - Test: `checkTrailheadSession()` returns `{ valid: false, error: string }` when `callTool` throws
  - [x] 4.2 Create `apps/api/src/lib/session-validator.ts`:
    - Import `PlaywrightMCPClient` from `./mcp-client.js`
    - Export interface `SessionCheckResult { valid: boolean; error?: string }`
    - Export `checkTrailheadSession(client: PlaywrightMCPClient): Promise<SessionCheckResult>`
    - Implementation: call `browser_navigate` to `https://trailhead.salesforce.com/en/home`, then call `browser_snapshot`; inspect returned accessibility tree string for presence of "Log In" button — if present return `{ valid: false }`, else return `{ valid: true }`
    - Wrap in try/catch: on error return `{ valid: false, error: err instanceof Error ? err.message : String(err) }`
  - [x] 4.3 Run API tests; confirm 4.1 tests pass

- [x] Task 5: Create agent-logger helper (AC4)
  - [x] 5.1 Write failing test `apps/api/src/lib/agent-logger.test.ts`:
    - Test: `logToolTrace()` calls `supabase.from('agent_logs').insert()` with correct shape including all required `AgentLog` fields
    - Test: `logToolTrace()` with `tool_type: 'stagehand'` inserts record with that tool_type value
    - Test: `logToolTrace()` does NOT throw when Supabase returns an error (logs silently to avoid crashing the pipeline)
  - [x] 5.2 Create `apps/api/src/lib/agent-logger.ts`:
    - Import `AgentLog`, `AgentType`, `ToolType` from `@trailblaze/shared`
    - Import Supabase client type from `@trailblaze/db`
    - Export interface `ToolTraceParams` (all `AgentLog` fields except `id` and `created_at`)
    - Export `logToolTrace(supabase: ReturnType<typeof createClient>, params: ToolTraceParams): Promise<void>` — calls `supabase.from('agent_logs').insert(params)`, on error logs with `console.error` but does NOT throw
  - [x] 5.3 Run API tests; confirm 5.1 tests pass

- [x] Task 6: Create Stagehand v3 fallback (AC4)
  - [x] 6.1 Write failing test `apps/api/src/lib/stagehand-fallback.test.ts`:
    - Mock `@browserbasehq/stagehand` using `vi.hoisted()` pattern (required for ESM mock hoisting)
    - Test: `extractWithStagehand()` calls `Stagehand` constructor with v3 API: `{ env: 'LOCAL', model: 'claude-haiku-4-5-20251001', verbose: 0, disablePino: true }` (NOTE: spec said `{ modelName, enableCaching }` which are v2 options; v3 `V3Options` uses `env`, `model` instead)
    - Test: `extractWithStagehand()` calls `stagehand.context.activePage().goto(url)` then `stagehand.extract(instruction, schema)` (NOTE: spec said `stagehand.page.goto()` and `stagehand.extract({ instruction, schema })` — these are v2 API; v3 uses `context.activePage()` and separate positional args)
    - Test: `extractWithStagehand()` calls `logToolTrace` with `tool_type: 'stagehand'` and `agent_type: 'scraper'`
    - Test: `extractWithStagehand()` returns the extracted data from `stagehand.extract()`
    - Test: `extractWithStagehand()` calls `stagehand.close()` in a finally block (cleanup)
    - Test: `extractWithStagehand()` throws if `activePage()` returns undefined
  - [x] 6.2 Create `apps/api/src/lib/stagehand-fallback.ts`:
    - Import `Stagehand` from `@browserbasehq/stagehand`
    - Import `z` from `zod`, `logToolTrace` from `./agent-logger.js`
    - Import Supabase client type from `@trailblaze/db`
    - Export `extractWithStagehand<T>(params: { url: string; schema: z.ZodSchema<T>; instruction: string; supabase: ReturnType<typeof createClient>; runId: string | null; }): Promise<T>`
    - Implementation (v3 API):
      1. Record `startTime = Date.now()`
      2. Initialize `stagehand = new Stagehand({ env: 'LOCAL', model: 'claude-haiku-4-5-20251001', verbose: 0, disablePino: true })`
      3. In try block: `await stagehand.init()`, get page via `stagehand.context.activePage()` (throw if undefined), `await page.goto(params.url)`, `const result = await stagehand.extract(params.instruction, params.schema)`
      4. Call `logToolTrace` with stagehand tool_type fields
      5. Return `result`
      6. In finally block: `await stagehand.close()`
  - [x] 6.3 Run full API test suite; confirm all pass

- [x] Task 7: Final verification
  - [x] 7.1 Run `pnpm --filter @trailblaze/api test` — all tests pass (0 failures)
  - [x] 7.2 Run `pnpm type-check` — 0 type errors across all packages
  - [x] 7.3 Mark all tasks [x] only after both pass

## Dev Notes

### Architecture Context

This story establishes the **browser automation library layer** for Sprint 2. The four ACs cover infrastructure only — the full Scraper Agent that orchestrates these tools into a job pipeline comes in Story 2-2.

**Decision 2** [Source: architecture.md#Decision-2]: Playwright MCP primary via stdio transport. Stagehand v3 as targeted fallback for Shadow DOM failures. Key integration pattern:
```typescript
// Primary (Decision 2)
const playwrightMCP = await createMCPClient({
  transport: { type: 'stdio', command: 'npx', args: ['@playwright/mcp@latest'] }
});

// Fallback (Decision 2 — Shadow DOM extraction failures only)
import { Stagehand } from '@anthropic-ai/stagehand';
const stagehand = new Stagehand({ modelName: 'claude-haiku-4-5-20251001' });
const data = await stagehand.extract({ instruction: '...', schema: z.object({...}) });
```

**Decision 10, Layer 3** [Source: architecture.md#Decision-10]: Salesforce session management via persistent browser profiles in Docker volume at `/data/playwright-profiles/`. Session detection uses `browser_snapshot` before each scraping job.

**Decision 11** [Source: architecture.md#Decision-11]: ToolTrace pattern for agent logging. The `AgentLog` interface is already defined in `packages/shared/src/types/trailhead.ts` (line 110-126). `ToolType` already includes `'stagehand'` (line 10) — **no shared type changes needed**.

**Decision 14** [Source: architecture.md#Decision-14]: Worker container uses `ipc: host` (already in docker-compose.yml) and named Docker volume `playwright-profiles`. Current docker-compose.yml mounts this volume at `/home/worker/.cache/ms-playwright` — **must update to `/data/playwright-profiles`** to match the AC and architecture spec.

### Existing File State

| File | Current State |
|------|--------------|
| `docker/docker-compose.yml` | Has `playwright-profiles` volume + `ipc: host` ✓; volume mounts at `/home/worker/.cache/ms-playwright` ← **must change to `/data/playwright-profiles`** |
| `docker/worker.Dockerfile` | Multi-stage build ✓; `mkdir -p /home/worker/.cache/ms-playwright` ← **must change to `/data/playwright-profiles`** |
| `apps/api/package.json` | Has `@ai-sdk/mcp: "^0"` ✓; missing `@anthropic-ai/stagehand` ← **must add** |
| `packages/shared/src/types/trailhead.ts` | `ToolType` already includes `'stagehand'` ✓; `AgentLog` interface already defined ✓ |
| `apps/api/src/lib/` | Has `errors.ts`, `response.ts` only — new lib files extend this directory |
| `apps/api/src/agents/` | **Does not exist** — create with `.gitkeep` placeholder |

### Testing Standards

**What NOT to test** [Source: architecture.md#Decision-13]:
- Playwright MCP interactions (tested by Microsoft) — mock `createMCPClient` completely
- Stagehand's internal extraction quality — mock `Stagehand` class completely
- Supabase client operations — mock supabase `from().insert()`

**What to test:**
- `createPlaywrightMCP()` calls `createMCPClient` with correct stdio transport config
- `checkTrailheadSession()` returns correct `{ valid: true/false }` based on snapshot content
- `extractWithStagehand()` calls stagehand methods in correct order and logs with correct `tool_type`
- `logToolTrace()` calls `supabase.from('agent_logs').insert()` with correct AgentLog shape

### ESM Import Requirements

All relative imports in `apps/api/src/` must use `.js` extension (ESM, tsup build):
```typescript
// Correct — .js extension required for ESM in apps/api
import { createPlaywrightMCP } from './mcp-client.js';
import { logToolTrace } from './agent-logger.js';

// Wrong — will fail at runtime
import { createPlaywrightMCP } from './mcp-client';
```

### ESM Mock Pattern (vi.hoisted required for Stagehand)

The `@anthropic-ai/stagehand` mock MUST use `vi.hoisted()` because the `vi.mock()` factory runs before module scope:
```typescript
// apps/api/src/lib/stagehand-fallback.test.ts
const { MockStagehand } = vi.hoisted(() => {
  const mockExtract = vi.fn();
  const mockInit = vi.fn().mockResolvedValue(undefined);
  const mockClose = vi.fn().mockResolvedValue(undefined);
  const mockGoto = vi.fn().mockResolvedValue(undefined);
  const MockStagehand = vi.fn().mockImplementation(() => ({
    init: mockInit,
    close: mockClose,
    extract: mockExtract,
    page: { goto: mockGoto },
  }));
  return { MockStagehand, mockExtract, mockInit, mockClose, mockGoto };
});

vi.mock('@anthropic-ai/stagehand', () => ({ Stagehand: MockStagehand }));
```

Similarly for `createMCPClient` in `mcp-client.test.ts`:
```typescript
const { mockCreateMCPClient } = vi.hoisted(() => {
  const mockTools = vi.fn().mockResolvedValue([]);
  const mockCreateMCPClient = vi.fn().mockResolvedValue({ tools: mockTools });
  return { mockCreateMCPClient, mockTools };
});
vi.mock('@ai-sdk/mcp', () => ({ createMCPClient: mockCreateMCPClient }));
```

### AppError / PipelineError Usage

From `apps/api/src/lib/errors.ts` — `PipelineError` is available for wrapping non-AppError exceptions:
```typescript
// Inline catch for session-validator (does NOT re-throw — returns { valid: false } instead)
try {
  const snapshot = await client.callTool('browser_snapshot', {});
  // ...
} catch (err) {
  return { valid: false, error: err instanceof Error ? err.message : String(err) };
}

// Stagehand fallback — PipelineError if Stagehand itself fails
// (logToolTrace does NOT throw — only console.error on Supabase errors)
```

### Playwright MCP Tool Call Pattern

Based on AI SDK v5 MCP client API (`@ai-sdk/mcp`):
```typescript
// The MCP client exposes tools that can be called via callTool
const result = await client.callTool('browser_navigate', {
  url: 'https://trailhead.salesforce.com/en/home'
});
const snapshot = await client.callTool('browser_snapshot', {});
// snapshot.content[0].text contains the accessibility tree
```

### Stagehand v3 Configuration

From architecture.md Decision 2:
```typescript
import { Stagehand } from '@anthropic-ai/stagehand';
const stagehand = new Stagehand({ modelName: 'claude-haiku-4-5-20251001', enableCaching: true });
await stagehand.init();
await stagehand.page.goto(url);
const data = await stagehand.extract({ instruction: '...', schema: z.object({...}) });
await stagehand.close(); // always close in finally block
```

**Model choice**: `claude-haiku-4-5-20251001` per architecture tiered model strategy (Haiku for high-volume tasks, Stagehand is used for edge-case extraction so cost matters).

### Project Structure Notes

New directory `apps/api/src/agents/` is created now (with `.gitkeep`) as the container for Sprint 2 agent files. Story 2-2 will populate it with `scraper-agent.ts`.

The `apps/api/src/lib/` directory gains 4 new files this story:
- `mcp-client.ts` + `mcp-client.test.ts`
- `session-validator.ts` + `session-validator.test.ts`
- `agent-logger.ts` + `agent-logger.test.ts`
- `stagehand-fallback.ts` + `stagehand-fallback.test.ts`

No new Fastify routes or pg-boss workers are created in this story — those belong to Stories 2-2 and 2-3.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-2 — Playwright MCP + Stagehand integration pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-10 — Layer 3 Salesforce session management]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-11 — ToolTrace schema and logging pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-13 — What NOT to test (mock Playwright MCP + Stagehand)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-14 — Worker container config, /data/playwright-profiles volume]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.1 — Acceptance criteria]
- [Source: docker/docker-compose.yml — current volume mount at /home/worker/.cache/ms-playwright (to update)]
- [Source: docker/worker.Dockerfile — current worker Dockerfile mkdir line (to update)]
- [Source: apps/api/package.json — @ai-sdk/mcp present, @anthropic-ai/stagehand missing]
- [Source: packages/shared/src/types/trailhead.ts — ToolType union (stagehand already included), AgentLog interface]
- [Source: apps/api/src/lib/errors.ts — AppError, PipelineError for error handling]
- [Source: _bmad-output/implementation-artifacts/1-4-real-time-module-status-dashboard.md — vi.hoisted() pattern, ESM mock pattern]

## Dev Agent Record

### Agent Model Used

claude-haiku-4-5-20251001

### Completion Notes

1. **Docker Configuration Updates (Task 1):**
   - Updated `/data/playwright-profiles` volume mount path in `docker/docker-compose.yml` (line 33)
   - Updated Dockerfile to create and chown `/data/playwright-profiles` directory
   - Created `/apps/api/src/agents/.gitkeep` for future Sprint 2 scraper-agent implementation

2. **Stagehand Dependency (Task 2):**
   - Installed `@browserbasehq/stagehand@^3` (the canonical v3 package — `@anthropic-ai/stagehand` does not exist on npm)
   - `@browserbasehq/stagehand` ships bundled TypeScript declarations at `dist/index.d.ts` — no custom `.d.ts` needed
   - Peer dep warning: `ollama-ai-provider-v2` expects `zod@^4`; this is an indirect transitive dep, not blocking

3. **MCP Client Implementation (Task 3):**
   - Created `PlaywrightMCPClient` interface with both `callTool()` and `tools()` methods
   - `tools()` exposed for AI SDK agent loops (`generateText({ tools: client.tools(), ... })`)
   - Uses `experimental_createMCPClient` from `@ai-sdk/mcp` + `Experimental_StdioMCPTransport` from `@ai-sdk/mcp/mcp-stdio` (stdio transport is not in the MCPTransportConfig union; uses class-based API)
   - `toolCallId` uses `randomUUID()` from Node.js built-in `crypto` for uniqueness under concurrent calls

4. **Session Validator (Task 4):**
   - Inspects all snapshot content blocks (joined), not just first block
   - Login detection is case-insensitive; checks both "log in" and "sign in" variants
   - Gracefully handles errors with try/catch, returning `{ valid: false, error }` on failure

5. **Agent Logger (Task 5):**
   - Checks both thrown exceptions AND Supabase returned `{ error }` objects; logs both with `console.error`
   - Uses structural type cast (`as unknown as InsertClient`) instead of banned `as any`
   - `InsertClient` type precisely describes the `.from().insert()` API subset needed

6. **Stagehand Fallback (Task 6):**
   - Uses v3 `@browserbasehq/stagehand` API: `env: 'LOCAL'`, `stagehand.context.activePage()`, `stagehand.extract(instruction, schema)`
   - Guards against `activePage()` returning undefined (new error path with close() in finally)
   - Properly implements finally block cleanup (stagehand.close())

7. **Docker (Task 1 + Review Fix):**
   - Added `healthcheck` to `api` service in docker-compose.yml (required for `nginx depends_on: condition: service_healthy` to work)

8. **Type Safety:**
   - All code passes TypeScript strict mode; no `any` types
   - `as unknown as T` pattern used where Supabase generated types lag the runtime schema

### Test Results

- **API Tests:** 79 tests passing (11 test files)
  - 3 tests: mcp-client.test.ts (added tools() test)
  - 6 tests: session-validator.test.ts (added multi-block + case-insensitive tests)
  - 4 tests: agent-logger.test.ts (added console.error assertions)
  - 9 tests: stagehand-fallback.test.ts (added activePage() undefined guard test)
  - Plus 57 existing tests in other files (all pass)

- **Type Check:** 0 errors across all 4 packages (api, db, shared, web)

### File List

**Created Files:**
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/lib/mcp-client.ts` — Playwright MCP client factory interface
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/lib/mcp-client.test.ts` — 2 tests for interface contract
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/lib/session-validator.ts` — Session validity checker
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/lib/session-validator.test.ts` — 4 tests for session checks
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/lib/agent-logger.ts` — Tool trace logging helper
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/lib/agent-logger.test.ts` — 4 tests for logging
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/lib/stagehand-fallback.ts` — Stagehand extraction wrapper
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/lib/stagehand-fallback.test.ts` — 8 tests for extraction
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/types/stagehand.d.ts` — Type declarations for Stagehand
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/agents/.gitkeep` — Directory placeholder

**Modified Files:**
- `/mnt/d/ailocal/TrailblazeAi/docker/docker-compose.yml` — Updated volume mount path (line 33)
- `/mnt/d/ailocal/TrailblazeAi/docker/worker.Dockerfile` — Updated mkdir path (lines 37-38)
