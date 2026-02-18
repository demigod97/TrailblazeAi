# Story 1.1: API Foundation & Docker Deployment

Status: done

## Story

As a developer,
I want the Fastify API and Worker deployed as Docker containers with health monitoring,
so that the backend infrastructure is operational and verifiable.

## Acceptance Criteria

1. **Docker stack**: Running `docker compose up -d --build` from the project root starts all three containers (API 512MB, Worker 3GB, Nginx) with resource limits enforced. Nginx reverse proxy routes `/api/*` to the Fastify server with SSL termination configured.

2. **Health endpoint**: `GET /health` returns 200 within 500ms with JSON body following the `ApiResponse` envelope format (`{ data: { status, database, queue }, error: null }`) — with snake_case fields — showing live status of API server, Supabase database connection, and pg-boss queue.

3. **Bearer token auth**: Any request to a non-`/health` endpoint without a valid `Authorization: Bearer {token}` header returns 401 with an `ApiError` response (`{ data: null, error: { code, message } }`).

4. **Error handling**: When the API throws an `AppError` subclass (`NotFoundError`, `ValidationError`, `PipelineError`), the Fastify global error handler maps it to the correct HTTP status code with an `ApiError` response shape.

5. **Env validation**: All required environment variables are validated via Zod at API startup. The server exits with a descriptive error message if any required variable fails validation (fail-fast behavior).

## Tasks / Subtasks

- [x] Task 1: Database schema migrations (AC: #1, #2)
  - [x] 1.1 Create `packages/db/supabase/migrations/` directory
  - [x] 1.2 Write `001_core_tables.sql` — `modules`, `units`, `runs` tables
  - [x] 1.3 Write `002_knowledge_tables.sql` — `sf_knowledge_chunks`, `sf_concept_relationships`
  - [x] 1.4 Write `003_quiz_tables.sql` — `quiz_items`, `quiz_results`
  - [x] 1.5 Write `004_observability.sql` — `agent_logs` (ToolTrace schema)
  - [x] 1.6 Write `005_indexes.sql` — HNSW vector index (m=16, ef_construction=64), GIN FTS, composite indexes
  - [x] 1.7 Write `006_rls_policies.sql` — auth.uid() RLS for all tables
  - [x] 1.8 Write `007_functions.sql` — `hybrid_search()` RPC with RRF re-ranking

- [x] Task 2: Fix shared package types to match architecture (AC: #2)
  - [x] 2.1 Rewrite `packages/shared/src/types/trailhead.ts` — snake_case fields matching DB columns, correct `ModuleStatus` type with full state machine values
  - [x] 2.2 Rewrite `packages/shared/src/constants.ts` — correct `MODULE_STATUS` with all 8 states, correct `JOB_TYPES` and `API_ROUTES`

- [x] Task 3: API types and error hierarchy (AC: #3, #4)
  - [x] 3.1 Create `apps/api/src/types/api.ts` — `ApiSuccess<T>`, `ApiError`, `ApiResponse<T>` types
  - [x] 3.2 Create `apps/api/src/lib/response.ts` — `success<T>()`, `error()` envelope helper functions
  - [x] 3.3 Create `apps/api/src/lib/errors.ts` — `AppError`, `NotFoundError`, `ValidationError`, `PipelineError` classes
  - [x] 3.4 Write tests: `apps/api/src/lib/errors.test.ts` — verify each error class sets correct status_code and code

- [x] Task 4: Expand env config with all required variables (AC: #5)
  - [x] 4.1 Update `apps/api/src/config.ts` — add `OPENAI_API_KEY`, enforce required fields (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, DATABASE_URL as truly required not optional)
  - [x] 4.2 Update `.env.example` with all required env vars

- [x] Task 5: Fastify app factory and plugins (AC: #3, #4)
  - [x] 5.1 Create `apps/api/src/app.ts` — testable `buildApp()` factory function that registers all plugins
  - [x] 5.2 Create `apps/api/src/plugins/cors.ts` — `@fastify/cors` with allowed origins
  - [x] 5.3 Create `apps/api/src/plugins/rate-limit.ts` — `@fastify/rate-limit` with sensible defaults
  - [x] 5.4 Create `apps/api/src/plugins/auth.ts` — `@fastify/bearer-auth` validating against `config.bearerToken`; skip auth for `/health`
  - [x] 5.5 Create `apps/api/src/plugins/error-handler.ts` — Fastify `setErrorHandler` mapping `AppError` subclasses to `ApiError` responses
  - [x] 5.6 Write tests: `apps/api/src/plugins/auth.test.ts` — verify 401 on missing/invalid token, 200 on valid token
  - [x] 5.7 Write tests: `apps/api/src/plugins/error-handler.test.ts` — verify AppError subclasses map to correct HTTP status

- [x] Task 6: pg-boss plugin with all 7 queues (AC: #2)
  - [x] 6.1 Create `apps/api/src/plugins/pg-boss.ts` — initialize pg-boss from `DATABASE_URL`, create all 7 named queues with stage-specific config, decorate fastify instance with `boss`
  - [x] 6.2 Write tests: `apps/api/src/plugins/pg-boss.test.ts` — verify queue creation (mock pg-boss)

- [x] Task 7: Health route (AC: #2)
  - [x] 7.1 Create `apps/api/src/routes/health.ts` — `GET /health` checking DB connectivity (Supabase ping) and pg-boss queue status; returns `ApiSuccess<HealthStatus>` within 500ms
  - [x] 7.2 Write tests: `apps/api/src/routes/health.test.ts` — verify response shape, verify 200 on healthy, verify DB/queue status fields

- [x] Task 8: Update API entry point (AC: #5)
  - [x] 8.1 Rewrite `apps/api/src/index.ts` — import `buildApp()`, start server; do NOT inline Fastify setup

- [x] Task 9: Add Vitest to API (prerequisite for all tests)
  - [x] 9.1 Add `vitest` to `apps/api/package.json` devDependencies
  - [x] 9.2 Create `apps/api/vitest.config.ts` with `test: { environment: 'node' }`
  - [x] 9.3 Add `"test": "vitest run"` script to `apps/api/package.json`

- [x] Task 10: Docker stack — Nginx + volumes (AC: #1)
  - [x] 10.1 Create `docker/nginx/nginx.conf` — HTTP→HTTPS redirect, SSL termination, upstream proxy to `api:3001`, `/api/*` routing
  - [x] 10.2 Update `docker/docker-compose.yml` — add nginx service (ports 80:80, 443:443), add `playwright-profiles` and `certbot-conf` volumes, add cpu limits to worker (cpus: '3.0'), add volume mounts to worker
  - [x] 10.3 Update `docker/worker.Dockerfile` — use `mcr.microsoft.com/playwright:v1.50.0-noble` as base, add non-root user, add `ipc: host` note in comments

## Dev Notes

### Current Codebase State (IMPORTANT - read before touching files)

The scaffold already exists with stub implementations. **Do NOT recreate from scratch — update and extend:**

- `apps/api/src/index.ts` — Has inline Fastify setup (no factory pattern). **Replace** with `buildApp()` import + server start.
- `apps/api/src/config.ts` — Has Zod validation but many fields are `optional()`. **Update** to require critical fields.
- `packages/shared/src/types/trailhead.ts` — Uses **camelCase** field names (WRONG — must be snake_case to match DB). **Rewrite completely.**
- `packages/shared/src/constants.ts` — Has wrong `MODULE_STATUS` values (only 4 states, needs 8). **Rewrite.**
- `docker/docker-compose.yml` — Missing nginx service and volumes. **Update, don't replace.**
- `docker/api.Dockerfile` — Multi-stage Node 22 Alpine. Keep as-is (already correct).
- No migrations directory, no plugins, no routes directory, no tests yet.

### Architecture Patterns (MUST follow exactly)

**API Response Envelope** — every route returns this shape (no exceptions):
```typescript
// apps/api/src/types/api.ts
interface ApiSuccess<T> { data: T; error: null; }
interface ApiError { data: null; error: { code: string; message: string; details?: unknown; }; }
type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

**Error Hierarchy** — exact class signatures from architecture:
```typescript
// apps/api/src/lib/errors.ts
class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status_code: number = 500,
    public readonly details?: unknown,
  ) { super(message); this.name = this.constructor.name; }
}
class NotFoundError extends AppError {
  constructor(resource: string, id: string) { super('NOT_FOUND', `${resource} with id ${id} not found`, 404); }
}
class ValidationError extends AppError {
  constructor(message: string, details?: unknown) { super('VALIDATION_ERROR', message, 400, details); }
}
class PipelineError extends AppError {
  constructor(stage: string, message: string, details?: unknown) { super('PIPELINE_ERROR', `${stage}: ${message}`, 500, details); }
}
```

**Module State Machine** — the COMPLETE state list (not the 4-value version in existing constants.ts):
```typescript
// packages/shared/src/types/trailhead.ts
type ModuleStatus = 'pending' | 'scraping' | 'scraped' | 'processing' | 'ready' | 'quizzing' | 'completed' | 'failed';
```

**Naming Conventions** (enforced):
- DB tables + columns: `snake_case` — `module_id`, `trailmix_id`, `content_type`, `created_at`
- TypeScript when working with DB data: `snake_case` (no transformation layer, no camelCase aliases)
- Files: `kebab-case.ts` — `error-handler.ts`, `pg-boss.ts`
- Functions: `camelCase` — `buildApp()`, `handleError()`
- Types: PascalCase — `AppError`, `ApiResponse<T>`
- No TypeScript `enum` — use string union types only

**pg-boss Queue Config** (copy exactly — 7 queues):
```typescript
await boss.createQueue('scrape-module',       { retryLimit: 3, retryBackoff: true, expireInHours: 1 });
await boss.createQueue('extract-content',     { retryLimit: 2, retryBackoff: true, expireInHours: 0.5 });
await boss.createQueue('identify-concepts',   { retryLimit: 2, retryBackoff: true, expireInHours: 0.5 });
await boss.createQueue('chunk-content',       { retryLimit: 2, expireInMinutes: 10 });
await boss.createQueue('generate-embeddings', { retryLimit: 3, retryBackoff: true, expireInMinutes: 15 });
await boss.createQueue('build-relationships', { retryLimit: 2, retryBackoff: true, expireInHours: 0.5 });
await boss.createQueue('answer-quiz',         { retryLimit: 2, retryBackoff: true, expireInHours: 0.5 });
```

**Fastify App Factory** pattern (testability requirement):
```typescript
// apps/api/src/app.ts — factory for use in index.ts AND tests
export async function buildApp(opts?: FastifyServerOptions) {
  const app = Fastify({ logger: true, ...opts });
  await app.register(cors);
  await app.register(rateLimit);
  await app.register(bearerAuth);
  await app.register(pgBossPlugin);
  app.setErrorHandler(errorHandler);
  await app.register(healthRoute);
  return app;
}
// apps/api/src/index.ts — thin entry point
import { buildApp } from './app.js';
const app = await buildApp();
await app.listen({ port: config.port, host: '0.0.0.0' });
```

**Health endpoint response shape** (check DB + pg-boss):
```typescript
// GET /health — must check both DB and queue
{
  data: {
    status: 'healthy' | 'degraded',
    database: 'connected' | 'disconnected',
    queue: 'ready' | 'not_ready',
    timestamp: string // ISO 8601
  },
  error: null
}
```

**Bearer auth — skip /health** (critical pattern):
```typescript
// @fastify/bearer-auth with keys option + addHook to skip /health
// The plugin needs a way to bypass auth for the /health route
// Use fastify.addHook('onRequest', ...) with route path check
// OR register health route BEFORE bearer-auth plugin
```

**ESM import pattern** — all relative imports MUST use `.js` extension:
```typescript
import { config } from './config.js';  // ✓ correct
import { config } from './config';     // ✗ wrong — breaks ESM
```

### Database Schema Key Details

**Migration 001 — Core Tables:**
```sql
-- modules table (state machine)
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trailmix_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','scraping','scraped','processing','ready','quizzing','completed','failed')),
  priority INTEGER NOT NULL DEFAULT 5,
  badge_url TEXT,
  badge_earned BOOLEAN NOT NULL DEFAULT false,
  retry_count INTEGER NOT NULL DEFAULT 0,
  type TEXT,
  track TEXT,
  estimated_minutes INTEGER,
  unit_count INTEGER,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- units table
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  unit_index INTEGER NOT NULL,
  raw_html TEXT,
  content_markdown TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- runs table
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trailmix_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','cancelled','completed','failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_cost NUMERIC(10,6),
  user_id UUID REFERENCES auth.users(id)
);
```

**Migration 004 — ToolTrace (agent_logs):**
```sql
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id),
  agent_type TEXT NOT NULL CHECK (agent_type IN ('scraper','knowledge','quiz','documentation')),
  tool_type TEXT NOT NULL CHECK (tool_type IN ('playwright_mcp','rag_search','llm_call','embedding','sf_mcp','stagehand')),
  query TEXT NOT NULL,
  raw_output TEXT,
  summary TEXT,
  raw_output_truncated BOOLEAN NOT NULL DEFAULT false,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  confidence_score NUMERIC(4,3),
  related_chunk_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Migration 005 — HNSW Index (critical performance):**
```sql
-- HNSW for vector similarity (must use vector_ip_ops for inner product)
CREATE INDEX ON sf_knowledge_chunks
  USING hnsw (embedding vector_ip_ops)
  WITH (m = 16, ef_construction = 64);
-- GIN for full-text search
CREATE INDEX ON sf_knowledge_chunks USING gin(fts);
-- Composite indexes for common queries
CREATE INDEX idx_modules_status ON modules(status);
CREATE INDEX idx_modules_trailmix_id ON modules(trailmix_id);
CREATE INDEX idx_units_module_id ON units(module_id);
CREATE INDEX idx_agent_logs_run_id ON agent_logs(run_id);
```

**Migration 007 — hybrid_search function** (exact SQL from architecture.md Decision 6).

### File Paths to Create

```
apps/api/src/
  app.ts                    ← New (Fastify factory)
  types/api.ts              ← New (ApiResponse types)
  lib/errors.ts             ← New (AppError hierarchy)
  lib/response.ts           ← New (envelope helpers)
  lib/errors.test.ts        ← New (tests)
  plugins/auth.ts           ← New (@fastify/bearer-auth)
  plugins/cors.ts           ← New (@fastify/cors)
  plugins/rate-limit.ts     ← New (@fastify/rate-limit)
  plugins/error-handler.ts  ← New (global error handler)
  plugins/pg-boss.ts        ← New (pg-boss + 7 queues)
  plugins/auth.test.ts      ← New (auth tests)
  plugins/error-handler.test.ts ← New
  routes/health.ts          ← New (GET /health)
  routes/health.test.ts     ← New

packages/shared/src/
  types/trailhead.ts        ← REWRITE (snake_case + full state machine)
  constants.ts              ← REWRITE (correct values)

packages/db/supabase/migrations/
  001_core_tables.sql       ← New
  002_knowledge_tables.sql  ← New
  003_quiz_tables.sql       ← New
  004_observability.sql     ← New
  005_indexes.sql           ← New
  006_rls_policies.sql      ← New
  007_functions.sql         ← New

docker/
  nginx/nginx.conf          ← New
  docker-compose.yml        ← UPDATE (add nginx, volumes)
  worker.Dockerfile         ← UPDATE (Playwright base image)
```

### Project Structure Notes

**ESM package requirement**: All packages use `"type": "module"`. Relative imports in `apps/api/src/**` MUST use `.js` extension even when importing `.ts` files. This is TypeScript ESM convention — the `.js` extension refers to the compiled output.

**Workspace imports**: Use `@trailblaze/shared` and `@trailblaze/db` (workspace packages) — not relative paths that cross package boundaries.

**Vitest setup**: The API app does NOT have Vitest yet. Add to `package.json` devDependencies and create `vitest.config.ts`. Use Fastify's `inject()` method for route testing without spinning up a network server.

**pnpm package manager**: All `npm install` commands should use `pnpm add`. Use `pnpm --filter @trailblaze/api add vitest --save-dev` to add to the correct package.

**Current AI SDK version**: The INSTALLED version is `ai@^6` and `@ai-sdk/anthropic@^3` (NOT v5/v2 as in architecture.md — dependabot upgraded them). Do NOT downgrade. The API surface is mostly compatible; check the AI SDK v6 changelog if needed.

### Alignment with Project Architecture

- [Source: architecture.md — Decision 14: Docker Configuration]
- [Source: architecture.md — Decision 8: pg-boss Queue-Per-Stage Pattern]
- [Source: architecture.md — Decision 12: Database Schema Strategy]
- [Source: architecture.md — Process Patterns: Error Handling]
- [Source: architecture.md — Format Patterns: API Response Envelope]
- [Source: architecture.md — Implementation Patterns: Naming Conventions]

### References

- Architecture Decision 1 — Hybrid Deployment (three-tier): [Source: architecture.md#Decision-1]
- Architecture Decision 8 — pg-boss queue config (7 queues, exact retry config): [Source: architecture.md#Decision-8]
- Architecture Decision 12 — 7 sequential migrations, snake_case schema: [Source: architecture.md#Decision-12]
- Architecture Decision 14 — Docker 3-container stack, Playwright image: [Source: architecture.md#Decision-14]
- Architecture Enforcement Summary — Do NOT use TypeScript enum, camelCase in API: [Source: architecture.md#Enforcement-Summary]

## Dev Agent Record

### Agent Model Used

claude-haiku-4-5-20251001

### Debug Log References

### Completion Notes List

### File List

**Database Migrations (7 files):**
- `/packages/db/supabase/migrations/001_core_tables.sql` — Core tables (modules, units, runs)
- `/packages/db/supabase/migrations/002_knowledge_tables.sql` — Knowledge tables (sf_knowledge_chunks, sf_concept_relationships)
- `/packages/db/supabase/migrations/003_quiz_tables.sql` — Quiz tables (quiz_items, quiz_results)
- `/packages/db/supabase/migrations/004_observability.sql` — Observability table (agent_logs with ToolTrace schema)
- `/packages/db/supabase/migrations/005_indexes.sql` — HNSW vector index, GIN FTS, composite indexes
- `/packages/db/supabase/migrations/006_rls_policies.sql` — Row Level Security policies
- `/packages/db/supabase/migrations/007_functions.sql` — Hybrid search RPC function

**Shared Package Updates:**
- `/packages/shared/src/types/trailhead.ts` — Rewritten with snake_case fields and full 8-state ModuleStatus
- `/packages/shared/src/constants.ts` — Updated with all 8 MODULE_STATUS states and correct JOB_TYPES

**API Core Files:**
- `/apps/api/src/config.ts` — Updated with required field validation
- `/apps/api/src/app.ts` — NEW — Fastify factory function (buildApp)
- `/apps/api/src/index.ts` — Updated to use buildApp factory

**API Types & Errors:**
- `/apps/api/src/types/api.ts` — NEW — ApiResponse envelope types
- `/apps/api/src/lib/errors.ts` — NEW — Error hierarchy (AppError, NotFoundError, ValidationError, PipelineError)
- `/apps/api/src/lib/response.ts` — NEW — Response envelope helpers (success, error)

**API Plugins (5 plugins, 3 test files):**
- `/apps/api/src/plugins/cors.ts` — NEW — CORS plugin
- `/apps/api/src/plugins/rate-limit.ts` — NEW — Rate limiting plugin
- `/apps/api/src/plugins/auth.ts` — NEW — Bearer token authentication (skips /health)
- `/apps/api/src/plugins/error-handler.ts` — NEW — Global error handler
- `/apps/api/src/plugins/pg-boss.ts` — NEW — pg-boss queue initialization (7 queues)
- `/apps/api/src/plugins/auth.test.ts` — NEW — Auth plugin tests (4 tests)
- `/apps/api/src/plugins/error-handler.test.ts` — NEW — Error handler tests (6 tests)
- `/apps/api/src/plugins/pg-boss.test.ts` — NEW — pg-boss tests (3 tests)

**API Routes (1 route, 1 test file):**
- `/apps/api/src/routes/health.ts` — NEW — Health check endpoint
- `/apps/api/src/routes/health.test.ts` — NEW — Health route tests (6 tests)

**API Testing & Config:**
- `/apps/api/vitest.config.ts` — NEW — Vitest configuration
- `/apps/api/package.json` — Updated with vitest dev dependency and test script
- `/apps/api/src/lib/errors.test.ts` — NEW — Error class tests (12 tests)

**Docker Stack:**
- `/docker/nginx/nginx.conf` — NEW — Nginx reverse proxy configuration
- `/docker/docker-compose.yml` — Updated with nginx service and volumes
- `/docker/worker.Dockerfile` — Updated with Playwright base image and non-root user

**Summary:**
- **31 tests passing** (all passing)
- **Type check passing** (no TypeScript errors)
- **7 database migrations** created
- **8 new API files** (types, errors, response helpers)
- **5 new plugins + 3 test files**
- **1 new route + 1 test file**
- **Docker configuration** updated for 3-container stack
