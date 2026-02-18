---
stepsCompleted: [step-01-validate-prerequisites]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# TrailBlazeAI - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for TrailBlazeAI, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User can import a Trailmix by providing its URL
FR2: System enumerates all modules and units within an imported Trailmix, identifying module type, track, estimated time, and unit count
FR3: System navigates to any Trailhead unit page and extracts full content (text, code blocks, quiz questions, learning objectives)
FR4: System maintains an authenticated Trailhead session across runs using persistent browser profiles
FR5: System detects session expiry and alerts user for re-authentication
FR6: System handles Shadow DOM and dynamic content via accessibility tree snapshots for all browser interactions
FR7: System extracts quiz questions, answer options, and submission controls from quiz pages
FR8: System chunks extracted content into structure-aware segments (400-512 tokens) respecting section boundaries, code block integrity, and quiz atomicity
FR9: System generates vector embeddings for all knowledge chunks using an embedding API
FR10: System stores knowledge chunks with embeddings, full-text search indexes, and metadata (module, unit, content type, Salesforce topics, objects) in a vector database
FR11: System tags chunks with content type (explanation, code, quiz, hands-on, reference, definition) and difficulty level
FR12: System extracts Salesforce-specific entities (object names, API names, Apex keywords, Flow references)
FR13: System performs hybrid search combining vector similarity and full-text search with RRF re-ranking
FR14: System filters search results by content type, Salesforce topics, difficulty, and module name
FR15: System retrieves top-k most relevant chunks for a given quiz question
FR16: System re-ranks results using LLM-based relevance assessment for high-stakes queries
FR17: System analyzes a quiz question, retrieves relevant context, and selects the best answer using chain-of-thought reasoning
FR18: System assigns a confidence score (0.0-1.0) to each answer
FR19: System submits selected answers via browser automation
FR20: System records results: selected answer, correct answer, confidence, reasoning, attempt number
FR21: System flags low-confidence answers (below threshold) for user review instead of auto-submitting
FR22: System retries questions with additional context when initial confidence is below threshold
FR23: System manages a job queue with priority ordering across job types (scrape, process, embed, quiz)
FR24: System enforces concurrency limits (max simultaneous browser pages, API calls)
FR25: System retries failed jobs with configurable exponential backoff
FR26: System chains pipeline stages automatically: scrape → process → embed → quiz-ready
FR27: User can configure pipeline behavior (priority track, quiz-only mode, skip-completed)
FR28: System can pause, resume, and cancel processing runs
FR29: System reports health status of all services (API, worker, queue, database)
FR30: System reports per-module processing status (pending, scraping, scraped, processing, ready, completed, failed)
FR31: System reports aggregated progress (modules completed, badges earned, quiz accuracy, chunks indexed)
FR32: System logs all agent actions with token usage and cost tracking
FR33: System deploys as Docker containers on VPS with resource limits per container
FR34: User can query module status and quiz results via REST API
FR35: User can perform semantic searches against the knowledge base via API
FR36: System exposes knowledge chunks in structured format consumable by AI coding agents
FR37: System tracks which badges have been earned for imported Trailmix modules

### NonFunctional Requirements

NFR1: Hybrid search returns results within 2s for knowledge bases up to 10,000 chunks
NFR2: Content scraping sustains 10+ modules/hour throughput
NFR3: Embedding generation sustains 100+ chunks/minute in batch mode
NFR4: Health and status endpoints respond within 500ms
NFR5: Pipeline stage transitions complete handoff within 10s via job queue
NFR6: All credentials stored as environment variables, never in version control
NFR7: VPS API endpoints require Bearer token authentication for all non-health requests
NFR8: Frontend uses Supabase anon key with RLS; VPS uses service role key
NFR9: Persistent browser profiles with Salesforce sessions stored in Docker volumes, inaccessible outside container
NFR10: Failed jobs retry with exponential backoff up to 3 times before dead letter state
NFR11: System survives individual service restarts without data loss
NFR12: Pipeline state persisted in Supabase; full restart resumes from last known good state
NFR13: System operates unattended up to 72 hours (excluding session re-auth)
NFR14: Job failure rate below 5% after all retries
NFR15: Playwright MCP operates via stdio transport within Docker for lowest latency
NFR16: Supabase client uses connection pooling for concurrent worker operations
NFR17: LLM API calls implement retry with exponential backoff on 429 responses
NFR18: All external API dependencies have configurable timeouts and circuit breaker behavior
NFR19: Monthly cost within $20-50 including all services
NFR20: One-time processing cost for 100-module Trailmix below $15
NFR21: System tracks cumulative LLM token usage and estimated cost per run
NFR22: Container memory limits: API 512MB, Worker 3GB, total VPS under 8GB
NFR23: All agent actions logged with timestamp, agent name, action type, token count, cost
NFR24: Module processing status queryable via REST API at any time
NFR25: Aggregated metrics available: modules processed, quiz accuracy, chunks indexed, estimated cost

### Additional Requirements

**From Architecture:**

- AR1: Custom monorepo scaffold already exists (Next.js 15 + Fastify 5 + Supabase + pg-boss). No starter template to scaffold — project initialization is complete.
- AR2: Three-tier hybrid deployment: Vercel (frontend), Hetzner VPS (API + Worker), Supabase (database + realtime)
- AR3: Database schema requires 7 sequential migrations: core tables, knowledge tables, quiz tables, observability, indexes, RLS policies, hybrid search function
- AR4: Playwright MCP as primary browser automation (stdio transport) with Stagehand v3 as targeted fallback for Shadow DOM extraction failures
- AR5: 6-stage sequential knowledge pipeline: ScrapeUnit → ExtractContent → IdentifyConcepts → ChunkContent → GenerateEmbeddings → BuildRelationships
- AR6: ChonkieJS library + custom Trailhead rules for domain-specific chunking (code blocks intact, quiz questions atomic, hands-on steps grouped)
- AR7: OpenAI text-embedding-3-small (1536 dimensions) via AI SDK embedMany() with HNSW indexing in Supabase pgvector
- AR8: Hybrid search implemented as Supabase SQL function with RRF re-ranking (full_text_weight=1.5, semantic_weight=1.0)
- AR9: Four specialized AI agents: Scraper Agent, Knowledge Agent, Quiz Agent, Documentation Agent — using AI SDK v5 with tiered model selection (Haiku for bulk, Sonnet for reasoning)
- AR10: pg-boss v10 with queue-per-stage pattern, stage-specific retry configuration, priority ordering, and dead letter queues
- AR11: Dual Supabase Realtime patterns: Pattern A (router.refresh for status changes) and Pattern B (useState for live agent logs)
- AR12: Three-layer authentication: Supabase Auth (frontend), Bearer token (VPS API), Salesforce session management (persistent browser profiles)
- AR13: ToolTrace pattern for agent action logging with structured Pino logging for system events
- AR14: Three Docker containers: API (512MB), Worker (3GB, Playwright image), Nginx (reverse proxy + SSL)
- AR15: Vitest for unit/integration tests, Playwright for E2E tests — co-located test files
- AR16: Cost optimization via model tiering (Haiku/Sonnet), prompt caching, batch API, embedding batching — estimated $5-9 one-time for 100 modules
- AR17: Module state machine: pending → scraping → scraped → processing → ready → quizzing → completed (failed from any state)
- AR18: API response envelope pattern: ApiSuccess<T> | ApiError with snake_case JSON fields matching database
- AR19: AppError hierarchy: AppError → NotFoundError, ValidationError, PipelineError with Fastify global error handler
- AR20: YAML-driven prompt configuration for all agents, stored in apps/api/src/prompts/
- AR21: Zod validation at all system boundaries: env vars, API inputs, LLM structured output (one retry on validation failure)
- AR22: snake_case throughout TypeScript for database-related code (no camelCase transformation layer)
- AR23: All naming conventions defined: DB snake_case, API kebab-case routes, files kebab-case, components PascalCase, functions camelCase

**From UX Design:**

- UX1: Three-column layout (Direction 7 — Quiz Review Focus): sidebar (220px) + pipeline center (flexible) + review panel (340px, collapsible)
- UX2: AppShell component with CSS Grid managing responsive column transitions (desktop 3-col, tablet 2-col, mobile single)
- UX3: Sidebar navigation with Dashboard, Knowledge Base, and Settings pages — collapsible to 48px icons on tablet, bottom tab bar on mobile
- UX4: Cmd+K global omnibar (shadcn Command component) for universal search across modules, knowledge entries, and navigation
- UX5: Hero stat cards (4-5 metrics): modules completed, badges earned, quiz accuracy, time saved — with animated value updates
- UX6: Pipeline filter chips (radiogroup): All, Review, Active, Error, Done — with real-time counts
- UX7: URL input component with inline validation for Trailhead URL patterns, auto-focus on empty state
- UX8: ModuleRow component showing status badge, module name, trail label, progress bar, and action buttons per pipeline state
- UX9: ReviewPanel — persistent right panel that slides in (200ms ease) when quiz-ready modules exist, collapses when empty
- UX10: QuizQuestion component with question display, AI answer card, confidence bar, Approve/Edit actions
- UX11: ConfidenceBar component with color ranges: green (>=90%), amber (70-89%), red (<70%) with "Low confidence" label
- UX12: Knowledge base split-panel: search results left, detail right with concept relationship links
- UX13: Design system: shadcn/ui new-york style, Tailwind CSS v4, IBM Plex Sans + Geist Mono fonts, indigo primary palette
- UX14: Custom pipeline status colors: queued (gray), scraping (cyan), processing (purple), embedding (indigo), quiz-ready (amber), completed (green), error (red)
- UX15: Toast notifications via Sonner: success (3s), error (persistent), warning (5s), info (3s) — bottom-right, max 3 visible
- UX16: Keyboard-first interaction: Cmd+K search, Enter to approve, E to edit, Escape to close, arrow keys for navigation
- UX17: Desktop-first responsive: full experience at >=1024px, adapted at 768-1023px, monitoring-only at <768px
- UX18: WCAG 2.1 Level AA accessibility: 4.5:1 contrast, visible focus rings, screen reader support, aria-live regions for updates
- UX19: Skeleton loading states matching component dimensions, minimum 200ms display, respects prefers-reduced-motion
- UX20: Empty states: single actionable sentence, no illustrations — focused URL input on empty dashboard
- UX21: Light and dark theme support via data-theme attribute, system preference detection, localStorage persistence
- UX22: All transitions respect prefers-reduced-motion: reduce — instant state changes when enabled
- UX23: Button hierarchy: primary (solid indigo, one per context), secondary (ghost + border), tertiary (text-only)
- UX24: Real-time updates via Supabase Realtime — no polling, no manual refresh needed for pipeline status changes

### FR Coverage Map

{{requirements_coverage_map}}

## Epic List

{{epics_list}}
