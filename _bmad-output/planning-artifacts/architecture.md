---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-TrailblazeAi-2026-02-17.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/research/AI-powered-Trailhead-completion-assistant-full-architecture-blueprint.md
  - _bmad-output/planning-artifacts/research/TrailBlazeAI-BMAD-V6-Action-Plan.md
  - _bmad-output/project-context.md
workflowType: 'architecture'
project_name: 'TrailblazeAi'
user_name: 'Demi'
date: '2026-02-17'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (37 FRs across 6 domains):**

| Domain | FRs | Architectural Impact |
|--------|-----|---------------------|
| Content Acquisition (FR1-FR7) | Trailmix import, content scraping, session management, Shadow DOM handling | Requires dedicated browser automation service on VPS with persistent profiles. MCP integration for Playwright. |
| Knowledge Processing (FR8-FR12) | Structure-aware chunking, embeddings, vector storage, entity extraction | Dedicated processing pipeline stage. pgvector + full-text indexing in Supabase. Salesforce-specific NLP. |
| Knowledge Retrieval (FR13-FR16) | Hybrid search, filtering, re-ranking | Supabase RPC functions for server-side search. Two-stage retrieval for quiz answering. |
| Quiz Automation (FR17-FR22) | Chain-of-thought reasoning, confidence scoring, answer submission, low-confidence flagging | LLM integration (Claude) with structured prompting. Review gate in frontend. Browser submission via Playwright. |
| Pipeline Orchestration (FR23-FR28) | Job queue, concurrency limits, retries, stage chaining, pause/resume | pg-boss on Supabase PostgreSQL. Priority ordering. State machine per module. |
| System Operations (FR29-FR37) | Health, status, progress, logging, Docker deployment, knowledge export | Fastify REST API. Agent action logging with cost tracking. Containerized deployment. |

**Non-Functional Requirements (25 NFRs, 6 categories):**

| Category | Key Constraints | Architecture Driver |
|----------|----------------|-------------------|
| Performance | Hybrid search <2s, 10+ modules/hr scraping, 100+ chunks/min embedding | Optimized DB indexes (HNSW), batched API calls, concurrent pipeline stages |
| Security | Env-only credentials, Bearer token API auth, RLS policies, isolated browser profiles | Service role vs anon key separation, Docker volume isolation, no secrets in code |
| Reliability | 3 retries with backoff, survives restarts, 72hr unattended, <5% failure rate | pg-boss dead letter queue, Supabase state persistence, graceful degradation |
| Integration | Playwright MCP stdio, Supabase connection pooling, LLM retry on 429, configurable timeouts | MCP client factory, circuit breaker patterns, exponential backoff |
| Cost | $20-50/month, <$15 one-time, per-run cost tracking | Model tiering (Haiku/Sonnet), batch API, prompt caching, memory limits per container |
| Observability | Agent action logging, status API, aggregated metrics | Structured logging table, REST query endpoints, token/cost tracking |

**Scale & Complexity:**

- Primary domain: Full-stack (Next.js + Fastify + Supabase + Playwright + Claude)
- Complexity level: **Medium-High**
- Estimated architectural components: ~12 major (API server, worker, job queue, 4 agent types, knowledge store, hybrid search, frontend dashboard, review panel, knowledge explorer)

### Technical Constraints & Dependencies

| Constraint | Impact |
|-----------|--------|
| Hetzner CX33 (4 vCPU, 8GB RAM) | Max 2 concurrent browser pages, container memory limits (API 512MB, Worker 3GB) |
| Vercel Hobby tier | 25s Edge timeout, 10s API Route timeout — no long-running ops on Vercel |
| Supabase Free tier | 500MB database, pauses after 7 days inactivity. Pro upgrade ($25/mo) if needed |
| No Trailhead API | 100% browser scraping for content. Internal GraphQL only for profile/badge data |
| Shadow DOM / LWC | Runtime-generated IDs — must use accessibility tree snapshots, not CSS selectors |
| Salesforce session expiry | Persistent browser profiles + session detection + user alert flow |
| AI SDK v5 (project context says v5) | Agent orchestration, Anthropic provider, MCP client support |

### Cross-Cutting Concerns Identified

1. **Session management** — Salesforce auth persistence affects scraping, quiz submission, and hands-on challenges. Must propagate session state across worker restarts.
2. **Error recovery & retry** — Every pipeline stage needs configurable retry with exponential backoff. Dead letter queue for permanent failures. Frontend must show recovery status.
3. **Cost tracking** — Every LLM call across all agents must log tokens and estimated cost. Aggregated per-run and per-module visibility.
4. **Real-time state propagation** — Module status changes on VPS must reach the frontend immediately via Supabase Realtime. No polling, no SSE through Vercel.
5. **Concurrency control** — Browser pages (max 2), API calls (rate limits), embedding batches. Backpressure when queues build up.
6. **Module state machine** — Each module flows through well-defined states (pending -> scraping -> scraped -> processing -> ready -> completed/failed). Must be consistent across all services.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack TypeScript monorepo (Next.js frontend + Fastify backend + Supabase) with AI/automation focus. This is an existing scaffolded project, not a greenfield starter selection.

### Starter Options Considered

This project uses a **custom monorepo scaffold** rather than an off-the-shelf starter template. The foundation was assembled from individual best-in-class tools rather than a single starter (e.g., create-t3-app), because:

1. **Hybrid deployment** (Vercel + VPS) doesn't match any standard starter's assumptions
2. **AI SDK + MCP integration** is a novel pattern not yet in mainstream starters
3. **pg-boss over Redis** is an uncommon but architecturally superior choice for this use case
4. **Playwright MCP** as a first-class dependency has no starter template support

### Selected Approach: Custom Monorepo (Already Scaffolded)

**Rationale:** The project's hybrid deployment model (Vercel frontend + Docker VPS backend) with MCP tool integration and pg-boss job queuing doesn't align with any existing starter template. The custom scaffold was the correct choice.

**Existing Structure:**

```
trailblaze-ai/
  apps/web/          → Next.js 15, Tailwind v4, shadcn/ui, AI SDK, Supabase SSR
  apps/api/          → Fastify 5, pg-boss, AI SDK + MCP, Zod validation
  packages/db/       → Supabase client factory + generated types
  packages/shared/   → Domain types + constants
  docker/            → Compose + Dockerfiles
```

### Architectural Decisions Provided by Scaffold

**Language & Runtime:**
- TypeScript ^5.7, strict mode, ESM everywhere (`"type": "module"`)
- Node.js >=18 (production target >=22)
- pnpm 9.15.4 workspaces for dependency management

**Styling Solution:**
- Tailwind CSS v4 (CSS-first config via `@theme` directives in globals.css)
- shadcn/ui new-york style with Radix UI ^1.4.3 primitives
- class-variance-authority + clsx + tailwind-merge for component variants

**Build Tooling:**
- Turborepo ^2.4 for monorepo orchestration (dev, build, type-check, lint, clean)
- tsup ^8 for API server bundling (ESM output + declarations)
- tsx ^4.19 for API development (watch mode)
- Next.js built-in for frontend bundling
- Prettier ^3.5 for formatting

**Validation & Type Safety:**
- Zod ^3.24 for all external data boundaries (env vars, API inputs)
- Supabase generated types via CLI (`supabase gen types typescript`)
- Workspace packages (@trailblaze/db, @trailblaze/shared) for shared domain types

**AI & Integration:**
- Vercel AI SDK ^5 with @ai-sdk/anthropic ^2
- @ai-sdk/mcp ^0 for MCP client integration
- @supabase/supabase-js ^2.49 + @supabase/ssr ^0.5
- Fastify ^5.2 with bearer-auth, CORS, rate-limit plugins
- pg-boss ^10 for job queue orchestration

**Open Decisions (Not Yet Selected):**
- Testing framework (Vitest recommended based on ecosystem)
- Docker container configuration details
- Database schema and migrations
- MCP server deployment patterns
- Agent orchestration patterns

**Note:** Project initialization is complete. The first implementation stories should focus on database schema, Docker configuration, and core API routes.

## Core Architectural Decisions

### Decision 1: System Architecture — Hybrid Deployment (Vercel + VPS + Supabase)

**Decision:** Three-tier architecture with clear separation of concerns:
- **Vercel** (free): Next.js 15 frontend — SSR dashboard, quiz review panel, knowledge explorer
- **Hetzner VPS** (CX33, €5.49/mo): Fastify API + pg-boss workers + Playwright browser automation
- **Supabase** (free/pro): PostgreSQL + pgvector + Realtime + Auth — shared state between all tiers

**Rationale:**
- Vercel's 25s Edge timeout prohibits long-running operations (scraping, LLM calls), so all automation must live on VPS
- Supabase Realtime Postgres Changes eliminates the need for WebSocket tunneling through Vercel — VPS writes status to Supabase, frontend receives it instantly via WebSocket subscription
- pg-boss uses the existing Supabase PostgreSQL instance, eliminating a Redis dependency and saving ~128MB RAM

**Trade-offs:**
- (+) Each tier scales independently; Vercel handles frontend traffic, VPS handles compute-heavy tasks
- (+) No additional infrastructure for real-time communication
- (-) VPS is a single point of failure for automation (mitigated by Supabase state persistence — resumes after VPS restart)
- (-) Two deployment targets instead of one

**Alternatives rejected:**
- All-Vercel with serverless functions: Timeout constraints make browser automation impossible
- All-VPS with self-hosted Next.js: Loses Vercel's CDN, preview deployments, and zero-config HTTPS

---

### Decision 2: Browser Automation — Playwright MCP Primary, Stagehand Fallback

**Decision:** Use **Playwright MCP** (`microsoft/playwright-mcp`) as the primary browser automation layer running on the VPS in stdio mode. Add **Stagehand v3** as a targeted fallback for dynamic content extraction where accessibility tree snapshots fail.

**Primary (Playwright MCP):**
- Operates on accessibility tree snapshots (not screenshots) — fast, LLM-friendly, no vision model needed
- Exposes MCP tools: `browser_navigate`, `browser_click`, `browser_type`, `browser_snapshot`, `browser_evaluate`
- Persistent browser profiles for Trailhead session management at `~/.cache/ms-playwright/mcp-{channel}-profile`
- ~512MB-1GB RAM overhead, runs in Docker with Microsoft's official Playwright image

**Fallback (Stagehand v3):**
- TypeScript library built on Playwright (21.1k stars), provides `extract()` with Zod schema validation
- Action caching reduces LLM costs by 80%+ on repeated similar page layouts
- Self-healing selectors handle Shadow DOM/LWC dynamic ID changes
- Use specifically for: Shadow DOM content extraction failures, complex multi-step form interactions

**Rationale:**
- Playwright MCP costs ~$0 per interaction (LLM only for decision-making, not navigation)
- Stagehand costs ~$0.05-0.15 per interaction (LLM per action) — 3-5x more expensive, but handles edge cases
- Trailhead's Lightning Web Components use Shadow DOM with runtime-generated IDs — accessibility tree handles 90%+ of cases, Stagehand covers the rest

**Integration pattern:**
```typescript
// Primary: Playwright MCP via AI SDK
const playwrightMCP = await createMCPClient({
  transport: { type: 'stdio', command: 'npx', args: ['@playwright/mcp@latest'] }
});

// Fallback: Stagehand extract() for specific extraction failures
import { Stagehand } from '@anthropic-ai/stagehand';
const stagehand = new Stagehand({ modelName: 'claude-sonnet-4-5' });
const data = await stagehand.extract({ instruction: '...', schema: z.object({...}) });
```

---

### Decision 3: Knowledge Pipeline — Shared-State Sequential Pipeline

**Decision:** Implement a 6-stage sequential pipeline where each stage reads from and writes to Supabase tables (shared state). Stages are independent pg-boss jobs chained through completion handlers.

**Pipeline stages:**

```
1. ScrapeUnit        → Extract raw HTML from Trailhead page
2. ExtractContent    → Parse HTML into structured sections (headers, text, code, quizzes)
3. IdentifyConcepts  → LLM extracts Salesforce concepts, tags, relationships (YAML-validated with Zod)
4. ChunkContent      → Structure-aware chunking with ChonkieJS + custom Trailhead rules
5. GenerateEmbeddings → Batch embed via AI SDK embedMany()
6. BuildRelationships → LLM maps concept dependencies (prerequisite, related_to, part_of)
```

**Key patterns (from PocketFlow + DeepTutor research):**

- **Index-based cross-referencing:** Units get numeric indices; chunks reference unit indices throughout. No duplicate content copying between stages — chunks store `unit_id` foreign keys.
- **Progressive context accumulation:** When processing a quiz, include knowledge from all previously processed units in the same module. Later units benefit from richer context.
- **YAML-validated LLM extraction:** All LLM calls returning structured data use Zod schema validation. Failed validation triggers one retry with the error message appended to the prompt.
- **Two-phase concept analysis:** "Identify concepts" and "analyze relationships" are separate stages. This reduces prompt complexity and enables independent retry without re-running upstream.

**Rationale:**
- Sequential stages with Supabase as shared state provide crash recovery — if stage 4 fails, resume from stage 4 without re-scraping
- Each stage is a separate pg-boss queue with stage-specific retry configuration
- The pattern mirrors PocketFlow's proven approach adapted for TypeScript/Supabase

---

### Decision 4: Chunking Strategy — ChonkieJS + Custom Trailhead Rules

**Decision:** Use **ChonkieJS** (TypeScript, 310 stars) as the base chunking library with a custom Trailhead-specific layer on top.

**Base layer (ChonkieJS):**
- Recursive character splitting with configurable overlap
- Token counting integration (tiktoken)
- 400-512 tokens per chunk, 50-100 token overlap

**Custom Trailhead rules (layered on top):**
- **Code blocks:** Keep intact as separate chunks, never split mid-block
- **Quiz questions:** Atomic — one question + all options + correct answer = one chunk with `content_type: 'quiz'`
- **Hands-on steps:** Group sequential steps together (~800 tokens), tagged `content_type: 'hands_on'`
- **Section headers:** Preserved as chunk metadata for filtered retrieval

**Rationale:**
- ChonkieJS handles the mechanical chunking (splitting, overlap, token counting)
- Custom rules handle domain-specific requirements that no generic library addresses
- Alternative (LlamaIndex.TS SentenceSplitter) adds 101KB+ of LangChain-adjacent overhead for comparable functionality

---

### Decision 5: Embedding Model & Storage — text-embedding-3-small via AI SDK embedMany

**Decision:** Use **OpenAI text-embedding-3-small** (1536 dimensions) with **Vercel AI SDK `embedMany()`** for batch processing, stored in **Supabase pgvector** with HNSW indexing.

**Configuration:**
```typescript
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: chunkTexts,        // string[]
  maxRetries: 3,
  maxParallelCalls: 5,       // 5 concurrent embedding batches
});
```

**Why AI SDK embedMany over raw OpenAI client:**
- Built-in retry logic with configurable `maxRetries`
- Automatic batch splitting when exceeding model limits
- Parallel processing control via `maxParallelCalls`
- Token usage tracking in response metadata
- Provider-agnostic — can swap to Cohere, Mistral, or local models without code changes

**Storage:**
```sql
-- HNSW index (better recall than IVFFlat, no training step)
CREATE INDEX ON sf_knowledge_chunks
  USING hnsw (embedding vector_ip_ops)
  WITH (m = 16, ef_construction = 64);
```

**Cost:** ~$0.004 total for 100 modules (~200K tokens). Negligible.

**Upgrade path:** If retrieval quality needs improvement, switch to text-embedding-3-large compressed to 512 dimensions (Supabase-recommended for hybrid search) — requires only a config change + re-embedding.

---

### Decision 6: Hybrid Search — First-Party Supabase RRF Function

**Decision:** Implement hybrid search as a **Supabase SQL function** using Reciprocal Rank Fusion (RRF) to combine full-text search with vector similarity. No LangChain, no external vector DB.

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10,
  full_text_weight FLOAT DEFAULT 1.5,  -- Higher weight for Salesforce terminology
  semantic_weight FLOAT DEFAULT 1.0,
  rrf_k INT DEFAULT 50
) RETURNS SETOF sf_knowledge_chunks AS $$
  WITH full_text AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(fts, websearch_to_tsquery(query_text)) DESC) AS rank
    FROM sf_knowledge_chunks
    WHERE fts @@ websearch_to_tsquery(query_text)
    ORDER BY rank LIMIT match_count * 2
  ),
  semantic AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <#> query_embedding) AS rank
    FROM sf_knowledge_chunks
    ORDER BY rank LIMIT match_count * 2
  )
  SELECT c.*
  FROM sf_knowledge_chunks c
  JOIN (
    SELECT COALESCE(f.id, s.id) AS id,
      COALESCE(1.0 / (rrf_k + f.rank), 0.0) * full_text_weight +
      COALESCE(1.0 / (rrf_k + s.rank), 0.0) * semantic_weight AS score
    FROM full_text f FULL OUTER JOIN semantic s ON f.id = s.id
  ) ranked ON c.id = ranked.id
  ORDER BY ranked.score DESC
  LIMIT match_count;
$$ LANGUAGE sql;
```

**Caller:**
```typescript
const results = await supabase.rpc('hybrid_search', {
  query_text: question,
  query_embedding: questionEmbedding,
  match_count: 10,
});
```

**Why full_text_weight=1.5:**
- Salesforce has specific terminology (Apex, SOQL, Flow Builder, Lightning Web Components) that benefits from exact keyword matching
- Semantic search catches paraphrased concepts; full-text search catches exact Salesforce jargon
- Tested ratio from Supabase documentation — adjustable based on quiz accuracy metrics

**Rationale:**
- First-party Supabase pattern — maintained, tested, documented
- Zero additional dependencies (no LangChain.js at 101KB+ gzipped)
- Executes entirely in PostgreSQL — no network hops to external vector DBs
- RRF is proven for combining heterogeneous ranking signals

---

### Decision 7: Agent Orchestration — AI SDK v5 with Tiered Model Selection

**Decision:** Use **Vercel AI SDK v5** Agent class for all LLM orchestration. Implement a tiered model strategy:

| Task | Model | Rationale |
|------|-------|-----------|
| Content extraction & concept identification | Claude Haiku 4.5 | High volume, structured output, cost-sensitive |
| Quiz answering & reasoning | Claude Sonnet 4.5 | Accuracy-critical, chain-of-thought reasoning |
| Knowledge synthesis & relationship mapping | Claude Sonnet 4.5 | Requires cross-document understanding |
| Content summarization & note generation | Claude Haiku 4.5 | Volume task, quality threshold lower |

**Four specialized agents:**

1. **Scraper Agent** — Playwright MCP tools, navigates Trailhead, extracts content. ReAct loop with `stepCountIs(20)` limit.
2. **Knowledge Agent** — Processes extracted content through chunking → embedding → storage. pg-boss worker.
3. **Quiz Agent** — Hybrid search → context retrieval → chain-of-thought reasoning → answer selection with confidence score. Review gate for confidence < 80%.
4. **Documentation Agent** — Supplements knowledge base with Salesforce DX MCP for metadata enrichment.

**Agent communication:** Supabase tables as shared state (not direct agent-to-agent messaging). Each agent reads inputs from and writes outputs to well-defined tables. Status changes propagate via Supabase Realtime.

**Key pattern from DeepTutor research — YAML-driven prompt configuration:**
- Agent prompts stored in `apps/api/src/prompts/` as YAML files
- Each agent loads prompts by section/field lookup at initialization
- Iterate on prompts without code changes, version-controlled alongside code

---

### Decision 8: Job Queue — pg-boss with Queue-Per-Stage Pattern

**Decision:** Use **pg-boss v10** with separate named queues per pipeline stage, each with stage-specific retry configuration.

**Queue definitions:**
```typescript
// Fastify plugin initialization
await boss.createQueue('scrape-module',       { retryLimit: 3, retryBackoff: true, expireInHours: 1 });
await boss.createQueue('extract-content',     { retryLimit: 2, retryBackoff: true, expireInHours: 0.5 });
await boss.createQueue('identify-concepts',   { retryLimit: 2, retryBackoff: true, expireInHours: 0.5 });
await boss.createQueue('chunk-content',       { retryLimit: 2, expireInMinutes: 10 });
await boss.createQueue('generate-embeddings', { retryLimit: 3, retryBackoff: true, expireInMinutes: 15 });
await boss.createQueue('build-relationships', { retryLimit: 2, retryBackoff: true, expireInHours: 0.5 });
await boss.createQueue('answer-quiz',         { retryLimit: 2, retryBackoff: true, expireInHours: 0.5 });
```

**Chaining pattern:**
```typescript
boss.work('scrape-module', async (job) => {
  const result = await scrapeUnit(job.data);
  await boss.send('extract-content', { unitId: result.unitId, moduleId: job.data.moduleId });
});
```

**Concurrency limits:**
- `scrape-module`: 2 concurrent (max 2 browser pages on 8GB VPS)
- `generate-embeddings`: 5 concurrent (OpenAI rate limits)
- `answer-quiz`: 3 concurrent (Claude rate limits)
- All others: 5 concurrent (CPU-bound processing)

**Priority ordering:** Quiz-ready modules get priority=1, content modules get priority=5. Users see quiz results faster.

**Dead letter queue:** Failed jobs after all retries move to `dead-letter-{queue-name}`. Surfaced in frontend as "failed" status with retry button.

**Rationale:**
- Uses existing Supabase PostgreSQL — no Redis, no additional infrastructure
- Queue-per-stage enables stage-specific monitoring, retry config, and concurrency
- pg-boss supports `pause()` / `resume()` per queue for pipeline control from the dashboard

---

### Decision 9: Frontend-Backend Communication — Dual Realtime Pattern

**Decision:** Use two distinct Supabase Realtime patterns based on update frequency:

**Pattern A — Status changes (infrequent, important):**
```typescript
// Module status updates → router.refresh() for Server Component re-render
supabase.channel('module-status')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'modules',
    filter: 'trailmix_id=eq.{id}'
  }, () => {
    router.refresh(); // Re-fetches server data, re-renders RSC
  })
  .subscribe();
```
- Server Components fetch fresh data from Supabase on each refresh
- Ensures data consistency — single source of truth is the server
- Used for: module status transitions, quiz results, badge completions

**Pattern B — Live agent logs (frequent, ephemeral):**
```typescript
// Agent activity stream → direct useState update (no server round-trip)
const [logs, setLogs] = useState<AgentLog[]>([]);
supabase.channel('agent-logs')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'agent_logs',
    filter: 'run_id=eq.{runId}'
  }, (payload) => {
    setLogs(prev => [...prev, payload.new as AgentLog]);
  })
  .subscribe();
```
- Direct client-side state update — faster UI, no server round-trip
- Used for: live scraping progress, LLM reasoning steps, queue position updates

**Rationale:**
- Avoids polling or SSE through Vercel (25s Edge timeout makes SSE unreliable)
- Dual pattern optimizes for both data consistency (Pattern A) and responsiveness (Pattern B)
- Supabase Realtime is already available — zero additional infrastructure

**Tables to enable Realtime publication on:**
- `modules` (status changes)
- `agent_logs` (live activity stream)
- `quiz_results` (answer submissions)

---

### Decision 10: Authentication & Session Management

**Decision:** Three-layer auth strategy:

**Layer 1 — Frontend auth (Supabase Auth):**
- Email/password for single-user access (Demi)
- 3-file pattern from Supabase templates:
  - `lib/supabase/client.ts` — `createBrowserClient` from `@supabase/ssr`
  - `lib/supabase/server.ts` — `createServerClient` with cookie handling
  - `middleware.ts` — Session refresh on every request using `getClaims()` (local JWT validation, no network round-trip) instead of `getUser()`
- RLS policies on all tables restrict to authenticated user

**Layer 2 — VPS API auth (Bearer token):**
- Vercel API routes proxy to VPS with `Authorization: Bearer {VPS_API_SECRET}`
- Fastify `@fastify/bearer-auth` plugin validates on every request
- Secret stored in environment variables only, never in code

**Layer 3 — Salesforce session management:**
- Persistent browser profiles stored in Docker volume at `/data/playwright-profiles/`
- Session detection: Before each scraping job, Playwright MCP checks for valid session via `browser_snapshot` on a known Trailhead page
- Session expired flow: Pause pipeline → notify frontend via Supabase Realtime → user logs in manually → resume pipeline
- Survives VPS restarts via Docker volume persistence

**Rationale:**
- `getClaims()` over `getUser()` saves a network round-trip per request in middleware
- Bearer token is simpler than mutual TLS for a single-VPS deployment
- Manual Salesforce login avoids storing Salesforce credentials and handles MFA

---

### Decision 11: Observability — ToolTrace Pattern + Structured Logging

**Decision:** Implement DeepTutor's **ToolTrace pattern** for agent action logging, augmented with Pino structured logging for system-level events.

**ToolTrace schema (per agent action):**
```typescript
interface ToolTrace {
  id: string;
  run_id: string;
  agent_type: 'scraper' | 'knowledge' | 'quiz' | 'documentation';
  tool_type: 'playwright_mcp' | 'rag_search' | 'llm_call' | 'embedding' | 'sf_mcp';
  query: string;                 // What the agent asked/searched for
  raw_output: string;            // Truncated to 50KB
  summary: string;               // LLM-generated summary (for expensive operations)
  raw_output_truncated: boolean;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  duration_ms: number;
  confidence_score: number | null; // Quiz agent only
  related_chunk_ids: string[];     // Which knowledge chunks informed this action
  created_at: string;
}
```

**System logging (Pino):**
- Fastify integrates Pino natively — structured JSON logs
- Log levels: `error` (failures), `warn` (retries), `info` (stage transitions), `debug` (dev only)
- No file-based logging — stdout only, Docker captures to `docker logs`

**Cost tracking aggregation:**
```sql
-- Per-run cost summary
SELECT run_id, agent_type,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(estimated_cost_usd) as total_cost
FROM agent_logs
GROUP BY run_id, agent_type;
```

**Rationale:**
- ToolTrace enables "explain this answer" in the quiz review panel — trace exactly which chunks informed each quiz answer
- Raw output truncation (50KB) prevents database bloat while preserving debugging capability
- Cost tracking is a PRD requirement (FR33-FR34) — per-run and per-module visibility

---

### Decision 12: Database Schema Strategy — Supabase Migrations

**Decision:** Use **Supabase CLI migrations** (`supabase migration new`, `supabase db push`) for schema management. No ORM — raw SQL for migrations, Supabase client + generated types for queries.

**Core tables:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `modules` | Module tracking + state machine | `id, trailmix_id, name, status, priority, badge_url` |
| `units` | Unit content + metadata | `id, module_id, title, raw_html, content_markdown, unit_index` |
| `sf_knowledge_chunks` | Chunked content + embeddings | `id, unit_id, content, content_type, embedding, fts, sf_topics[]` |
| `sf_concept_relationships` | Concept dependency graph | `id, source_concept, target_concept, relationship_type` |
| `quiz_items` | Quiz Q&A pairs | `id, unit_id, question, options, correct_answer, related_chunk_ids[]` |
| `quiz_results` | Agent quiz attempts | `id, quiz_item_id, selected_answer, correct, confidence, reasoning` |
| `agent_logs` | ToolTrace entries | See Decision 11 schema |
| `runs` | Pipeline execution tracking | `id, trailmix_id, status, started_at, completed_at, total_cost` |

**Module state machine:**
```
pending → scraping → scraped → processing → ready → quizzing → completed
                  ↘ failed (from any state, with retry to previous state)
```

**RLS policies:**
- All tables: `auth.uid() = user_id` (single-user, but future-proof for multi-tenant)
- Service role key used by VPS backend (bypasses RLS)
- Anon key used by frontend (enforces RLS)

**Generated types:**
```bash
supabase gen types typescript --project-id $PROJECT_ID > packages/db/src/types/database.ts
```

---

### Decision 13: Testing Strategy — Vitest + Playwright E2E

**Decision:** **Vitest** for unit/integration tests, **Playwright** for E2E tests (reusing the existing Playwright dependency).

**Test structure:**
```
apps/web/     → Vitest for component tests, Playwright for E2E
apps/api/     → Vitest for handler tests, integration tests against Supabase
packages/*/   → Vitest for library unit tests
```

**What to test (prioritized):**
1. Knowledge pipeline stages — each stage independently testable with fixture data
2. Hybrid search function — verify RRF ranking produces expected results
3. Quiz agent reasoning — mock LLM responses, verify answer extraction logic
4. API routes — Fastify `inject()` for handler testing without network
5. Frontend dashboard — Playwright E2E for critical user flows (import, review, explore)

**What NOT to test:**
- Playwright MCP interactions (tested by Microsoft)
- Supabase client operations (tested by Supabase)
- LLM response quality (evaluated manually via quiz accuracy metrics)

---

### Decision 14: Docker Configuration — Three-Container Stack

**Decision:** Three Docker containers orchestrated by Docker Compose:

```yaml
services:
  api:
    build: ./docker/api
    image: trailblaze-api
    ports: ["3001:3001"]
    deploy:
      resources:
        limits: { memory: 512M }
    environment:
      - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
      - ANTHROPIC_API_KEY, OPENAI_API_KEY
      - VPS_API_SECRET

  worker:
    build: ./docker/worker
    image: trailblaze-worker
    # FROM mcr.microsoft.com/playwright:v1.58.2-noble
    ipc: host  # Required for Chromium shared memory
    volumes:
      - playwright-profiles:/data/playwright-profiles
    deploy:
      resources:
        limits: { memory: 3G, cpus: '3.0' }

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - certbot-conf:/etc/letsencrypt

volumes:
  playwright-profiles:  # Persistent browser sessions
  certbot-conf:         # Let's Encrypt certificates
```

**API container (512MB):** Fastify server + pg-boss scheduler. Lightweight — no browser, no heavy computation.

**Worker container (3GB):** Playwright browser automation + content processing + LLM calls. Uses Microsoft's official Playwright image. Non-root user for security.

**Nginx container:** Reverse proxy with Let's Encrypt SSL. Rate limiting. Proxies `/api/*` to Fastify.

**Rationale:**
- Separating API from Worker allows independent scaling and resource limits
- Worker gets 3GB for Chromium (needs ~1-2GB per page) + content processing
- Docker volumes persist browser profiles and SSL certs across container restarts
- `ipc: host` is required for Chromium's shared memory access in Docker

---

### Decision 15: Cost Optimization Strategy

**Decision:** Four complementary cost-reduction strategies:

| Strategy | Mechanism | Savings |
|----------|-----------|---------|
| **Model tiering** | Haiku for bulk extraction, Sonnet for quiz reasoning only | ~60% LLM cost reduction |
| **Prompt caching** | Reuse system prompts across modules (Claude cache_control) | ~90% on cached tokens |
| **Batch API** | Non-urgent content processing via Claude Batch API | 50% discount on batch jobs |
| **Embedding batching** | AI SDK `embedMany()` with `maxParallelCalls: 5` | Fewer API round-trips |

**Estimated one-time processing cost (100 modules):**
- Content extraction (Haiku): ~$1-2
- Quiz answering (Sonnet): ~$3-5
- Concept analysis (Haiku): ~$1-2
- Embeddings (text-embedding-3-small): ~$0.004
- **Total: ~$5-9 one-time**

**Ongoing monthly cost:**
- Hetzner CX33: ~$6
- Supabase Free: $0 (Pro $25 if needed)
- Vercel Hobby: $0
- **Total: $6-31/month ongoing**

---

## Research Sources

The architectural decisions above were informed by deep analysis of the following:

1. **DeepTutor** (HKUDS/DeepTutor) — Multi-agent pipeline orchestration, DynamicTopicQueue pattern, ToolTrace audit logging, dual-loop reasoning, YAML-driven prompt management, BaseAgent pattern
2. **PocketFlow** — Shared-state sequential pipeline, index-based cross-referencing, YAML-validated LLM extraction, progressive context accumulation
3. **Supabase Official Templates** — 3-file auth pattern (client/server/middleware), getClaims() vs getUser(), Realtime dual-pattern (router.refresh vs useState), pgvector hybrid search RRF function
4. **AI/RAG Ecosystem Analysis** — Vercel AI SDK embedMany(), ChonkieJS chunking library, Stagehand v3 fallback automation, pg-boss queue-per-stage pattern, LangChain.js rejection rationale
