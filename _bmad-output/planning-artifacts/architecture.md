---
stepsCompleted: [1, 2, 3]
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
