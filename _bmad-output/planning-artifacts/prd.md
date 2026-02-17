---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-TrailblazeAi-2026-02-17.md
  - _bmad-output/planning-artifacts/research/AI-powered-Trailhead-completion-assistant-full-architecture-blueprint.md
  - _bmad-output/planning-artifacts/research/TrailBlazeAI-BMAD-V6-Action-Plan.md
  - _bmad-output/project-context.md
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 2
  brainstorming: 0
  projectDocs: 1
classification:
  projectType: web_app
  domain: edtech
  complexity: medium-high
  projectContext: greenfield
---

# Product Requirements Document - TrailBlazeAI

**Author:** Demi
**Date:** 2026-02-17

## Executive Summary

TrailBlazeAI is an AI-powered learning accelerator that automates the extraction, comprehension, and assessment completion of Salesforce Trailhead content. Targeting 100+ hours of content across Admin, Developer, and Agentblazer certification tracks, the system combines Playwright browser automation with Claude-powered reasoning and a Supabase-backed knowledge pipeline to compress weeks of study into 2-3 days. The lasting output is a structured Salesforce knowledge graph with vector embeddings and concept relationships — a persistent reference for development, certification prep, and AI coding agents.

## Success Criteria

### User Success

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Badge completion rate | 100% of targeted Trailmix modules | Badges earned / total modules in Trailmix |
| Quiz first-attempt accuracy | 85%+ | Correct answers / total questions on first attempt |
| Time to complete full Trailmix | 2-3 days wall-clock (vs. 100+ hours manual) | Timestamp from first import to last badge earned |
| Content extraction completeness | 95%+ of unit content captured | Units with extracted content / total units |
| Knowledge base utility | Used for daily Salesforce work post-completion | Semantic search queries per week > 0 |

The "aha!" moment: first batch of badges earned automatically with 90%+ accuracy, and the knowledge base returns genuinely useful Salesforce explanations — not just quiz answers, but real understanding.

### Business Success

Personal productivity tool; "business" success = operational efficiency:

| Objective | Target | Timeframe |
|-----------|--------|-----------|
| Monthly operational cost | $20-50/month sustained | Ongoing |
| One-time processing cost | < $15 for full Trailmix run | Initial run |
| VPS resource usage | < 8GB RAM, < 4 vCPU sustained | During processing |
| System reliability | < 5% job failure rate after retries | Per processing run |
| Knowledge base size | 5,000+ indexed chunks across 100+ modules | After initial run |
| Cost per badge | < $0.50 | Per badge earned |

### Technical Success

| Metric | Target | Measurement |
|--------|--------|-------------|
| Content scraping throughput | 10-15 modules/hour | Modules processed / elapsed hours |
| Embedding generation rate | 100+ chunks/minute | Chunks embedded / elapsed minutes |
| Hybrid search relevance | 80%+ of quiz questions have relevant chunks in top-5 | Manual evaluation on 50-question sample |
| Quiz confidence distribution | 80%+ of answers with confidence > 0.85 | Confidence scores from quiz agent |
| Pipeline end-to-end latency | < 10 min per module (scrape→process→quiz) | Job queue timestamps |
| Browser automation stability | < 2% page navigation failures | Failed navigations / total navigations |
| Docker deployment | No OOM on Hetzner CX33 (4vCPU/8GB) | Memory monitoring |

### Measurable Outcomes

**Leading indicators (predict success):**
- Scraping throughput stays above 10 modules/hour
- Embedding pipeline processes 100+ chunks/minute
- 80%+ of quiz answers have confidence > 0.85

**Lagging indicators (confirm success):**
- Total badges earned matches Trailmix target
- Cumulative quiz accuracy across all modules >= 85%
- Knowledge base recall: relevant chunks in top-5 for 80%+ of quiz questions

**Anti-metrics (actively avoid):**
- Salesforce account flags or rate-limit blocks: target 0
- Manual interventions during automation: < 10% of modules
- Quiz retries due to low confidence: < 15% of quizzes

## Product Scope

### MVP Strategy

**Approach:** Problem-Solving MVP — deliver the minimum system that processes 100+ hours of Trailhead content with 85%+ quiz accuracy. No dashboard UI in MVP; API/CLI output proves the pipeline works.

**Resource model:** Solo developer (Demi) with Claude Code. VPS + Supabase + Vercel free tiers support the entire MVP.

**Go/no-go gate:** After 5 real Trailhead modules end-to-end, evaluate quiz accuracy and extraction quality. If accuracy < 70%, investigate knowledge retrieval before scaling.

### MVP Features (Phases 1-4)

| # | Feature | Why Essential |
|---|---------|--------------|
| 1 | **Trailmix Import & Module Enumeration** — Paste URL, system discovers all modules/units, stores in Supabase, creates job queue | Entry point for entire system; without it, no way to start |
| 2 | **Content Scraping Pipeline** — Playwright MCP navigates Trailhead, extracts unit content (text, code blocks, quiz questions), handles auth via persistent browser profiles | All content is behind rendered pages; no data without scraping |
| 3 | **Knowledge Processing** — Structure-aware chunking (400-512 tokens), OpenAI embedding generation, Supabase pgvector storage, full-text search indexing | Powers quiz answering; without context, answers are random guesses |
| 4 | **Hybrid Search** — Vector + full-text with RRF re-ranking for quiz context retrieval | Retrieval quality directly determines quiz accuracy |
| 5 | **Quiz Automation** — Extract questions, retrieve knowledge context, Claude chain-of-thought reasoning, submit answers via browser, log results with confidence scores | Core intelligence; closes the loop on badge earning |
| 6 | **Job Queue Orchestration** — pg-boss manages scrape → process → embed → quiz pipeline with priority ordering, retries, concurrency limits (2 browser pages max) | No orchestration means manual sequencing |
| 7 | **Basic Progress API** — Fastify endpoints for /health, module status, quiz results | Operational visibility for monitoring runs |
| 8 | **Docker Deployment** — API + Worker containers on Hetzner VPS with Docker Compose | Production deployment; enables unattended overnight runs |

**Core user journeys supported:** Happy Path (Journey 1), Error Recovery (Journey 2), Operations (Journey 3).

### Deferred Features

| Feature | Phase | Reason |
|---------|-------|--------|
| Dashboard UI with real-time updates | 5 | API/CLI output proves pipeline first |
| Knowledge explorer / concept graph visualization | 5 | Knowledge is valuable without visualization |
| Hands-on challenge automation (SF DX MCP) | 6 | Quiz modules are the primary badge target |
| Claude Batch API / prompt caching | 7 | Premature optimization; accuracy first |
| Concept relationship graph builder | 3+ | Enhances retrieval but not essential for 85%+ |
| Multi-user support | Future | Personal tool by design |

### Growth & Vision

- **Phase 5:** Next.js real-time dashboard, knowledge explorer, quiz review interface, concept graph visualization
- **Phase 6:** Salesforce DX MCP integration for hands-on challenge automation, community solutions import
- **Phase 7:** Cost optimization — Claude Batch API (50% discount), prompt caching (90% savings), model tiering (Haiku extraction, Sonnet reasoning)
- **Long-term:** Salesforce knowledge database as persistent AI coding assistant context (CLAUDE.md export, Claude Code queries, SF developer docs enrichment). Architecture generalizable to other quiz-gated learning platforms.

### Scope Risk Mitigation

**Technical:** Playwright automation against Trailhead's Shadow DOM is the highest-risk component. Accessibility-tree approach mitigates this. Riskiest assumption: hybrid search with 400-512 token chunks achieves 85%+ quiz accuracy — validated early via go/no-go gate.

**Resource:** If LLM costs exceed budget, switch reasoning from Sonnet to Haiku for most questions (Sonnet reserved for low-confidence retries). If VPS OOMs, reduce to 1 browser page — slower but functional. Absolute minimum: single Docker container running sequentially completes the Trailmix in 4-5 days.

## User Journeys

### Journey 1: Demi — The Full Automation Run (Happy Path)

**Opening Scene:** Demi has three Salesforce certification tracks to complete — Admin, Developer, Agentblazer — with a pressing deadline. Over 100 hours of Trailhead content stands between her and the badges she needs. The Hetzner VPS is provisioned, Docker stack running.

**Rising Action:** She sends her Trailmix URL to `/api/trailmix/import`. Within seconds, the system enumerates 47 modules containing 182 units — unit types, estimated times, track assignments. She configures: Admin track first (foundational), quiz-only mode enabled. She starts the run.

The scraper navigates modules. Status flips: `pending` → `scraping` → `scraped`. Content flows into the knowledge pipeline — chunked, embedded, indexed. After 5 modules, the quiz agent kicks in: "Q1: Correct (0.94)", "Q2: Correct (0.88)", "Q3: Correct (0.91)."

**Climax:** End of day one: 15 modules complete, 89% first-attempt accuracy. She queries the knowledge base: "How do sharing rules interact with OWD settings?" Returns a structured explanation from three modules with code examples and concept relationships. The knowledge base is building real Salesforce understanding.

**Resolution:** After 2.5 days: all quiz-type modules complete. 43 badges earned, 85%+ accuracy sustained. 5,200+ indexed chunks with concept graphs connecting Apex triggers to SObject events, Flows to Process Builder migration, Agentforce Topics to Actions. She exports the context for Claude Code and begins building Agentforce solutions.

### Journey 2: Demi — Error Recovery and Low Confidence (Edge Case)

**Opening Scene:** Midway through the Developer track, the quiz agent flags several answers with confidence below 0.60. Apex-specific modules are harder — less context for governor limits and bulkification patterns.

**Rising Action:** System auto-flags these for review. Three questions failed on first attempt — the quiz agent retrieved basic Apex syntax chunks but missed governor limit nuances. Two modules show `scraping_failed`: Trailhead returned a login redirect (session expiry).

**Climax:** Demi logs back into Trailhead through the persistent browser profile (30-second fix). Session restores, failed scrape jobs auto-retry via pg-boss. Low-confidence quizzes retry with additional context from subsequently processed modules. Second-attempt accuracy: 80%.

**Resolution:** Remaining modules complete with acceptable accuracy. The flagged quiz explanations teach her the actual concepts (governor limits, SOQL best practices) the quiz agent struggled with. Failures became learning moments.

### Journey 3: Demi — Operations and Monitoring

**Opening Scene:** Multi-day processing run. Demi monitors the VPS periodically from her laptop.

**Rising Action:** `/health` — API and worker running, pg-boss active. `/api/modules?status=failed` — two modules at `retry_count: 3` (timeout on heavy pages). She adjusts the timeout config, restarts the worker. `docker stats` — worker at 2.1GB (within 3GB limit), CPU averages 40%, API at 180MB. No OOM risk.

**Climax:** Embedding generation stalls — OpenAI 429 rate limits. Exponential backoff kicked in but the queue is building. She pauses the scraper, lets embeddings catch up (20 minutes), resumes at lower concurrency.

**Resolution:** Rhythm established: check status twice daily, review failed jobs, adjust concurrency. System runs largely autonomously. Total manual intervention: ~15 minutes across 3 days.

### Journey 4: AI Coding Agent — Knowledge Base Consumer

**Opening Scene:** Weeks after badge completion, Demi builds an Agentforce customer service solution in Claude Code. She needs to understand how Agentforce Topics map to Actions and how to configure Prompt Templates.

**Rising Action:** Claude Code queries the knowledge base via exported context or direct Supabase queries. Hybrid search returns chunks on Topic configuration, Action definitions, Prompt Template syntax — from Agentblazer track modules.

**Climax:** The concept relationship graph reveals Agentforce Topics require specific Data Cloud configurations — a cross-module dependency Demi hadn't considered.

**Resolution:** Claude Code generates Agentforce configuration informed by structured Salesforce knowledge. The knowledge base grows more valuable over time as documentation context and new modules are added.

### Journey Requirements Summary

| Journey | Key Capabilities Required |
|---------|--------------------------|
| Happy Path | Trailmix import, content scraping, knowledge processing, quiz automation, progress tracking, knowledge search |
| Error Recovery | Session detection, auth refresh, retry logic, confidence thresholds, manual review flags, queue management |
| Operations | Health endpoints, status queries, error inspection, resource monitoring, concurrency controls, log access |
| AI Consumer | Vector search API, concept graph queries, knowledge export, structured chunk retrieval |

## Domain-Specific Requirements

### Salesforce Platform Constraints

- **No Public Trailhead API** — All content must be scraped from rendered HTML via Playwright. Trailhead's internal GraphQL API only exposes profile/badge data, not module content.
- **Shadow DOM / Lightning Web Components** — Runtime-generated IDs require accessibility tree snapshots (`getByRole`, `getByLabel`, `:has-text()`) instead of CSS selectors.
- **Session Management** — Salesforce sessions expire. System must detect expiry (login redirects), support persistent browser profiles, and alert user for re-authentication when automated approaches fail.
- **Trailhead Playground Sandboxes** — Hands-on challenges need a connected Playground org with limited storage that may need periodic refreshing.

### Terms of Service & Ethical Considerations

- **Badge vs. Certification Distinction** — Salesforce monitors certification exams with higher enforcement than badge/module completion. Trailhead badges have lower enforcement.
- **Learning Accelerator Framing** — System positioned as knowledge extraction and learning acceleration, not blind quiz bypassing. Knowledge base with explanations is the primary output.
- **Rate Limiting** — Human-like delays (2-5s between navigations, between quiz submissions). Never exceed 2 concurrent browser pages.
- **Account Safety** — Zero Salesforce account flags is a hard requirement. System pauses immediately on suspicious activity detection.

### Technical Constraints

- **VPS Resources** — Hetzner CX33: 4 vCPU, 8GB RAM. Playwright Chromium needs ~512MB-1GB per page. Max 2 concurrent pages, 3GB worker container.
- **Budget** — $20-50/month ongoing, <$15 one-time processing. All LLM calls cost-tracked. Model tiering (Haiku extraction, Sonnet reasoning) and batch APIs where possible.
- **Vercel Limits** — 25s Edge timeout, 10s API Route timeout on Hobby. Long-running ops on VPS only; Vercel frontend is display and proxy.
- **Supabase Free Tier** — 500MB database, 1GB storage, pauses after 7 days inactivity. Plan for Pro ($25/month) if usage exceeds burst processing.

### Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Trailhead UI changes break selectors | Medium | High | Accessibility tree snapshots, selector validation in health checks |
| Session expiry mid-run | High | Medium | Persistent browser profiles + session detection + user alert |
| Quiz accuracy below 85% | Medium | High | Go/no-go gate at 5 modules; fallback: web search context, two-stage re-ranking |
| Salesforce rate limiting | Low | High | Human-like delays, max 2 concurrent pages, pause on 429/block signals |
| VPS OOM | Low | High | Memory limits per container, concurrency caps, `docker stats` monitoring |
| API provider outage | Low | Medium | Exponential backoff retries, dead letter queue, resume capability |
| Embedding cost overrun | Very Low | Low | text-embedding-3-small at $0.02/1M tokens; total corpus ~200K tokens ($0.004) |

## Innovation & Novel Patterns

### Knowledge-First Architecture

Most quiz automation tools treat badge completion as the end goal. TrailBlazeAI inverts this: the persistent Salesforce knowledge graph with vector embeddings and concept relationships is the primary output. Badge completion is the process that builds it — creating lasting value beyond the initial Trailhead sprint.

### Accessibility-Tree Browser Automation

Instead of fragile CSS selectors or expensive vision approaches, the system uses Playwright MCP's structured accessibility tree snapshots for all interactions. This provides resilience against Shadow DOM, runtime-generated IDs, and LWC structure — a novel approach to automating modern web applications.

### Triple-Purpose Knowledge Schema

A single pgvector-backed schema serves three distinct use cases: real-time quiz answering (hybrid search + chain-of-thought), AI coding agent reference (structured chunks queryable by Claude Code), and documentation lookup (concept graphs enabling cross-module reasoning). Most RAG systems are single-purpose.

### MCP-Native Integration Pattern

Playwright MCP, Supabase MCP, and Salesforce DX MCP as the primary integration layer instead of custom API wrappers. Standardized tool interfaces that evolve with upstream projects, reducing maintenance overhead.

### Validation & Risk Mitigation

- **Knowledge-first:** Validated by post-completion usage — semantic search queries per week
- **Accessibility-tree:** Validated against 100+ Trailhead pages; >95% successful navigation confirms the approach
- **Triple-purpose schema:** Each use case tested independently — quiz accuracy (85%+), coding agent recall (top-5), documentation precision
- **Fallbacks:** `browser_evaluate` JS queries for specific page failures; quiz-only degradation if knowledge base quality is low; pinned MCP versions with thin adapters for breaking changes

## Web Application Requirements

### Architecture Overview

Hybrid web application: Next.js 15 App Router frontend (Vercel) for dashboard/monitoring, paired with Fastify 5 API + Playwright workers (Docker on Hetzner VPS). Frontend is control plane and visibility; backend handles all processing.

### Browser Support

| Browser | Version | Priority |
|---------|---------|----------|
| Chrome | Latest 2 | Primary |
| Firefox | Latest 2 | Secondary |
| Edge | Latest 2 | Secondary |
| Safari | Latest | Best-effort |

Personal tool — no legacy browser support.

### Responsive Design

- **Desktop-first** — Primary usage for monitoring processing runs
- **Tablet** — Nice-to-have (shadcn/ui defaults)
- **Mobile** — Not priority; API endpoints serve any client

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Dashboard LCP | < 2s | Standard web app target |
| Real-time update latency | < 500ms | Supabase Realtime WebSocket |
| API proxy (Vercel → VPS) | < 3s | Bearer token REST |
| Knowledge search response | < 2s | Hybrid vector + FTS query |
| Page bundle size | < 200KB gzipped | Vercel Hobby limits |

### Real-Time Architecture

- **Supabase Realtime Postgres Changes** — Frontend subscribes to `modules` and `task_queue` table changes for live progress
- **Pattern:** Server components for initial load, client components with `useEffect` subscriptions for updates
- **No SSE/WebSocket from Vercel** — Real-time flows directly from Supabase to browser, bypassing Vercel's 25s Edge timeout

### Implementation Considerations

- **Server Components by default** — `"use client"` only for interactive components (real-time, forms, state)
- **API Route Proxy** — Vercel routes as thin authenticated proxies to VPS Fastify API
- **No SSR for dashboard** — Client-rendered with `loading.tsx` skeletons (no SEO requirement)
- **Standard Node.js runtime** — No Edge Runtime (compatibility gaps with Supabase client)
- **No SEO** — Private dashboard, all routes behind auth, robots.txt blocks crawlers
- **Basic accessibility** — shadcn/ui built-in ARIA + Radix UI semantic HTML; no formal WCAG compliance (single-user tool)

## Functional Requirements

### Content Acquisition

- **FR1:** User can import a Trailmix by providing its URL
- **FR2:** System enumerates all modules and units within an imported Trailmix, identifying module type, track, estimated time, and unit count
- **FR3:** System navigates to any Trailhead unit page and extracts full content (text, code blocks, quiz questions, learning objectives)
- **FR4:** System maintains an authenticated Trailhead session across runs using persistent browser profiles
- **FR5:** System detects session expiry and alerts user for re-authentication
- **FR6:** System handles Shadow DOM and dynamic content via accessibility tree snapshots for all browser interactions
- **FR7:** System extracts quiz questions, answer options, and submission controls from quiz pages

### Knowledge Processing

- **FR8:** System chunks extracted content into structure-aware segments (400-512 tokens) respecting section boundaries, code block integrity, and quiz atomicity
- **FR9:** System generates vector embeddings for all knowledge chunks using an embedding API
- **FR10:** System stores knowledge chunks with embeddings, full-text search indexes, and metadata (module, unit, content type, Salesforce topics, objects) in a vector database
- **FR11:** System tags chunks with content type (explanation, code, quiz, hands-on, reference, definition) and difficulty level
- **FR12:** System extracts Salesforce-specific entities (object names, API names, Apex keywords, Flow references)

### Knowledge Retrieval

- **FR13:** System performs hybrid search combining vector similarity and full-text search with RRF re-ranking
- **FR14:** System filters search results by content type, Salesforce topics, difficulty, and module name
- **FR15:** System retrieves top-k most relevant chunks for a given quiz question
- **FR16:** System re-ranks results using LLM-based relevance assessment for high-stakes queries

### Quiz Automation

- **FR17:** System analyzes a quiz question, retrieves relevant context, and selects the best answer using chain-of-thought reasoning
- **FR18:** System assigns a confidence score (0.0-1.0) to each answer
- **FR19:** System submits selected answers via browser automation
- **FR20:** System records results: selected answer, correct answer, confidence, reasoning, attempt number
- **FR21:** System flags low-confidence answers (below threshold) for user review instead of auto-submitting
- **FR22:** System retries questions with additional context when initial confidence is below threshold

### Pipeline Orchestration

- **FR23:** System manages a job queue with priority ordering across job types (scrape, process, embed, quiz)
- **FR24:** System enforces concurrency limits (max simultaneous browser pages, API calls)
- **FR25:** System retries failed jobs with configurable exponential backoff
- **FR26:** System chains pipeline stages automatically: scrape → process → embed → quiz-ready
- **FR27:** User can configure pipeline behavior (priority track, quiz-only mode, skip-completed)
- **FR28:** System can pause, resume, and cancel processing runs

### System Operations

- **FR29:** System reports health status of all services (API, worker, queue, database)
- **FR30:** System reports per-module processing status (pending, scraping, scraped, processing, ready, completed, failed)
- **FR31:** System reports aggregated progress (modules completed, badges earned, quiz accuracy, chunks indexed)
- **FR32:** System logs all agent actions with token usage and cost tracking
- **FR33:** System deploys as Docker containers on VPS with resource limits per container
- **FR34:** User can query module status and quiz results via REST API

### Knowledge Export

- **FR35:** User can perform semantic searches against the knowledge base via API
- **FR36:** System exposes knowledge chunks in structured format consumable by AI coding agents
- **FR37:** System tracks which badges have been earned for imported Trailmix modules

## Non-Functional Requirements

### Performance

- **NFR1:** Hybrid search returns results within 2s for knowledge bases up to 10,000 chunks
- **NFR2:** Content scraping sustains 10+ modules/hour throughput
- **NFR3:** Embedding generation sustains 100+ chunks/minute in batch mode
- **NFR4:** Health and status endpoints respond within 500ms
- **NFR5:** Pipeline stage transitions complete handoff within 10s via job queue

### Security

- **NFR6:** All credentials stored as environment variables, never in version control
- **NFR7:** VPS API endpoints require Bearer token authentication for all non-health requests
- **NFR8:** Frontend uses Supabase anon key with RLS; VPS uses service role key
- **NFR9:** Persistent browser profiles with Salesforce sessions stored in Docker volumes, inaccessible outside container

### Reliability

- **NFR10:** Failed jobs retry with exponential backoff up to 3 times before dead letter state
- **NFR11:** System survives individual service restarts without data loss
- **NFR12:** Pipeline state persisted in Supabase; full restart resumes from last known good state
- **NFR13:** System operates unattended up to 72 hours (excluding session re-auth)
- **NFR14:** Job failure rate below 5% after all retries

### Integration

- **NFR15:** Playwright MCP operates via stdio transport within Docker for lowest latency
- **NFR16:** Supabase client uses connection pooling for concurrent worker operations
- **NFR17:** LLM API calls implement retry with exponential backoff on 429 responses
- **NFR18:** All external API dependencies have configurable timeouts and circuit breaker behavior

### Cost Efficiency

- **NFR19:** Monthly cost within $20-50 including all services
- **NFR20:** One-time processing cost for 100-module Trailmix below $15
- **NFR21:** System tracks cumulative LLM token usage and estimated cost per run
- **NFR22:** Container memory limits: API 512MB, Worker 3GB, total VPS under 8GB

### Observability

- **NFR23:** All agent actions logged with timestamp, agent name, action type, token count, cost
- **NFR24:** Module processing status queryable via REST API at any time
- **NFR25:** Aggregated metrics available: modules processed, quiz accuracy, chunks indexed, estimated cost
