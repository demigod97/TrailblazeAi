---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics]
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

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Import Trailmix by URL |
| FR2 | Epic 1 | Enumerate modules/units with metadata |
| FR3 | Epic 2 | Navigate and extract unit content |
| FR4 | Epic 2 | Maintain authenticated session with persistent profiles |
| FR5 | Epic 2 | Detect session expiry and alert user |
| FR6 | Epic 2 | Handle Shadow DOM via accessibility tree |
| FR7 | Epic 2 | Extract quiz questions and answer options |
| FR8 | Epic 3 | Structure-aware content chunking |
| FR9 | Epic 3 | Vector embedding generation |
| FR10 | Epic 3 | Knowledge storage with embeddings, FTS, metadata |
| FR11 | Epic 3 | Content type tagging |
| FR12 | Epic 3 | Salesforce entity extraction |
| FR13 | Epic 3 | Hybrid search (vector + FTS + RRF) |
| FR14 | Epic 3 | Filter by content type, topics, difficulty |
| FR15 | Epic 3 | Top-k retrieval for quiz questions |
| FR16 | Epic 4 | LLM-based relevance re-ranking |
| FR17 | Epic 4 | Chain-of-thought quiz answering |
| FR18 | Epic 4 | Confidence scoring (0.0-1.0) |
| FR19 | Epic 4 | Answer submission via browser |
| FR20 | Epic 4 | Result recording |
| FR21 | Epic 4 | Low-confidence flagging for review |
| FR22 | Epic 4 | Retry with additional context |
| FR23 | Epic 2 | Job queue with priority ordering |
| FR24 | Epic 2 | Concurrency limits (browser pages, API calls) |
| FR25 | Epic 2 | Retry failed jobs with backoff |
| FR26 | Epic 2 | Stage chaining (scrape → extract) |
| FR27 | Epic 5 | Pipeline configuration |
| FR28 | Epic 5 | Pause, resume, cancel runs |
| FR29 | Epic 1 | Health status reporting |
| FR30 | Epic 1 | Per-module processing status |
| FR31 | Epic 5 | Aggregated progress reporting |
| FR32 | Epic 5 | Agent action logging with cost tracking |
| FR33 | Epic 1 | Docker container deployment |
| FR34 | Epic 1 | REST API for status/results |
| FR35 | Epic 3 | Semantic search via API |
| FR36 | Epic 3 | Structured knowledge for AI agents |
| FR37 | Epic 4 | Badge tracking |

## Epic List

### Epic 1: Project Foundation & Trailmix Import

Demi can deploy the system to VPS, access a secure dashboard, submit a Trailmix URL, and see all discovered modules listed with metadata and real-time status tracking.

**FRs covered:** FR1, FR2, FR29, FR30, FR33, FR34

**Infrastructure delivered:** Database schema (7 migrations), Fastify API with plugins (auth, error handler, pg-boss init, CORS, rate-limit), Docker 3-container stack, frontend shell (AppShell, Sidebar, Supabase Auth), dashboard with URL input, module list, stat cards, filter chips, Supabase Realtime for module status.

### Epic 2: Content Extraction & Browser Automation

Demi can trigger automated content extraction from discovered modules and watch real-time progress as the scraper navigates Trailhead pages, extracts content (text, code, quizzes), and handles session management with persistent browser profiles.

**FRs covered:** FR3, FR4, FR5, FR6, FR7, FR23, FR24, FR25, FR26

**Key capabilities:** Playwright MCP browser automation with accessibility tree snapshots, Stagehand v3 fallback for Shadow DOM edge cases, persistent browser profiles for Salesforce session management, session expiry detection and user alert flow, pg-boss queue management with scrape → extract stage chaining, concurrency limits (max 2 browser pages) and retry with backoff, real-time scraping progress visible in dashboard.

### Epic 3: Knowledge Processing & Search

Demi can see extracted content transformed into a searchable Salesforce knowledge base — chunked, embedded, tagged with concepts and entities — and search it via hybrid search with filtering and concept relationships.

**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR35, FR36

**Key capabilities:** ChonkieJS + custom Trailhead chunking rules, OpenAI text-embedding-3-small via AI SDK embedMany(), Salesforce entity extraction, hybrid search SQL function with RRF re-ranking, knowledge base UI with search, filtering, and concept relationships, Cmd+K omnibar for global search, structured knowledge API for AI coding agents.

### Epic 4: Quiz Automation & Review

Demi can review AI-generated quiz answers with confidence scores and chain-of-thought reasoning, approve or edit answers, submit them to Trailhead via browser automation, and track badge completion across all modules.

**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR37

**Key capabilities:** Quiz Agent with Claude Sonnet chain-of-thought reasoning, LLM-based relevance re-ranking, confidence scoring (0.0-1.0) with color-coded bars, Review Panel with approve/edit workflow, low-confidence flagging for manual review, retry with additional context, browser-based answer submission, badge tracking.

### Epic 5: Pipeline Operations & Monitoring

Demi can configure pipeline behavior (priority tracks, quiz-only mode), pause/resume/cancel processing runs, monitor system health and agent costs, and manage multi-day unattended runs with full operational visibility.

**FRs covered:** FR27, FR28, FR31, FR32

**Key capabilities:** Pipeline configuration UI (priority track, quiz-only mode, skip-completed), pause/resume/cancel controls, aggregated progress reporting, agent action logging with ToolTrace pattern, Settings page with system health, concurrency controls, cost tracking.

## Epic 1: Project Foundation & Trailmix Import

Demi can deploy the system to VPS, access a secure dashboard, submit a Trailmix URL, and see all discovered modules listed with metadata and real-time status tracking.

### Story 1.1: API Foundation & Docker Deployment

As a developer,
I want the Fastify API and Worker deployed as Docker containers with health monitoring,
So that the backend infrastructure is operational and verifiable.

**Acceptance Criteria:**

**Given** the Docker Compose file defines API (512MB), Worker (3GB), and Nginx containers
**When** I run `docker compose up -d --build`
**Then** all three containers start successfully with resource limits enforced
**And** the Nginx reverse proxy routes `/api/*` to the Fastify server with SSL termination

**Given** the Fastify API is running
**When** I send GET /health
**Then** I receive a 200 response within 500ms showing status of API, database connection, and pg-boss queue
**And** the response follows the ApiResponse envelope format with snake_case fields

**Given** the API receives a request without a valid Bearer token
**When** the request targets any endpoint except /health
**Then** the API returns 401 with an ApiError response

**Given** the API encounters an error
**When** the error is an AppError subclass (NotFoundError, ValidationError, PipelineError)
**Then** the global error handler returns the correct HTTP status code and structured ApiError response

**Given** environment variables are defined in .env
**When** the API starts
**Then** all required variables are validated with Zod schemas and the server fails fast with descriptive errors if validation fails

### Story 1.2: Frontend Shell & Authentication

As a user,
I want to log into a secure dashboard with a responsive three-column layout,
So that I have a private workspace for monitoring automation.

**Acceptance Criteria:**

**Given** I am not authenticated
**When** I navigate to the dashboard
**Then** I am redirected to the login page

**Given** I am on the login page
**When** I enter valid email and password
**Then** I am authenticated via Supabase Auth and redirected to the dashboard
**And** the middleware uses getClaims() for session validation (no network round-trip)

**Given** I am authenticated
**When** the dashboard loads
**Then** I see a three-column layout: sidebar (220px), center content area (flexible), and review panel placeholder (collapsed)
**And** the sidebar shows navigation for Dashboard, Knowledge Base, and Settings with active page highlighted

**Given** I am on any page
**When** I view the interface
**Then** the design system uses the indigo primary palette, IBM Plex Sans body font, Geist Mono for data, and light/dark theme via data-theme attribute with system preference detection

**Given** I am on a desktop (>=1024px)
**When** I resize the browser below 1024px
**Then** the sidebar collapses to 48px icon-only mode
**And** below 768px the layout switches to single column with bottom tab bar

**Given** data is loading
**When** any page renders before data arrives
**Then** skeleton loading states appear matching final component dimensions

### Story 1.3: Trailmix Import & Module Discovery

As a user,
I want to submit a Trailmix URL and see all discovered modules with their metadata,
So that I know exactly what content will be processed.

**Acceptance Criteria:**

**Given** I am on the dashboard
**When** no Trailmix has been imported
**Then** I see a focused URL input with placeholder "Paste a Trailhead trail or module URL..." and auto-focus

**Given** I paste a valid Trailmix URL and press Enter
**When** the system processes the URL
**Then** the input shows a spinner during import
**And** POST /api/trailmix/import creates a run record and enumerates all modules and units
**And** each module is stored with: name, type, track, estimated time, unit count, and status "pending"

**Given** I paste an invalid URL
**When** I submit the form
**Then** I see an inline validation error: "Enter a valid Trailhead URL" with red border
**And** the input retains focus for correction

**Given** modules have been imported
**When** the dashboard renders
**Then** I see a list of all modules with their names, trail labels, and "queued" status badges
**And** shared domain types (Module, Unit, Trailmix) are defined in packages/shared with snake_case matching database columns

**Given** the import fails (network error, invalid page)
**When** the API returns an error
**Then** a toast notification appears: "Import failed — check URL" (error type, persistent until dismissed)

### Story 1.4: Real-Time Module Status Dashboard

As a user,
I want module status to update in real-time with hero stats and filter chips,
So that I can monitor progress at a glance without refreshing.

**Acceptance Criteria:**

**Given** modules exist in the database
**When** the dashboard loads
**Then** I see hero stat cards showing: total modules, modules by status, and estimated time
**And** stat card values use text-3xl monospace font with animated updates on change

**Given** I am viewing the module list
**When** a module's status changes in the database
**Then** the module row updates in real-time via Supabase Realtime (Pattern A: router.refresh)
**And** the status badge color transitions smoothly (150ms ease)
**And** stat card counts animate to new values

**Given** the pipeline filter chips are displayed
**When** I click a filter chip (All, Active, Error, Done)
**Then** the module list filters to show only matching modules
**And** each chip shows its count in parentheses with real-time updates
**And** the filter acts as a single-select radiogroup

**Given** I want to query status programmatically
**When** I call GET /api/modules with optional ?status= filter
**Then** I receive a paginated response with module data following the ApiResponse envelope
**And** GET /api/modules/:id returns full module detail with units

**Given** all modules are in "pending" state
**When** I view the module list
**Then** modules are sorted: quiz-ready first, then active, then queued, then completed (faded at opacity 0.6)
