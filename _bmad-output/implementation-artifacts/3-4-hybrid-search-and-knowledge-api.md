# Story 3.4: Hybrid Search & Knowledge API

Status: done

## Story

As a user,
I want to search the knowledge base using hybrid search with filtering,
So that I can find relevant Salesforce information quickly.

## Acceptance Criteria

1. **[AC1]** Given the `knowledge_search()` SQL function is deployed, when called with query text and a query embedding, then it combines vector similarity and full-text search using RRF re-ranking (full_text_weight=1.5, semantic_weight=1.0) and returns the top-k most relevant chunks ordered by combined score with a `relevance_score` value.

2. **[AC2]** Given I call `GET /api/knowledge/search` with query parameters, when the request includes `?q=query_text` and optional filters (`?content_type=`, `?sf_topics=`, `?difficulty=`, `?module_name=`), then the API generates an embedding for the query, calls `knowledge_search()`, applies filters, and returns results within 2 seconds. The response follows the ApiResponse envelope with paginated results (`count`, `offset`, `limit`).

3. **[AC3]** Given search results are returned, when the response is consumed by an AI coding agent, then each result includes: `chunk_text`, `content_type`, `sf_topics`, module name (`module_name`), unit title (`unit_title`), `relevance_score`, and `related_chunk_ids`.

4. **[AC4]** Given no results match the query, when the search returns empty, then the API returns an empty array (never null) with `count: 0`.

## Tasks / Subtasks

- [x] Task 1: Create migration 012 with `knowledge_search()` SQL function (AC1)
  - [x] 1.1 Create `packages/db/supabase/migrations/012_knowledge_search_function.sql`:
    - This is a NEW function separate from `hybrid_search()` — do NOT modify migration 007
    - Uses `RETURNS TABLE(...)` pattern (no CREATE TYPE needed)
    - Returns: id, module_id, unit_id, chunk_text, content_type, difficulty, sf_topics, section_header, relevance_score
    - Implementation mirrors `hybrid_search()` but returns the RRF score as `relevance_score`
    - See Dev Notes → Migration Design for exact SQL
  - [x] 1.2 Run `pnpm type-check` — confirm 0 errors (migration is SQL only, no TS impact)

- [x] Task 2: Implement GET /api/knowledge/search route with TDD (AC1-AC4)
  - [x] 2.1 Write failing test `apps/api/src/routes/knowledge.test.ts`:
    - Test: Returns 401 without Authorization header
    - Test: Returns 400 when `q` query param is missing
    - Test: Returns 200 with results array and all required fields (chunk_text, content_type, sf_topics, module_name, unit_title, relevance_score, related_chunk_ids)
    - Test: Returns empty array (not null) with count: 0 when RPC returns no data
    - Test: Calls `embed()` with the query text and `text-embedding-3-small` model
    - Test: Calls `supabase.rpc('knowledge_search', ...)` with the generated embedding
    - Test: Applies `content_type` filter — only returns chunks matching the filter
    - Test: Applies `sf_topics` filter — only returns chunks whose sf_topics overlap
    - Test: Returns 500 when `embed()` throws an error
    - Test: Returns 500 when `supabase.rpc()` returns an error
    - See Dev Notes → Test Mock Pattern for exact mock setup
  - [x] 2.2 Confirm tests FAIL (RED phase) — `pnpm --filter @trailblaze/api test -- knowledge`
  - [x] 2.3 Create `apps/api/src/routes/knowledge.ts`:
    - See Dev Notes → Route Implementation for exact code structure
    - Query param Zod validation: q (required string), content_type (optional), sf_topics (optional, comma-separated), difficulty (optional), module_name (optional), offset (default 0), limit (default 10, max 50)
    - Call `embed()` to generate query embedding
    - Call `knowledge_search` RPC with match_count = 50 (headroom for filtering)
    - Post-filter results in TypeScript (content_type, difficulty, sf_topics, module_name)
    - Batch-fetch unit titles and module names
    - Batch-fetch related_chunk_ids from sf_concept_relationships
    - Paginate and return ApiResponse envelope
  - [x] 2.4 Run `pnpm --filter @trailblaze/api test -- knowledge` — confirm all 10 tests pass (GREEN)

- [x] Task 3: Register knowledge route in app.ts (AC2)
  - [x] 3.1 Import `knowledgeRoutes` from `'./routes/knowledge.js'` in `apps/api/src/app.ts`
  - [x] 3.2 Register: `await app.register(knowledgeRoutes)` after `await app.register(modulesRoutes)`

- [x] Task 4: Final verification
  - [x] 4.1 Run `pnpm --filter @trailblaze/api test` — all tests pass
  - [x] 4.2 Run `pnpm --filter @trailblaze/web test` — all tests pass (no regressions)
  - [x] 4.3 Run `pnpm type-check` — 0 errors
  - [x] 4.4 Mark all tasks [x] only after all three pass

## Dev Notes

### Architecture Context

This story implements Knowledge Retrieval (FR13-FR16) and FR35 (semantic search via API).

**Decision 6 [Source: architecture.md#Decision-6]:** Hybrid search as Supabase SQL function with RRF re-ranking. Existing `hybrid_search()` function (migration 007) returns `SETOF sf_knowledge_chunks` — NO relevance score. Story 3-4 requires a new `knowledge_search()` function (migration 012) that returns the score as a RETURNS TABLE function.

**Decision 5 [Source: architecture.md#Decision-5]:** OpenAI `text-embedding-3-small` (1536 dimensions) via AI SDK `embed()` for single query embedding. Use `@ai-sdk/openai@^2` (NOT `^1` — V1/V2 protocol mismatch, see AGENTS.md).

**Decision 7 [Source: architecture.md#Decision-7]:** No dedicated Knowledge Agent for this route — the search route itself handles the embedding + retrieval logic directly. Only the quiz-agent uses the full hybrid_search + reranking agent loop.

**AR18 [Source: architecture.md]:** API response envelope: `ApiSuccess<T> | ApiError`. Import `success()` and `error()` from `'../lib/response.js'`.

**AR21 [Source: architecture.md]:** Zod for all external data. Validate query params with Zod before processing.

**Performance requirement (NFR1):** Hybrid search returns results within 2s for knowledge bases up to 10,000 chunks. Minimize round-trips by batching all enrichment queries.

### Existing File State

| File | Current State |
|------|---------------|
| `packages/db/supabase/migrations/007_functions.sql` | EXISTS — `hybrid_search()` returns `SETOF sf_knowledge_chunks` (no score) — DO NOT MODIFY |
| `packages/db/supabase/migrations/012_knowledge_search_function.sql` | Does NOT exist — create it |
| `apps/api/src/routes/knowledge.ts` | Does NOT exist — create it |
| `apps/api/src/routes/knowledge.test.ts` | Does NOT exist — create it |
| `apps/api/src/app.ts` | EXISTS — register knowledgeRoutes after modulesRoutes |
| `apps/api/src/routes/modules.ts` | EXISTS — template for route structure, Zod validation patterns |
| `apps/api/src/routes/modules.test.ts` | EXISTS — template for test structure, mock patterns |
| `apps/api/src/lib/response.ts` | EXISTS — `success(data)` and `error(code, message, details)` helpers |
| `apps/api/src/types/api.ts` | EXISTS — `ApiResponse<T>` type |
| `apps/api/src/config.ts` | EXISTS — `config.supabaseUrl`, `config.supabaseServiceKey` |
| `apps/api/src/plugins/auth.ts` | EXISTS — Bearer token auth applied to routes registered after it |
| `apps/api/src/plugins/pg-boss.ts` | EXISTS — `pgBossPlugin` registered before routes |

### Database Schema After All Migrations

**sf_knowledge_chunks** (after migrations 002 + 009):
```
id UUID, module_id UUID, unit_id UUID, chunk_text TEXT, embedding VECTOR(1536),
fts TSVECTOR, content_type TEXT, difficulty TEXT, sf_topics TEXT[],
section_header TEXT, confidence_score NUMERIC, source_url TEXT,
chunk_index INT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

**sf_concept_relationships** (after migrations 002 + 011):
```
id UUID, source_chunk_id UUID (nullable), target_chunk_id UUID (nullable),
source_concept TEXT, target_concept TEXT, relationship_type TEXT,
strength NUMERIC, module_id UUID, created_at TIMESTAMPTZ
```

### Migration Design (Task 1.1)

**File:** `packages/db/supabase/migrations/012_knowledge_search_function.sql`

```sql
-- Knowledge search function that exposes RRF relevance score
-- Separate from hybrid_search() (migration 007) which returns SETOF sf_knowledge_chunks
-- Uses RETURNS TABLE to include relevance_score without a composite TYPE

CREATE OR REPLACE FUNCTION knowledge_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 50,
  full_text_weight FLOAT DEFAULT 1.5,
  semantic_weight FLOAT DEFAULT 1.0,
  rrf_k INT DEFAULT 50
) RETURNS TABLE(
  id UUID,
  module_id UUID,
  unit_id UUID,
  chunk_text TEXT,
  content_type TEXT,
  difficulty TEXT,
  sf_topics TEXT[],
  section_header TEXT,
  relevance_score FLOAT
) AS $$
  WITH full_text AS (
    SELECT c.id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(c.fts, websearch_to_tsquery(query_text)) DESC) AS rank
    FROM sf_knowledge_chunks c
    WHERE c.fts @@ websearch_to_tsquery(query_text)
    ORDER BY rank LIMIT match_count * 2
  ),
  semantic AS (
    SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.embedding <#> query_embedding) AS rank
    FROM sf_knowledge_chunks c
    ORDER BY rank LIMIT match_count * 2
  ),
  ranked AS (
    SELECT COALESCE(f.id, s.id) AS id,
      COALESCE(1.0 / (rrf_k + f.rank), 0.0) * full_text_weight +
      COALESCE(1.0 / (rrf_k + s.rank), 0.0) * semantic_weight AS rrf_score
    FROM full_text f FULL OUTER JOIN semantic s ON f.id = s.id
    ORDER BY rrf_score DESC
    LIMIT match_count
  )
  SELECT
    c.id,
    c.module_id,
    c.unit_id,
    c.chunk_text,
    c.content_type,
    c.difficulty,
    c.sf_topics,
    c.section_header,
    r.rrf_score AS relevance_score
  FROM sf_knowledge_chunks c
  JOIN ranked r ON c.id = r.id
  ORDER BY r.rrf_score DESC;
$$ LANGUAGE sql;
```

**Important:** `websearch_to_tsquery(query_text)` can throw if query_text is malformed. The route handler should wrap the RPC call in try/catch — already handled by the global error handler pattern.

### Route Implementation (Task 2.3)

**File:** `apps/api/src/routes/knowledge.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@trailblaze/db';
import { config } from '../config.js';
import { success, error } from '../lib/response.js';
import type { ApiResponse } from '../types/api.js';
import { AppError } from '../lib/errors.js';

// Structural type for knowledge_search() RPC (not in generated types)
type KnowledgeRpcClient = {
  rpc(
    fn: string,
    params: Record<string, unknown>,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>;
};

// Structural type for batch enrichment queries (.in() pattern)
type BatchSelectClient = {
  from(table: string): {
    select(cols: string): {
      in(col: string, vals: string[]): Promise<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
    };
  };
};

// Zod schema for raw rows from knowledge_search() RPC
const chunkRowSchema = z.object({
  id: z.string(),
  module_id: z.string().nullable(),
  unit_id: z.string().nullable(),
  chunk_text: z.string(),
  content_type: z.string().nullable(),
  difficulty: z.string().nullable(),
  sf_topics: z.array(z.string()).nullable().default([]),
  section_header: z.string().nullable(),
  relevance_score: z.number(),
});

// Zod schema for query params
const searchQuerySchema = z.object({
  q: z.string().min(1, 'Query text is required'),
  content_type: z.string().optional(),
  sf_topics: z.string().optional(), // comma-separated
  difficulty: z.string().optional(),
  module_name: z.string().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

interface KnowledgeSearchResult {
  id: string;
  chunk_text: string;
  content_type: string | null;
  difficulty: string | null;
  sf_topics: string[];
  section_header: string | null;
  module_id: string | null;
  unit_id: string | null;
  module_name: string | null;
  unit_title: string | null;
  relevance_score: number;
  related_chunk_ids: string[];
}

interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[];
  count: number;
  offset: number;
  limit: number;
}

export const knowledgeRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/knowledge/search
  app.get<{ Querystring: z.infer<typeof searchQuerySchema>; Reply: ApiResponse<KnowledgeSearchResponse> }>(
    '/api/knowledge/search',
    async (request, reply) => {
      try {
        // 1. Validate query params
        const parsed = searchQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          return reply.code(400).send(error('VALIDATION_ERROR', 'Invalid query params', parsed.error.flatten()));
        }
        const { q, content_type, sf_topics, difficulty, module_name, offset, limit } = parsed.data;

        // 2. Generate query embedding
        let queryEmbedding: number[];
        try {
          const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: q,
            maxRetries: 3,
          });
          queryEmbedding = embedding;
        } catch (embedErr) {
          const msg = embedErr instanceof Error ? embedErr.message : 'Embedding failed';
          app.log.error({ error: msg }, 'Failed to generate query embedding');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Failed to generate query embedding'));
        }

        // 3. Call knowledge_search() RPC with large match_count for filtering headroom
        const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
        const rpcClient = supabase as unknown as KnowledgeRpcClient;

        const { data: rawResults, error: rpcError } = await rpcClient.rpc('knowledge_search', {
          query_text: q,
          query_embedding: queryEmbedding,
          match_count: 50,
          full_text_weight: 1.5,
          semantic_weight: 1.0,
          rrf_k: 50,
        });

        if (rpcError) {
          app.log.error({ error: rpcError.message }, 'knowledge_search RPC failed');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Search failed'));
        }

        // 4. Parse and validate raw results
        const rowsResult = z.array(chunkRowSchema).safeParse(rawResults ?? []);
        const rows = rowsResult.success ? rowsResult.data : [];

        // 5. Post-filter in TypeScript
        let filtered = rows;

        if (content_type) {
          filtered = filtered.filter(c => c.content_type === content_type);
        }
        if (difficulty) {
          filtered = filtered.filter(c => c.difficulty === difficulty);
        }
        if (sf_topics) {
          const topicsList = sf_topics.split(',').map(t => t.trim()).filter(Boolean);
          if (topicsList.length > 0) {
            filtered = filtered.filter(c =>
              topicsList.some(topic => (c.sf_topics ?? []).includes(topic)),
            );
          }
        }

        // 6. Batch-fetch units and modules for enrichment
        const batchClient = supabase as unknown as BatchSelectClient;

        const unitIds = [...new Set(filtered.map(c => c.unit_id).filter((id): id is string => id !== null))];
        const moduleIds = [...new Set(filtered.map(c => c.module_id).filter((id): id is string => id !== null))];

        const [unitsRes, modulesRes] = await Promise.all([
          unitIds.length > 0
            ? batchClient.from('units').select('id, title').in('id', unitIds)
            : Promise.resolve({ data: [], error: null }),
          moduleIds.length > 0
            ? batchClient.from('modules').select('id, name').in('id', moduleIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        const unitMap = new Map<string, string>();
        for (const u of (unitsRes.data ?? [])) {
          const row = u as { id: string; title: string };
          unitMap.set(row.id, row.title);
        }

        const moduleMap = new Map<string, string>();
        for (const m of (modulesRes.data ?? [])) {
          const row = m as { id: string; name: string };
          moduleMap.set(row.id, row.name);
        }

        // 7. Apply module_name filter (after fetching module data)
        if (module_name) {
          const moduleNameLower = module_name.toLowerCase();
          filtered = filtered.filter(c => {
            if (!c.module_id) return false;
            const name = moduleMap.get(c.module_id) ?? '';
            return name.toLowerCase().includes(moduleNameLower);
          });
        }

        // 8. Batch-fetch related_chunk_ids
        const chunkIds = filtered.map(c => c.id);
        const relMap = new Map<string, string[]>();

        if (chunkIds.length > 0) {
          const [sourceRelsRes, targetRelsRes] = await Promise.all([
            batchClient
              .from('sf_concept_relationships')
              .select('source_chunk_id, target_chunk_id')
              .in('source_chunk_id', chunkIds),
            batchClient
              .from('sf_concept_relationships')
              .select('source_chunk_id, target_chunk_id')
              .in('target_chunk_id', chunkIds),
          ]);

          for (const rel of (sourceRelsRes.data ?? [])) {
            const row = rel as { source_chunk_id: string; target_chunk_id: string };
            if (!row.source_chunk_id || !row.target_chunk_id) continue;
            const existing = relMap.get(row.source_chunk_id) ?? [];
            relMap.set(row.source_chunk_id, [...existing, row.target_chunk_id]);
          }
          for (const rel of (targetRelsRes.data ?? [])) {
            const row = rel as { source_chunk_id: string; target_chunk_id: string };
            if (!row.source_chunk_id || !row.target_chunk_id) continue;
            const existing = relMap.get(row.target_chunk_id) ?? [];
            relMap.set(row.target_chunk_id, [...existing, row.source_chunk_id]);
          }
        }

        // 9. Paginate and assemble results
        const totalCount = filtered.length;
        const paginated = filtered.slice(offset, offset + limit);

        const results: KnowledgeSearchResult[] = paginated.map(c => ({
          id: c.id,
          chunk_text: c.chunk_text,
          content_type: c.content_type,
          difficulty: c.difficulty,
          sf_topics: c.sf_topics ?? [],
          section_header: c.section_header,
          module_id: c.module_id,
          unit_id: c.unit_id,
          module_name: c.module_id ? (moduleMap.get(c.module_id) ?? null) : null,
          unit_title: c.unit_id ? (unitMap.get(c.unit_id) ?? null) : null,
          relevance_score: c.relevance_score,
          related_chunk_ids: relMap.get(c.id) ?? [],
        }));

        return reply.send(success({ results, count: totalCount, offset, limit }));
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.status_code).send(error(err.code, err.message, err.details));
        }
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'GET /api/knowledge/search error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );
};
```

### Test Mock Pattern (Task 2.1)

**File:** `apps/api/src/routes/knowledge.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { bearerAuth } from '../plugins/auth.js';
import { pgBossPlugin } from '../plugins/pg-boss.js';

// Mock config
vi.mock('../config.js', () => ({
  config: {
    port: 3001,
    bearerToken: 'test-bearer-token-that-is-at-least-32-characters-long-xxx',
    supabaseUrl: 'https://test.supabase.co',
    supabaseServiceKey: 'test-key',
    anthropicApiKey: 'test-key',
    openaiApiKey: 'test-key',
    databaseUrl: 'postgresql://test',
    nodeEnv: 'test',
  },
}));

// Mock AI SDK embed()
const { mockEmbed } = vi.hoisted(() => {
  const mockEmbed = vi.fn().mockResolvedValue({
    embedding: new Array(1536).fill(0.1),
    usage: { tokens: 10 },
  });
  return { mockEmbed };
});
vi.mock('ai', () => ({ embed: mockEmbed }));

// Mock @ai-sdk/openai
const { mockOpenai } = vi.hoisted(() => {
  const mockEmbeddingModel = { type: 'embedding', modelId: 'text-embedding-3-small' };
  const mockOpenai = { embedding: vi.fn().mockReturnValue(mockEmbeddingModel) };
  return { mockOpenai };
});
vi.mock('@ai-sdk/openai', () => ({ openai: mockOpenai }));

// Mock Supabase with realistic fixture data
const mockChunk = {
  id: 'chunk-1',
  module_id: 'module-1',
  unit_id: 'unit-1',
  chunk_text: 'Apex triggers allow you to perform custom actions before or after DML events.',
  content_type: 'explanation',
  difficulty: 'intermediate',
  sf_topics: ['Apex', 'Triggers'],
  section_header: 'Understanding Apex Triggers',
  relevance_score: 0.95,
};

// Default mock: successful search with one result
vi.mock('@trailblaze/db', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ data: [mockChunk], error: null }),
    from: vi.fn((table: string) => {
      if (table === 'units') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'unit-1', title: 'Apex Triggers Deep Dive' }],
              error: null,
            }),
          })),
        };
      }
      if (table === 'modules') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'module-1', name: 'Apex Fundamentals' }],
              error: null,
            }),
          })),
        };
      }
      if (table === 'sf_concept_relationships') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        };
      }
      return { select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })) };
    }),
  })),
}));

// Mock pg-boss
vi.mock('pg-boss', () => ({
  default: class {
    on = vi.fn();
    start = vi.fn().mockResolvedValue(undefined);
    createQueue = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    getQueueSize = vi.fn().mockResolvedValue(0);
    send = vi.fn().mockResolvedValue(undefined);
  },
}));

// Import after mocks
import { knowledgeRoutes } from './knowledge.js';

const AUTH_HEADER = 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx';

// Helper to build a test app
async function buildTestApp() {
  const app = Fastify({ logger: false });
  await app.register(bearerAuth);
  await app.register(pgBossPlugin);
  await app.register(knowledgeRoutes);
  return app;
}

describe('GET /api/knowledge/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default successful mock after each test
    mockEmbed.mockResolvedValue({ embedding: new Array(1536).fill(0.1), usage: { tokens: 10 } });
  });

  it('returns 401 without Authorization header', async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/knowledge/search?q=apex' });
    expect(response.statusCode).toBe(401);
  });

  it('returns 400 when q query param is missing', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search',
      headers: { authorization: AUTH_HEADER },
    });
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with results including all required fields', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex+triggers',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.results).toBeInstanceOf(Array);
    expect(body.data.count).toBeGreaterThanOrEqual(0);
    expect(body.data.offset).toBe(0);
    expect(body.data.limit).toBe(10);

    if (body.data.results.length > 0) {
      const result = body.data.results[0];
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('chunk_text');
      expect(result).toHaveProperty('content_type');
      expect(result).toHaveProperty('sf_topics');
      expect(result).toHaveProperty('module_name');
      expect(result).toHaveProperty('unit_title');
      expect(result).toHaveProperty('relevance_score');
      expect(result).toHaveProperty('related_chunk_ids');
      expect(Array.isArray(result.related_chunk_ids)).toBe(true);
    }
  });

  it('returns empty array with count 0 when RPC returns no results', async () => {
    const { createClient } = await import('@trailblaze/db');
    vi.mocked(createClient).mockReturnValueOnce({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    } as never);

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=nonexistent+topic+xyz',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.results).toEqual([]);
    expect(body.data.count).toBe(0);
  });

  it('calls embed() with the query text', async () => {
    const app = await buildTestApp();
    await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex+triggers',
      headers: { authorization: AUTH_HEADER },
    });

    expect(mockEmbed).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'apex triggers' }),
    );
  });

  it('calls supabase.rpc with knowledge_search and the generated embedding', async () => {
    const { createClient } = await import('@trailblaze/db');
    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(createClient).mockReturnValueOnce({
      rpc: mockRpc,
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    } as never);

    const app = await buildTestApp();
    await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=soql',
      headers: { authorization: AUTH_HEADER },
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'knowledge_search',
      expect.objectContaining({
        query_text: 'soql',
        query_embedding: expect.any(Array),
        match_count: expect.any(Number),
      }),
    );
  });

  it('applies content_type filter — only returns matching chunks', async () => {
    const { createClient } = await import('@trailblaze/db');
    const codeChunk = { ...mockChunk, id: 'code-chunk', content_type: 'code', relevance_score: 0.9 };
    const explanationChunk = { ...mockChunk, id: 'explanation-chunk', content_type: 'explanation', relevance_score: 0.8 };
    vi.mocked(createClient).mockReturnValueOnce({
      rpc: vi.fn().mockResolvedValue({ data: [codeChunk, explanationChunk], error: null }),
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    } as never);

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex&content_type=code',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.results.every((r: { content_type: string }) => r.content_type === 'code')).toBe(true);
  });

  it('applies sf_topics filter — only returns chunks with overlapping topics', async () => {
    const { createClient } = await import('@trailblaze/db');
    const apexChunk = { ...mockChunk, id: 'apex-chunk', sf_topics: ['Apex', 'Triggers'], relevance_score: 0.9 };
    const soqlChunk = { ...mockChunk, id: 'soql-chunk', sf_topics: ['SOQL', 'Data Management'], relevance_score: 0.8 };
    vi.mocked(createClient).mockReturnValueOnce({
      rpc: vi.fn().mockResolvedValue({ data: [apexChunk, soqlChunk], error: null }),
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    } as never);

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex&sf_topics=Apex',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const ids = body.data.results.map((r: { id: string }) => r.id);
    expect(ids).toContain('apex-chunk');
    expect(ids).not.toContain('soql-chunk');
  });

  it('returns 500 when embed() throws an error', async () => {
    mockEmbed.mockRejectedValueOnce(new Error('OpenAI API rate limit'));

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('PIPELINE_ERROR');
  });

  it('returns 500 when supabase RPC returns an error', async () => {
    const { createClient } = await import('@trailblaze/db');
    vi.mocked(createClient).mockReturnValueOnce({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'RPC execution failed' } }),
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    } as never);

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('PIPELINE_ERROR');
  });
});
```

### Key Architectural Patterns to Follow

**1. Structural Types for RPC and batch queries (established pattern):**
- `KnowledgeRpcClient` for `supabase.rpc()` — RPC is not in generated types
- `BatchSelectClient` for `.from(table).select(cols).in(col, vals)` — batch enrichment
- Always cast via `as unknown as TargetType` (never `as any`)

**2. Zod safeParse for RPC results:**
- `hybrid_search()` and `knowledge_search()` return data written by the database, NOT an LLM
- Still use safeParse for defense — if schema fails, fall back to empty array
- Use `z.array(chunkRowSchema).safeParse(rawResults ?? [])` pattern

**3. embed() import (from Story 3-2 learnings):**
- Use `embed()` from `'ai'` (NOT `embedMany()` — we have one query)
- Use `openai.embedding('text-embedding-3-small')` from `'@ai-sdk/openai'` (`@^2` version)
- `@ai-sdk/openai@^2` is already installed — no new dependency needed

**4. Route error handling:**
- embed() failure → catch + return 500 (separate try/catch so we can distinguish from general errors)
- RPC error → check `rpcError` and return 500
- All other errors → global catch, map AppError → status code, others → 500

**5. Performance (NFR1: <2s):**
- Use `Promise.all()` for parallel batch fetches (units + modules together, relationships source + target together)
- Set `match_count: 50` — never more, keeps RPC fast
- In-TypeScript post-filtering is O(N) on 50 items — negligible

**6. ESM imports:**
- `import { knowledgeRoutes } from './routes/knowledge.js'` (`.js` extension required)
- `import { embed } from 'ai'` (package import, no `.js`)
- `import { openai } from '@ai-sdk/openai'` (package import, no `.js`)

**7. Route query param parsing:**
- `sf_topics` is passed as comma-separated string: `?sf_topics=Apex,SOQL`
- Split in handler: `sf_topics.split(',').map(t => t.trim()).filter(Boolean)`
- NOT as repeated `?sf_topics[]=Apex&sf_topics[]=SOQL` (too complex for Fastify default parsing)

### Previous Story Learnings Applicable to 3-4

From Stories 3.1-3.3 and AGENTS.md:
- `vi.hoisted()` required for ESM mock hoisting — must appear BEFORE import statements
- `as unknown as T` for structural type casts (never `as any`)
- Guard against null before calling `.in()` with empty arrays — `if (unitIds.length > 0)`
- Supabase returns `{ error }` object (does NOT throw) — always check error field
- `AppError` hierarchy from `'../lib/errors.js'` — use for typed error handling
- `success()` / `error()` from `'../lib/response.js'` — always use these for ApiResponse
- Use `vi.clearAllMocks()` in `beforeEach()` to prevent test state leakage
- Test file imports happen AFTER all `vi.mock()` calls

### Project Structure Notes

New files this story creates:
- `packages/db/supabase/migrations/012_knowledge_search_function.sql`
- `apps/api/src/routes/knowledge.ts`
- `apps/api/src/routes/knowledge.test.ts`

Modified files:
- `apps/api/src/app.ts` — add import + `await app.register(knowledgeRoutes)`

No changes to:
- `packages/shared/src/types/trailhead.ts` — KnowledgeSearchResult defined inline in route
- `packages/db/supabase/migrations/007_functions.sql` — `hybrid_search()` unchanged
- Any pipeline stage files — this story is a route, not a pipeline stage

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.4 — Acceptance criteria and FR coverage]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-6 — Hybrid search RRF function design]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-5 — text-embedding-3-small via AI SDK embedMany]
- [Source: _bmad-output/planning-artifacts/architecture.md#AR18 — ApiResponse envelope pattern]
- [Source: packages/db/supabase/migrations/007_functions.sql — existing hybrid_search() function]
- [Source: packages/db/supabase/migrations/002_knowledge_tables.sql — sf_knowledge_chunks base schema]
- [Source: packages/db/supabase/migrations/009_knowledge_chunk_columns.sql — content_type, difficulty, sf_topics, unit_id columns]
- [Source: packages/db/supabase/migrations/011_concept_relationship_columns.sql — source_chunk_id, target_chunk_id for related_chunk_ids]
- [Source: apps/api/src/routes/modules.ts — FastifyPluginAsync pattern, Zod validation, error handling template]
- [Source: apps/api/src/routes/modules.test.ts — test structure, mock pattern, app.inject() usage]
- [Source: apps/api/src/app.ts — route registration order, plugin dependencies]
- [Source: AGENTS.md — AI SDK versioning: ai@6 + @ai-sdk/openai@^2 for embed()]
- [Source: .ralph-progress.md — structural type patterns, vi.hoisted() mock requirement]

## Dev Agent Record

### Agent Model Used

Claude Haiku 4.5 (claude-haiku-4-5-20251001)

### Debug Log References

### Completion Notes List

All tasks implemented and tested. TDD approach followed:
- RED phase confirmed: tests failed with "cannot find module" error before implementation
- GREEN phase achieved: all 10 knowledge route tests pass
- REFACTOR: code follows established patterns, no cleanup needed
- Full test suite: 256 tests passing (API) + 101 tests passing (web)
- Type-check: 0 errors across all packages
- No regressions in existing test suites

### File List

**Created:**
1. `/mnt/d/ailocal/TrailblazeAi/packages/db/supabase/migrations/012_knowledge_search_function.sql` - Migration with `knowledge_search()` RPC function using RRF re-ranking and returning relevance_score
2. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/routes/knowledge.ts` - GET /api/knowledge/search route with query embedding, filtering, and batch enrichment
3. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/routes/knowledge.test.ts` - 10 comprehensive tests covering auth, validation, filtering, error handling, and RPC calls

**Modified:**
1. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/app.ts` - Added import and registration of knowledgeRoutes after modulesRoutes
