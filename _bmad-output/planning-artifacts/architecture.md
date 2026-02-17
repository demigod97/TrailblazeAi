---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
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

## Implementation Patterns & Consistency Rules

_23 conflict points resolved across 5 categories. All AI agents MUST follow these patterns._

### Naming Patterns

**Database:**
- Tables: `snake_case`, plural — `modules`, `units`, `sf_knowledge_chunks`, `quiz_items`, `quiz_results`, `agent_logs`, `runs`
- Columns: `snake_case` — `module_id`, `content_type`, `created_at`, `estimated_cost_usd`
- Foreign keys: `{referenced_table_singular}_id` — `module_id`, `unit_id`, `quiz_item_id`, `run_id`
- Indexes: `idx_{table}_{columns}` — `idx_sf_knowledge_chunks_embedding`, `idx_modules_status`
- Functions: `snake_case` — `hybrid_search()`, `match_chunks()`

**API Endpoints:**
- Plural nouns, kebab-case for multi-word — `GET /api/modules`, `GET /api/modules/:id/units`, `POST /api/runs`, `GET /api/quiz-results`
- Route parameters: `:id` format — `/api/modules/:id`, `/api/runs/:runId`
- Query parameters: `snake_case` — `?trailmix_id=abc&status=pending`
- Response JSON field naming: `snake_case` (matches database)

**Code:**
- Files: `kebab-case.ts` everywhere — `quiz-agent.ts`, `hybrid-search.ts`, `module-card.tsx`
- React components: PascalCase exports — `export function ModuleCard()` in `module-card.tsx`
- Functions/methods: camelCase — `getModules()`, `processChunk()`, `handleQuizSubmit()`
- Variables: camelCase — `moduleId`, `chunkText`, `quizResult`
- Constants: SCREAMING_SNAKE_CASE — `MAX_RETRIES`, `DEFAULT_CHUNK_SIZE`, `CONFIDENCE_THRESHOLD`
- Types/Interfaces: PascalCase, no `I` prefix — `Module`, `QuizResult`, `ToolTrace`, `PipelineStage`
- Enums: String union types only, never TS `enum` — `type ModuleStatus = 'pending' | 'scraping' | 'scraped' | 'processing' | 'ready' | 'quizzing' | 'completed' | 'failed'`

**Supabase ↔ TypeScript Bridge:**
- Use `snake_case` throughout TypeScript when working with database data — no transformation layer
- Supabase generated types are the source of truth: `Database['public']['Tables']['modules']['Row']`
- Domain types in `packages/shared/` use snake_case to match: `interface Module { id: string; trailmix_id: string; status: ModuleStatus; }`
- Only camelCase exception: React component props and event handlers (`onClick`, `onChange`)

### Structure Patterns

**Tests:**
- Co-located — `quiz-agent.ts` + `quiz-agent.test.ts` in the same directory
- Naming: `{filename}.test.ts` for unit, `{filename}.integration.test.ts` for integration
- E2E tests: `apps/web/e2e/` directory

**Components:**
- Organized by feature — `components/dashboard/`, `components/quiz-review/`, `components/knowledge/`
- Shared UI primitives: `components/ui/` (shadcn/ui)
- One component per file, barrel exports (`index.ts`) at feature boundaries

**File Layout:**
- Utility functions: `lib/` directory in each app — `apps/api/src/lib/`, `apps/web/src/lib/`
- Config files: root of each app — `apps/api/src/config.ts` (Zod-validated)
- Agent prompts: `apps/api/src/prompts/{agent-name}.yaml`
- Database migrations: `packages/db/supabase/migrations/`

### Format Patterns

**API Response Envelope:**
```typescript
// Every Fastify route returns this shape
interface ApiSuccess<T> { data: T; error: null; }
interface ApiError { data: null; error: { code: string; message: string; details?: unknown; }; }
type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

- HTTP status codes are authoritative: 200/201 success, 400/401/404/500 errors
- Dates: ISO 8601 strings — `"2026-02-17T14:30:00Z"` (Supabase default)
- Nulls: `null` explicitly, never `undefined` in API responses
- Empty collections: Always `[]`, never `null`
- IDs: UUIDs as strings
- Pagination: `{ data: T[], count: number, offset: number, limit: number }`

### Communication Patterns

**Event Naming:**
- pg-boss queues: `kebab-case` — `scrape-module`, `extract-content`, `generate-embeddings`, `answer-quiz`
- Supabase Realtime channels: `kebab-case` — `module-status`, `agent-logs`, `quiz-results`
- Dead letter queues: `dead-letter-{queue-name}`

**State Management:**
- Server Components default — data fetched on server, passed as props
- Client Components only when interactivity needed (`'use client'` directive)
- Realtime subscriptions: custom hooks in `lib/hooks/` — `use-module-status.ts`, `use-agent-logs.ts`
- No global state library — Supabase + URL state + React state covers all cases
- URL state for filters/pagination — `useSearchParams()`

### Process Patterns

**Error Handling:**
```typescript
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

- Fastify global error handler maps `AppError` subclasses to API envelope responses
- Pipeline stage errors logged to `agent_logs` table + pg-boss retry logic
- Frontend: React Error Boundaries at feature level

**Loading States:**
- React Suspense boundaries per feature area with `loading.tsx` files
- Streaming Server Components for initial page loads
- Skeleton UI components (shadcn/ui Skeleton) for fallbacks
- Exception: Realtime agent log stream uses `useState` directly (Pattern B from Decision 9)

**Validation:**
- Zod at all system boundaries: Fastify request bodies, env vars at startup, LLM structured output (one retry on failure), Supabase RPC params
- Internal function arguments: TypeScript types only, no runtime validation
- Validation errors → `ValidationError` with Zod error details

### Enforcement Summary

| Do NOT | Do Instead |
|--------|-----------|
| `enum Status { Pending }` | `type Status = 'pending' \| 'scraping'` |
| `interface IModule` | `interface Module` |
| `UserCard.tsx` (PascalCase file) | `user-card.tsx` (kebab-case file) |
| `GET /api/module/:id` (singular) | `GET /api/modules/:id` (plural) |
| `{ loading: true }` manual state | `<Suspense fallback={<Skeleton />}>` |
| `throw new Error('not found')` | `throw new NotFoundError('module', id)` |
| `camelCase` in API JSON responses | `snake_case` matching DB columns |
| Global Redux/Zustand store | Supabase as source of truth |

## Project Structure & Boundaries

### Complete Project Directory Structure

```
trailblaze-ai/
├── .env.example                          # Environment variable template
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                        # GitHub Actions: type-check + test + build
├── package.json                          # Root workspace config (pnpm)
├── pnpm-workspace.yaml                   # Workspace: apps/*, packages/*
├── turbo.json                            # Turborepo task orchestration
├── tsconfig.json                         # Root TypeScript config (strict, ESM)
├── .prettierrc                           # Prettier config (defaults)
│
├── apps/
│   ├── web/                              # @trailblaze/web — Next.js 15 (Vercel)
│   │   ├── package.json
│   │   ├── next.config.ts                # Transpiles workspace packages
│   │   ├── tsconfig.json
│   │   ├── postcss.config.mjs            # Tailwind CSS v4
│   │   ├── components.json               # shadcn/ui config (new-york)
│   │   ├── middleware.ts                  # Supabase session refresh (getClaims)
│   │   ├── app/
│   │   │   ├── globals.css               # Tailwind v4 @import + @theme
│   │   │   ├── layout.tsx                # Root layout (Supabase provider, fonts)
│   │   │   ├── page.tsx                  # Landing → redirect to /dashboard
│   │   │   ├── login/
│   │   │   │   └── page.tsx              # Email/password login (Supabase Auth)
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx            # Three-column shell (sidebar, center, review)
│   │   │   │   ├── page.tsx              # Pipeline view (module list + status)
│   │   │   │   └── loading.tsx           # Skeleton fallback
│   │   │   ├── knowledge/
│   │   │   │   ├── page.tsx              # Knowledge base search + browse
│   │   │   │   └── loading.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx              # Pipeline config, system health, session
│   │   │       └── loading.tsx
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ui/                   # shadcn/ui primitives (button, card, etc.)
│   │       │   ├── dashboard/
│   │       │   │   ├── index.ts          # Barrel export
│   │       │   │   ├── module-row.tsx    # Module status row in pipeline list
│   │       │   │   ├── pipeline-toolbar.tsx  # URL input + filter chips
│   │       │   │   ├── progress-summary.tsx  # Aggregated stats bar
│   │       │   │   └── stage-badge.tsx   # Pipeline stage indicator
│   │       │   ├── quiz-review/
│   │       │   │   ├── index.ts
│   │       │   │   ├── review-panel.tsx  # Right column: quiz answer review
│   │       │   │   ├── answer-card.tsx   # Individual answer with confidence
│   │       │   │   ├── reasoning-view.tsx # Chain-of-thought reasoning display
│   │       │   │   └── confidence-bar.tsx
│   │       │   ├── knowledge/
│   │       │   │   ├── index.ts
│   │       │   │   ├── search-input.tsx  # Hybrid search interface
│   │       │   │   ├── chunk-card.tsx    # Knowledge chunk display
│   │       │   │   └── chunk-detail.tsx  # Full chunk + metadata view
│   │       │   ├── activity/
│   │       │   │   ├── index.ts
│   │       │   │   └── agent-log-feed.tsx # Live agent action stream
│   │       │   └── layout/
│   │       │       ├── index.ts
│   │       │       ├── sidebar.tsx       # Navigation sidebar
│   │       │       ├── command-menu.tsx   # Cmd+K omnibar
│   │       │       └── three-column-shell.tsx # Responsive layout container
│   │       ├── lib/
│   │       │   ├── utils.ts              # cn() — clsx + tailwind-merge
│   │       │   ├── supabase/
│   │       │   │   ├── client.ts         # createBrowserClient (anon key)
│   │       │   │   └── server.ts         # createServerClient (cookie handling)
│   │       │   └── hooks/
│   │       │       ├── use-module-status.ts  # Realtime Pattern A (router.refresh)
│   │       │       ├── use-agent-logs.ts     # Realtime Pattern B (useState)
│   │       │       └── use-quiz-results.ts   # Realtime Pattern A
│   │       └── types/
│   │           └── database.ts           # Placeholder → supabase gen types
│   │
│   └── api/                              # @trailblaze/api — Fastify 5 (Docker/VPS)
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts                  # Fastify app bootstrap + plugin registration
│       │   ├── config.ts                 # Zod-validated env vars
│       │   ├── app.ts                    # Fastify instance factory (testable)
│       │   ├── plugins/
│       │   │   ├── auth.ts               # @fastify/bearer-auth setup
│       │   │   ├── cors.ts               # @fastify/cors config
│       │   │   ├── rate-limit.ts         # @fastify/rate-limit config
│       │   │   ├── pg-boss.ts            # pg-boss initialization + queue creation
│       │   │   └── error-handler.ts      # Global AppError → ApiResponse mapper
│       │   ├── routes/
│       │   │   ├── health.ts             # GET /health
│       │   │   ├── modules.ts            # GET/POST /api/modules, GET /api/modules/:id
│       │   │   ├── runs.ts              # POST /api/runs, GET /api/runs/:id
│       │   │   ├── quiz-results.ts       # GET /api/quiz-results
│       │   │   ├── knowledge.ts          # GET /api/knowledge/search
│       │   │   └── progress.ts           # GET /api/progress
│       │   ├── agents/
│       │   │   ├── scraper-agent.ts      # Playwright MCP browser automation
│       │   │   ├── knowledge-agent.ts    # Content → chunks → embeddings
│       │   │   ├── quiz-agent.ts         # Hybrid search → reasoning → answer
│       │   │   └── documentation-agent.ts # Supplemental knowledge enrichment
│       │   ├── pipeline/
│       │   │   ├── stages/
│       │   │   │   ├── scrape-unit.ts         # Stage 1: Extract raw HTML
│       │   │   │   ├── extract-content.ts     # Stage 2: Parse HTML → structured sections
│       │   │   │   ├── identify-concepts.ts   # Stage 3: LLM concept extraction
│       │   │   │   ├── chunk-content.ts       # Stage 4: ChonkieJS + Trailhead rules
│       │   │   │   ├── generate-embeddings.ts # Stage 5: AI SDK embedMany()
│       │   │   │   └── build-relationships.ts # Stage 6: Concept dependency mapping
│       │   │   ├── queue-handlers.ts     # pg-boss work() registrations + chaining
│       │   │   └── concurrency.ts        # Per-queue concurrency limits
│       │   ├── prompts/
│       │   │   ├── scraper-agent.yaml    # Playwright navigation prompts
│       │   │   ├── knowledge-agent.yaml  # Concept extraction prompts
│       │   │   ├── quiz-agent.yaml       # Chain-of-thought reasoning prompts
│       │   │   └── documentation-agent.yaml
│       │   ├── lib/
│       │   │   ├── errors.ts             # AppError, NotFoundError, ValidationError, PipelineError
│       │   │   ├── mcp-client.ts         # Playwright MCP client factory (stdio transport)
│       │   │   ├── stagehand-fallback.ts # Stagehand v3 for Shadow DOM failures
│       │   │   ├── cost-tracker.ts       # Token counting + cost estimation per model
│       │   │   └── response.ts           # ApiSuccess / ApiError envelope helpers
│       │   └── types/
│       │       └── api.ts                # ApiResponse<T>, route-specific request/response types
│       └── vitest.config.ts              # Vitest config for API tests
│
├── packages/
│   ├── db/                               # @trailblaze/db — Supabase client + types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                  # Re-exports client + types
│   │   │   ├── client.ts                 # createClient(url, key) factory
│   │   │   └── types.ts                  # Placeholder → supabase gen types
│   │   └── supabase/
│   │       ├── config.toml               # Supabase project config
│   │       └── migrations/
│   │           ├── 001_core_tables.sql        # modules, units, runs
│   │           ├── 002_knowledge_tables.sql   # sf_knowledge_chunks, sf_concept_relationships
│   │           ├── 003_quiz_tables.sql        # quiz_items, quiz_results
│   │           ├── 004_observability.sql      # agent_logs (ToolTrace)
│   │           ├── 005_indexes.sql            # HNSW vector, FTS, composite indexes
│   │           ├── 006_rls_policies.sql       # Row-level security for all tables
│   │           └── 007_functions.sql          # hybrid_search() RPC function
│   │
│   └── shared/                           # @trailblaze/shared — Domain types + constants
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  # Barrel export
│           ├── constants.ts              # JOB_TYPES, MODULE_STATUS, API_ROUTES
│           └── types/
│               └── trailhead.ts          # Module, Unit, Quiz, KnowledgeEntry, etc.
│
├── docker/
│   ├── docker-compose.yml                # api + worker + nginx services
│   ├── api.Dockerfile                    # Multi-stage Node 22 Alpine (512MB limit)
│   ├── worker.Dockerfile                 # Playwright image (3GB limit)
│   ├── .dockerignore
│   └── nginx/
│       └── nginx.conf                    # Reverse proxy + SSL + rate limiting
│
├── _bmad/                                # BMAD V6 framework (agents, workflows)
├── _bmad-output/                         # Planning artifacts + project context
│   ├── project-context.md
│   └── planning-artifacts/
│       ├── architecture.md               # This document
│       ├── prd.md
│       ├── product-brief-*.md
│       ├── ux-design-specification.md
│       ├── bmm-workflow-status.yaml
│       └── research/
└── apps/web/e2e/                         # Playwright E2E tests
    ├── dashboard.spec.ts
    ├── knowledge.spec.ts
    └── fixtures/
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Inbound | Outbound | Auth |
|----------|---------|----------|------|
| Vercel → VPS API | Next.js API routes proxy | Fastify routes respond | Bearer token |
| Browser → Supabase | Frontend Supabase client | Supabase PostgREST/Realtime | Anon key + RLS |
| VPS → Supabase | Fastify/Workers | Supabase service role client | Service role key (bypasses RLS) |
| VPS → Claude API | AI SDK agents | Claude Haiku/Sonnet responses | Anthropic API key |
| VPS → OpenAI API | AI SDK embedMany() | Embedding vectors | OpenAI API key |
| VPS → Trailhead | Playwright MCP browser | HTML pages + quiz forms | Salesforce session cookie |

**Service Boundaries (VPS):**

| Service | Container | Responsibility | Communication |
|---------|-----------|---------------|---------------|
| API Server | `api` (512MB) | REST endpoints, pg-boss scheduler, job dispatch | Receives HTTP, writes Supabase |
| Worker | `worker` (3GB) | Playwright browser, pipeline stages, LLM agents | Reads pg-boss jobs, writes Supabase |
| Nginx | `nginx` (128MB) | TLS termination, reverse proxy, rate limiting | Routes external traffic to API |

API and Worker share the same Supabase PostgreSQL instance (including pg-boss tables). They do NOT communicate directly — Supabase is the only shared state.

**Component Boundaries (Frontend):**

| Boundary | Server vs Client | Data Source |
|----------|-----------------|-------------|
| Dashboard layout + module list | Server Component | Supabase server client |
| Pipeline toolbar (URL input, filters) | Client Component (`'use client'`) | Local state + URL params |
| Review panel (quiz answers) | Client Component | Supabase + local edits |
| Agent log feed | Client Component | Supabase Realtime (Pattern B) |
| Knowledge search | Server Component + Client input | Supabase RPC (hybrid_search) |
| Settings page | Server Component (initial) + Client forms | Supabase server client |

**Data Boundaries:**

| Layer | Access Pattern | Client |
|-------|---------------|--------|
| Frontend read | PostgREST via anon key, RLS enforced | `@supabase/ssr` browser/server clients |
| Frontend write | Limited — only settings, manual answer edits | `@supabase/ssr` browser client |
| Backend read/write | Service role key, RLS bypassed | `@supabase/supabase-js` in Fastify |
| Realtime subscriptions | Filtered Postgres Changes (per table + filter) | Supabase Realtime channels |
| Vector search | `hybrid_search()` RPC function | Both frontend (knowledge page) and backend (quiz agent) |

### Requirements to Structure Mapping

**FR Category → Directory Mapping:**

| FR Category | Primary Directory | Key Files |
|-------------|------------------|-----------|
| Content Acquisition (FR1-FR7) | `apps/api/src/agents/scraper-agent.ts` | `mcp-client.ts`, `stagehand-fallback.ts`, `scrape-unit.ts` |
| Knowledge Processing (FR8-FR12) | `apps/api/src/pipeline/stages/` | `extract-content.ts`, `identify-concepts.ts`, `chunk-content.ts`, `generate-embeddings.ts` |
| Knowledge Retrieval (FR13-FR16) | `packages/db/supabase/migrations/007_functions.sql` | `hybrid_search()` RPC, `apps/api/src/routes/knowledge.ts` |
| Quiz Automation (FR17-FR22) | `apps/api/src/agents/quiz-agent.ts` | `quiz-agent.yaml`, `apps/api/src/routes/quiz-results.ts` |
| Pipeline Orchestration (FR23-FR28) | `apps/api/src/pipeline/` | `queue-handlers.ts`, `concurrency.ts`, `pg-boss.ts` plugin |
| System Operations (FR29-FR34) | `apps/api/src/routes/` | `health.ts`, `progress.ts`, `apps/api/src/lib/cost-tracker.ts` |
| Knowledge Export (FR35-FR37) | `apps/api/src/routes/knowledge.ts` | `apps/web/app/knowledge/page.tsx` |
| Dashboard UI | `apps/web/src/components/dashboard/` | `module-row.tsx`, `pipeline-toolbar.tsx`, `progress-summary.tsx` |
| Quiz Review UI | `apps/web/src/components/quiz-review/` | `review-panel.tsx`, `answer-card.tsx`, `reasoning-view.tsx` |
| Knowledge Explorer UI | `apps/web/src/components/knowledge/` | `search-input.tsx`, `chunk-card.tsx`, `chunk-detail.tsx` |

**Cross-Cutting Concerns → Location Mapping:**

| Concern | Location(s) |
|---------|------------|
| Authentication (Supabase Auth) | `apps/web/middleware.ts`, `apps/web/src/lib/supabase/`, `apps/web/app/login/` |
| API Auth (Bearer token) | `apps/api/src/plugins/auth.ts` |
| Error handling | `apps/api/src/lib/errors.ts`, `apps/api/src/plugins/error-handler.ts` |
| Cost tracking | `apps/api/src/lib/cost-tracker.ts`, `agent_logs` table |
| Real-time updates | `apps/web/src/lib/hooks/use-*.ts`, Supabase Realtime config |
| Domain types | `packages/shared/src/types/trailhead.ts` |
| Database types | `packages/db/src/types.ts` (generated) |
| Validation (Zod) | `apps/api/src/config.ts` (env), route handlers (request bodies) |
| Observability | `agent_logs` table, Fastify Pino logger, `cost-tracker.ts` |

### Integration Points

**Internal Communication:**

```
┌─────────────┐     Bearer token      ┌─────────────┐
│  Next.js    │ ──────────────────────→│  Fastify    │
│  (Vercel)   │     API proxy          │  (VPS:3001) │
└──────┬──────┘                        └──────┬──────┘
       │                                      │
       │ anon key                              │ service role key
       │ + RLS                                 │ (no RLS)
       ▼                                      ▼
┌──────────────────────────────────────────────────┐
│                   Supabase                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ PostgREST│  │ Realtime │  │  pg-boss tables│  │
│  │ (CRUD)   │  │ (WebSocket)│ │  (job queue)  │  │
│  └──────────┘  └──────────┘  └────────────────┘  │
│  ┌──────────┐  ┌──────────┐                       │
│  │ pgvector │  │   FTS    │                       │
│  │ (HNSW)   │  │ (GIN)   │                       │
│  └──────────┘  └──────────┘                       │
└──────────────────────────────────────────────────┘
       ▲                                      │
       │ Realtime subscriptions                │ pg-boss work()
       │ (module-status, agent-logs,           ▼
       │  quiz-results)              ┌─────────────┐
       │                             │   Worker     │
       └─────────────────────────────│   (VPS)      │
                                     │              │
                                     │ ┌──────────┐ │
                                     │ │Playwright│ │
                                     │ │  MCP     │ │
                                     │ └────┬─────┘ │
                                     │      │       │
                                     │      ▼       │
                                     │  Trailhead   │
                                     └─────────────┘
```

**External Integrations:**

| Service | Protocol | Client | Rate Limits |
|---------|----------|--------|-------------|
| Supabase PostgreSQL | postgres (pooled) | `@supabase/supabase-js` | Connection pool: 15 |
| Supabase Realtime | WebSocket | Supabase client (browser) | 100 concurrent connections |
| Claude API (Haiku/Sonnet) | HTTPS | `@ai-sdk/anthropic` | 60 RPM (Haiku), 40 RPM (Sonnet) |
| OpenAI Embeddings API | HTTPS | `@ai-sdk/openai` | 500 RPM |
| Trailhead | HTTPS (browser) | Playwright MCP | 2 concurrent pages |
| Stagehand (fallback) | HTTPS | `@anthropic-ai/stagehand` | Shares Claude rate limits |

**Data Flow — Module Processing Pipeline:**

```
User submits Trailmix URL
  → Fastify POST /api/runs
    → pg-boss send('scrape-module', { module_id, priority })
      → Worker: scrape-unit.ts (Playwright MCP → raw HTML → units table)
        → pg-boss send('extract-content')
          → Worker: extract-content.ts (HTML → markdown + sections → units table)
            → pg-boss send('identify-concepts')
              → Worker: identify-concepts.ts (Claude Haiku → concepts → sf_knowledge_chunks metadata)
                → pg-boss send('chunk-content')
                  → Worker: chunk-content.ts (ChonkieJS → chunks → sf_knowledge_chunks)
                    → pg-boss send('generate-embeddings')
                      → Worker: generate-embeddings.ts (OpenAI → vectors → sf_knowledge_chunks.embedding)
                        → pg-boss send('build-relationships')
                          → Worker: build-relationships.ts (Claude Haiku → sf_concept_relationships)
                            → Module status → 'ready'
                              → pg-boss send('answer-quiz', { priority: 1 })
                                → Worker: quiz-agent.ts (hybrid_search → Claude Sonnet → quiz_results)
                                  → Module status → 'completed'
```

Each stage writes progress to `modules.status` → Supabase Realtime notifies frontend.

### Development Workflow Integration

**Development Servers:**
```bash
pnpm dev                              # Turbo: starts all dev servers
pnpm --filter @trailblaze/web dev     # Next.js on :3000 (hot reload)
pnpm --filter @trailblaze/api dev     # Fastify on :3001 (tsx watch)
```

**Build Process:**
```bash
pnpm build                            # Turbo: build all (packages first → apps)
# packages/shared → dist/ (tsup)
# packages/db → dist/ (tsup)
# apps/api → dist/ (tsup, ESM)
# apps/web → .next/ (Next.js)
```

**Type Checking:**
```bash
pnpm type-check                       # Turbo: tsc --noEmit across all packages
```

**Testing:**
```bash
pnpm test                             # Vitest: unit + integration across all packages
pnpm test:e2e                         # Playwright E2E (apps/web/e2e/)
```

**Database:**
```bash
supabase migration new <name>         # Create new migration in packages/db/supabase/migrations/
supabase db push                      # Apply migrations to remote
supabase gen types typescript          # Regenerate packages/db/src/types.ts
```

**Deployment:**
```bash
# Frontend: git push → Vercel auto-deploys (preview on PR, production on main)
# Backend: ssh → docker compose up -d --build (VPS)
docker compose -f docker/docker-compose.yml up -d --build
```

**Package Dependencies (workspace graph):**
```
@trailblaze/web ──→ @trailblaze/shared
                ──→ @trailblaze/db

@trailblaze/api ──→ @trailblaze/shared
                ──→ @trailblaze/db

@trailblaze/db  ──→ (no internal deps)

@trailblaze/shared ──→ (no internal deps)
```

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** PASS

All technology choices are compatible and version-aligned:
- Next.js 15 + React 19 + @supabase/ssr 0.5 — verified compatible (SSR cookie handling)
- Fastify 5.2 + pg-boss 10 — pg-boss uses Supabase's PostgreSQL directly, no Redis conflict
- AI SDK v5 + @ai-sdk/anthropic 2 + @ai-sdk/openai — unified provider interface for both Claude and OpenAI embeddings
- Playwright MCP (stdio transport) runs inside Worker container, isolated from API container
- Tailwind CSS v4 + shadcn/ui new-york — CSS-first config via `@import "tailwindcss"`, compatible with Next.js 15
- Vitest + Playwright — Vitest for unit/integration, Playwright for E2E, no test runner conflicts
- Zod 3.24 — used consistently for env validation (API config), request validation (Fastify routes), LLM structured output validation

No version conflicts or incompatibilities found.

**Pattern Consistency:** PASS

- Naming conventions are consistent: `snake_case` for DB/API JSON, `camelCase` for TS functions/vars, `kebab-case` for files/routes/queues, PascalCase for types/components
- The Supabase ↔ TypeScript bridge pattern (no transformation layer, snake_case throughout DB operations) is consistently applied across Decision 12 (schema), patterns (naming), and structure (generated types)
- Error handling pattern (AppError hierarchy → Fastify global handler → ApiResponse envelope) is consistently referenced in Decisions 9, 11, and Process Patterns
- Job queue naming (`kebab-case`) aligns with Decision 8 queue definitions and Communication Patterns

**Structure Alignment:** PASS

- Project structure supports all 15 architectural decisions:
  - Decision 1 (Hybrid): `apps/web/` (Vercel), `apps/api/` (VPS), `packages/db/` (Supabase)
  - Decision 2 (Playwright MCP): `apps/api/src/lib/mcp-client.ts` + `stagehand-fallback.ts`
  - Decision 3 (Pipeline): `apps/api/src/pipeline/stages/` with 6 dedicated stage files
  - Decision 7 (Agents): `apps/api/src/agents/` with 4 agent files + `prompts/` YAML
  - Decision 8 (pg-boss): `apps/api/src/plugins/pg-boss.ts` + `pipeline/queue-handlers.ts`
  - Decision 12 (Migrations): `packages/db/supabase/migrations/` with 7 migration files
  - Decision 14 (Docker): `docker/` with 3 containers defined

### Requirements Coverage Validation

**Functional Requirements Coverage:** PASS — All 37 FRs mapped

| FR Range | Coverage | Key Decisions & Files |
|----------|----------|----------------------|
| FR1-FR7 (Content Acquisition) | FULL | Decision 2 (Playwright MCP), `scraper-agent.ts`, `mcp-client.ts`, `stagehand-fallback.ts` |
| FR8-FR12 (Knowledge Processing) | FULL | Decision 3 (Pipeline), Decision 4 (ChonkieJS), `pipeline/stages/*` |
| FR13-FR16 (Knowledge Retrieval) | FULL | Decision 6 (Hybrid Search), `007_functions.sql`, `knowledge.ts` route |
| FR17-FR22 (Quiz Automation) | FULL | Decision 7 (Agents), `quiz-agent.ts`, `quiz-agent.yaml`, `quiz-results.ts` route |
| FR23-FR28 (Pipeline Orchestration) | FULL | Decision 8 (pg-boss), `queue-handlers.ts`, `concurrency.ts`, `pg-boss.ts` plugin |
| FR29-FR34 (System Operations) | FULL | Decision 11 (ToolTrace), Decision 14 (Docker), `health.ts`, `progress.ts`, `cost-tracker.ts` |
| FR35-FR37 (Knowledge Export) | FULL | Decision 6 (Hybrid Search), `knowledge.ts` route, knowledge page |

**Non-Functional Requirements Coverage:** PASS

| NFR Category | Architectural Support |
|-------------|----------------------|
| Performance | HNSW index (Decision 5), batched embeddings (Decision 5), concurrent pipeline stages (Decision 8), hybrid search <2s (Decision 6) |
| Security | 3-layer auth (Decision 10), RLS policies, Bearer token, env-only secrets, Docker volume isolation |
| Reliability | pg-boss retries with backoff (Decision 8), dead letter queues, Supabase state persistence, module state machine (Decision 12) |
| Integration | MCP stdio transport (Decision 2), Supabase connection pooling, LLM retry on 429 (AI SDK built-in), configurable timeouts |
| Cost | Model tiering Haiku/Sonnet (Decision 7/15), prompt caching, batch API, embedding batching — estimated $5-9 one-time |
| Observability | ToolTrace pattern (Decision 11), Pino structured logging, cost tracking aggregation, `agent_logs` table |

### Implementation Readiness Validation

**Decision Completeness:** PASS

- All 15 decisions include specific versions, code examples, and rationale
- Trade-offs documented for every major decision (alternatives rejected)
- Implementation patterns provide 23 conflict-point resolutions with concrete examples
- Enforcement summary table provides quick-reference "Do NOT / Do Instead" pairs

**Structure Completeness:** PASS

- Complete directory tree with ~80 files/directories defined
- Every file has a purpose annotation
- All 7 database migrations specified with scope
- Integration points diagrammed (ASCII architecture diagram + data flow pipeline)

**Pattern Completeness:** PASS

- Naming patterns cover all 5 domains (DB, API, code, files, events)
- Error handling hierarchy fully typed with 4 error classes
- API response envelope defined with TypeScript generics
- Loading state patterns specified per component type (Suspense vs useState)
- Validation boundaries clearly drawn (Zod at system edges, TS types internally)

### Gap Analysis Results

**Critical Gaps:** None identified

**Important Gaps (addressable during implementation):**

1. **Middleware auth implementation detail** — Decision 10 specifies `getClaims()` in middleware but the exact redirect-to-login logic is deferred to implementation. Not blocking — standard Supabase SSR pattern.
2. **Stagehand fallback trigger conditions** — Decision 2 says "use for Shadow DOM extraction failures" but the specific error detection heuristic (how the agent decides to fall back) will be refined during scraper agent development.
3. **Batch API integration** — Decision 15 mentions Claude Batch API for non-urgent processing. The queue handler needs a mode switch (real-time vs batch). Implementable as a pg-boss job option.

**Nice-to-Have Gaps:**

1. **Monitoring/alerting** — No external monitoring (Uptime Kuma, etc.) specified. Docker `healthcheck` directives would be beneficial.
2. **Backup strategy** — Supabase handles database backups automatically on Pro plan. No explicit backup for Docker volumes (playwright profiles).
3. **CI/CD pipeline detail** — `ci.yml` referenced in structure but contents not specified. Standard type-check + test + build pipeline.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed (37 FRs, 25 NFRs, 6 cross-cutting concerns)
- [x] Scale and complexity assessed (Medium-High, ~12 major components)
- [x] Technical constraints identified (Hetzner CX33, Vercel Hobby, Supabase Free, no Trailhead API)
- [x] Cross-cutting concerns mapped (session management, error recovery, cost tracking, real-time, concurrency, state machine)

**Architectural Decisions**

- [x] 15 critical decisions documented with versions and code examples
- [x] Technology stack fully specified (Next.js 15, Fastify 5, Supabase, pg-boss 10, AI SDK v5, Playwright MCP)
- [x] Integration patterns defined (MCP stdio, Supabase Realtime dual-pattern, pg-boss queue chaining)
- [x] Performance considerations addressed (HNSW indexes, batched APIs, model tiering, concurrency limits)

**Implementation Patterns**

- [x] Naming conventions established (5 domains, 23 conflict points resolved)
- [x] Structure patterns defined (co-located tests, feature-organized components, migration sequence)
- [x] Communication patterns specified (pg-boss queues, Realtime channels, dead letter queues)
- [x] Process patterns documented (error hierarchy, loading states, validation boundaries)

**Project Structure**

- [x] Complete directory structure defined (~80 files across 4 packages)
- [x] Component boundaries established (Server vs Client, API vs Worker, anon vs service role)
- [x] Integration points mapped (ASCII diagrams, data flow pipeline)
- [x] Requirements to structure mapping complete (all 37 FRs → specific files)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

1. **Zero external dependencies beyond core stack** — No Redis, no LangChain, no separate vector DB. Everything runs on Supabase PostgreSQL + pg-boss.
2. **Crash-resilient pipeline** — Every stage writes state to Supabase. VPS restart resumes from last completed stage, not from scratch.
3. **Cost-optimized by design** — Model tiering (Haiku for bulk, Sonnet for accuracy-critical), prompt caching, batch API. Estimated $5-9 one-time for 100 modules.
4. **Single source of truth** — Supabase is the only shared state. No cache invalidation problems, no eventual consistency issues between services.
5. **Comprehensive conflict prevention** — 23 naming/pattern conflict points resolved upfront with enforcement table.

**Areas for Future Enhancement:**

1. Multi-user support (currently single-user with RLS future-proofed)
2. External monitoring/alerting (Uptime Kuma, PagerDuty)
3. CI/CD pipeline with Docker build + deploy automation
4. Horizontal scaling of worker containers (currently single worker)

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all 15 architectural decisions exactly as documented
- Use implementation patterns consistently — refer to the Enforcement Summary table for quick checks
- Respect project structure and boundaries — every new file must follow the directory conventions
- Use `snake_case` for all database-related TypeScript code (no camelCase transformation layer)
- Refer to this document for all architectural questions before making implementation decisions

**First Implementation Priorities:**

1. Database schema — Apply migrations 001-007 to Supabase
2. API foundation — Fastify plugins (auth, error handler, pg-boss), route stubs
3. Frontend shell — Three-column layout, sidebar navigation, Supabase auth flow
4. Pipeline skeleton — pg-boss queue creation, stage handler stubs, basic chaining
5. Scraper agent MVP — Playwright MCP integration, single module scrape flow
