---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
status: 'complete'
completedAt: '2026-02-18'
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

## Epic 2: Content Extraction & Browser Automation

Demi can trigger automated content extraction from discovered modules and watch real-time progress as the scraper navigates Trailhead pages, extracts content (text, code, quizzes), and handles session management with persistent browser profiles.

### Story 2.1: Playwright MCP Integration & Browser Session Management

As a user,
I want the system to maintain an authenticated Trailhead session using persistent browser profiles,
So that content extraction works across multiple runs without re-authentication.

**Acceptance Criteria:**

**Given** the Worker container has Playwright MCP installed
**When** the MCP client is initialized
**Then** it connects via stdio transport with the persistent browser profile at /data/playwright-profiles/
**And** the profile is stored in a Docker volume that survives container restarts

**Given** a persistent browser profile exists with a valid Trailhead session
**When** the system checks session validity via browser_snapshot on a known Trailhead page
**Then** it confirms the session is active and proceeds with scraping

**Given** the browser encounters dynamic content with Shadow DOM / LWC
**When** the system needs to interact with the page
**Then** it uses accessibility tree snapshots (getByRole, getByLabel, :has-text()) instead of CSS selectors

**Given** Playwright MCP fails to extract content from a specific page
**When** the accessibility tree approach returns incomplete data
**Then** Stagehand v3 fallback is invoked with a Zod schema for structured extraction
**And** the fallback result is logged with tool_type "stagehand" in agent logs

### Story 2.2: Unit Content Extraction Pipeline

As a user,
I want the system to automatically navigate to Trailhead unit pages and extract full content,
So that module content is captured for knowledge processing.

**Acceptance Criteria:**

**Given** a module has status "pending" and a scrape job is queued
**When** the Scraper Agent processes the job
**Then** it navigates to each unit page via Playwright MCP and extracts: text content, code blocks, quiz questions with options, and learning objectives
**And** the module status transitions from "pending" to "scraping" to "scraped"

**Given** raw HTML is extracted from a unit page
**When** the extract-content stage processes it
**Then** the HTML is parsed into structured sections: headers, explanatory text, code blocks (preserved intact), and quiz items
**And** content is stored as markdown in the units table with content_markdown column

**Given** a unit contains quiz questions
**When** the extraction completes
**Then** each question is stored in the quiz_items table with: question text, answer options, and submission control identifiers

**Given** a scrape job completes successfully
**When** all units in the module are scraped
**Then** pg-boss automatically chains to the extract-content queue for the next pipeline stage
**And** the Scraper Agent prompts are loaded from apps/api/src/prompts/scraper-agent.yaml

**Given** the system is scraping modules
**When** human-like delays are applied
**Then** 2-5 seconds elapse between page navigations to maintain account safety

### Story 2.3: Pipeline Concurrency & Retry Management

As a user,
I want the system to enforce concurrency limits and retry failed jobs automatically,
So that the VPS isn't overwhelmed and transient failures are handled gracefully.

**Acceptance Criteria:**

**Given** the scrape-module queue is configured
**When** multiple scrape jobs are queued
**Then** a maximum of 2 jobs run concurrently (matching the 2-browser-page VPS limit)
**And** the extract-content queue allows up to 5 concurrent jobs

**Given** a scrape job fails due to a transient error (timeout, network issue)
**When** the retry limit has not been reached
**Then** the job retries with exponential backoff (up to 3 retries for scrape, 2 for extract)
**And** the module's retry count increments and is visible on the module row

**Given** a job has exhausted all retries
**When** it enters dead letter state
**Then** the module status transitions to "failed"
**And** the module row shows an error badge with "Failed (attempt 3/3)" and a "Retry" button
**And** the job is moved to dead-letter-scrape-module queue

**Given** pg-boss queues are initialized
**When** the API starts
**Then** queues are created with stage-specific configuration: scrape-module (retryLimit: 3, retryBackoff: true, expireInHours: 1), extract-content (retryLimit: 2, retryBackoff: true, expireInHours: 0.5)

### Story 2.4: Session Expiry Detection & Recovery

As a user,
I want the system to detect expired Trailhead sessions and alert me for re-authentication,
So that the pipeline can resume after I log back in.

**Acceptance Criteria:**

**Given** the scraper navigates to a Trailhead page
**When** the page redirects to a Salesforce login page
**Then** the system detects the session expiry via URL pattern matching

**Given** session expiry is detected
**When** the scraper agent recognizes the login redirect
**Then** all in-progress scrape jobs are paused
**And** the module status is set to "failed" with reason "session_expired"
**And** a warning toast appears on the frontend: "Session expired — re-authenticate" (persistent until dismissed)

**Given** I have re-authenticated by logging into Trailhead manually through the persistent browser profile
**When** I click "Retry" on the failed modules
**Then** the system validates the new session via browser_snapshot
**And** failed modules with reason "session_expired" are re-queued for scraping
**And** module status transitions back to "pending"

**Given** session expiry occurs during an overnight run
**When** the pipeline has been paused due to expired session
**Then** all non-session-related modules continue processing (embedding, chunking)
**And** only scraping jobs that require browser access are paused

## Epic 3: Knowledge Processing & Search

Demi can see extracted content transformed into a searchable Salesforce knowledge base — chunked, embedded, tagged with concepts and entities — and search it via hybrid search with filtering and concept relationships.

### Story 3.1: Content Chunking with Salesforce-Specific Rules

As a user,
I want extracted content chunked into structure-aware segments with Salesforce-specific tagging,
So that knowledge is organized for accurate retrieval.

**Acceptance Criteria:**

**Given** a unit has extracted content in markdown format
**When** the identify-concepts stage processes it
**Then** the Knowledge Agent (Claude Haiku) extracts Salesforce-specific concepts: object names, API names, Apex keywords, Flow references
**And** the output is validated with a Zod schema (one retry on validation failure)
**And** prompts are loaded from apps/api/src/prompts/knowledge-agent.yaml

**Given** structured content is ready for chunking
**When** the chunk-content stage processes it
**Then** ChonkieJS splits content into 400-512 token segments with 50-100 token overlap
**And** code blocks are kept intact as separate chunks (never split mid-block)
**And** quiz questions are atomic: one question + all options = one chunk with content_type "quiz"
**And** hands-on steps are grouped together (~800 tokens) with content_type "hands_on"

**Given** chunks are created
**When** they are stored in sf_knowledge_chunks
**Then** each chunk includes: content, content_type (explanation, code, quiz, hands_on, reference, definition), difficulty level, sf_topics array, unit_id foreign key, and section header metadata

**Given** the pipeline processes a unit
**When** identify-concepts and chunk-content stages complete
**Then** pg-boss chains to the next stage (generate-embeddings)

### Story 3.2: Embedding Generation & Vector Storage

As a user,
I want knowledge chunks embedded and stored with vector indexes,
So that semantic search can find relevant content.

**Acceptance Criteria:**

**Given** knowledge chunks exist in sf_knowledge_chunks without embeddings
**When** the generate-embeddings stage processes a batch
**Then** AI SDK embedMany() calls OpenAI text-embedding-3-small with maxParallelCalls: 5 and maxRetries: 3
**And** each chunk receives a 1536-dimension embedding vector

**Given** embeddings are generated
**When** they are stored in sf_knowledge_chunks
**Then** the embedding column is populated
**And** a full-text search tsvector column (fts) is generated from the chunk content
**And** token usage is tracked in agent logs

**Given** the knowledge base grows
**When** 100+ chunks are stored
**Then** an HNSW index (m=16, ef_construction=64) on the embedding column provides fast vector similarity search
**And** a GIN index on the fts column provides fast full-text search

**Given** the generate-embeddings queue is configured
**When** multiple embedding jobs are queued
**Then** up to 5 run concurrently with 3 retries and exponential backoff on 429 rate limit errors

**Given** all chunks for a module are embedded
**When** the embedding stage completes
**Then** pg-boss chains to build-relationships stage

### Story 3.3: Concept Relationship Mapping

As a user,
I want the system to map concept dependencies between Salesforce topics,
So that cross-module knowledge connections are discoverable.

**Acceptance Criteria:**

**Given** a module's concepts have been identified
**When** the build-relationships stage processes them
**Then** the Knowledge Agent (Claude Haiku) maps concept dependencies with relationship types: prerequisite, related_to, part_of
**And** relationships are stored in sf_concept_relationships table with source_concept, target_concept, and relationship_type

**Given** relationships span multiple modules
**When** a concept from Module A relates to a concept from Module B
**Then** the cross-module relationship is stored and discoverable

**Given** the build-relationships stage completes for a module
**When** all pipeline stages are finished
**Then** the module status transitions to "ready" (available for quiz answering or knowledge search)

### Story 3.4: Hybrid Search & Knowledge API

As a user,
I want to search the knowledge base using hybrid search with filtering,
So that I can find relevant Salesforce information quickly.

**Acceptance Criteria:**

**Given** the hybrid_search() SQL function is deployed
**When** I call it with query text and a query embedding
**Then** it combines vector similarity and full-text search using RRF re-ranking with full_text_weight=1.5 and semantic_weight=1.0
**And** returns the top-k most relevant chunks ordered by combined score

**Given** I call GET /api/knowledge/search with query parameters
**When** the request includes ?q=query_text and optional filters (?content_type=, ?sf_topics=, ?difficulty=, ?module_name=)
**Then** the API generates an embedding for the query, calls hybrid_search(), applies filters, and returns results within 2 seconds
**And** the response follows the ApiResponse envelope with paginated results

**Given** search results are returned
**When** the response is consumed by an AI coding agent
**Then** each result includes: chunk content, content_type, sf_topics, source module name, unit title, relevance score, and related_chunk_ids

**Given** no results match the query
**When** the search returns empty
**Then** the API returns an empty array (never null) with count: 0

### Story 3.5: Knowledge Base UI with Global Search

As a user,
I want to browse and search the knowledge base with a split-panel UI and Cmd+K omnibar,
So that I can explore Salesforce knowledge efficiently.

**Acceptance Criteria:**

**Given** I navigate to the Knowledge Base page
**When** the page loads
**Then** I see a split-panel layout: search results on the left, detail panel on the right
**And** the search input is focused by default

**Given** I type a query in the search input
**When** 300ms have passed since the last keystroke (debounced)
**Then** hybrid search results appear in the left panel
**And** each result shows: chunk title, source module name, content type icon, relevance score (monospace, muted), and a content preview snippet

**Given** I click a search result
**When** the detail panel loads
**Then** I see the full chunk content with metadata (module, unit, content type, difficulty, sf_topics)
**And** related concepts are linked at the bottom of the detail view
**And** clicking a related concept navigates to that knowledge entry

**Given** I am on any page
**When** I press Cmd+K (or Ctrl+K)
**Then** the Command dialog opens (shadcn Command component)
**And** I can search across modules, knowledge entries, and navigation actions
**And** results are navigable via arrow keys, Enter to select, Escape to close

**Given** the knowledge base has no content
**When** the Knowledge Base page loads
**Then** I see: "Process some Trailhead modules to build your knowledge base."

## Epic 4: Quiz Automation & Review

Demi can review AI-generated quiz answers with confidence scores and chain-of-thought reasoning, approve or edit answers, submit them to Trailhead via browser automation, and track badge completion across all modules.

### Story 4.1: Quiz Agent with Chain-of-Thought Reasoning

As a user,
I want the system to analyze quiz questions using AI with chain-of-thought reasoning and confidence scoring,
So that answers are accurate and transparent.

**Acceptance Criteria:**

**Given** a module has status "ready" with quiz items stored
**When** the answer-quiz job is processed
**Then** the Quiz Agent (Claude Sonnet) retrieves relevant context via hybrid search for each question
**And** LLM-based relevance re-ranking selects the most pertinent chunks for high-stakes quiz context

**Given** the Quiz Agent analyzes a question
**When** it generates an answer
**Then** it uses chain-of-thought reasoning: restates the question, evaluates each option against retrieved context, and selects the best answer
**And** a confidence score (0.0-1.0) is assigned based on context coverage and answer certainty
**And** the full reasoning chain is preserved for user review

**Given** quiz results are generated
**When** they are stored in the quiz_results table
**Then** each result includes: quiz_item_id, selected_answer, correct_answer (null until verified), confidence, reasoning text, and attempt_number
**And** the module status transitions from "ready" to "quizzing"

**Given** the answer-quiz queue is configured
**When** multiple quiz jobs are queued
**Then** quiz-ready modules get priority=1 (highest) so users see results faster
**And** up to 3 quiz jobs run concurrently with 2 retries and exponential backoff
**And** prompts are loaded from apps/api/src/prompts/quiz-agent.yaml

**Given** the confidence score is below the configurable threshold (default 0.7)
**When** the initial answer is generated
**Then** the system retries with additional context: broader search scope, related concept chunks, and explicit instruction to reconsider
**And** the retry result replaces the original only if its confidence is higher

### Story 4.2: Quiz Review Panel with Approve/Edit Workflow

As a user,
I want to review AI-generated quiz answers in a persistent panel with confidence bars, and approve or edit them before submission,
So that I maintain control over answer quality.

**Acceptance Criteria:**

**Given** quiz results exist for one or more modules
**When** the dashboard loads
**Then** the ReviewPanel slides in from the right (200ms ease transition, 340px width)
**And** the panel shows the current module name and question count (e.g., "Module Name — 3/5 reviewed")

**Given** I am viewing a quiz question in the ReviewPanel
**When** the question renders
**Then** I see: the question text, the AI-selected answer highlighted, the confidence bar, and the reasoning summary
**And** the ConfidenceBar shows color ranges: green (>=90%), amber (70-89%), red (<70%)
**And** answers below the threshold display a "Low confidence — review carefully" label

**Given** I am reviewing an answer
**When** I click "Approve" (or press Enter)
**Then** the answer is marked as approved and the panel advances to the next question
**And** the progress counter updates (e.g., "4/5 reviewed")

**Given** I disagree with the AI's answer
**When** I click "Edit" (or press E)
**Then** the answer options become selectable and I can choose a different answer
**And** I can optionally add a note explaining my override
**And** pressing Save confirms the edit, Cancel reverts

**Given** all quiz answers for a module have been reviewed
**When** the last answer is approved or edited
**Then** the module shows "Ready to submit" status
**And** the ReviewPanel shows the next module with pending reviews, or collapses if none remain

**Given** no modules have quiz results pending review
**When** the dashboard loads
**Then** the ReviewPanel remains collapsed (hidden) and the center column expands to fill the space

### Story 4.3: Answer Submission & Badge Tracking

As a user,
I want approved answers submitted to Trailhead and badges tracked automatically,
So that completing quizzes earns badges and results are recorded.

**Acceptance Criteria:**

**Given** all quiz answers for a module are approved
**When** I click "Submit to Trailhead" (or the system auto-submits high-confidence approved answers)
**Then** the Scraper Agent navigates to the quiz page via Playwright MCP and submits each answer
**And** the module status transitions from "quizzing" to "completed" on success

**Given** an answer is submitted
**When** Trailhead returns the result
**Then** the quiz_results record is updated with: correct_answer (from Trailhead feedback), whether selected_answer matches, and the attempt_number
**And** if the answer was wrong, the question is flagged for retry with additional context

**Given** all quizzes for a module are passed
**When** the badge is earned
**Then** the module record is updated with badge_url and badge_earned=true
**And** a success toast appears: "Badge earned: [Module Name]" (3s duration)
**And** the hero stat card for "badges earned" increments

**Given** a quiz submission fails (network error, page timeout)
**When** the submission encounters an error
**Then** the system retries up to 2 times with backoff
**And** the module status remains "quizzing" with the failed question highlighted in the ReviewPanel

**Given** I want to track overall badge progress
**When** I view the dashboard
**Then** I can see which modules have earned badges vs. which are pending
**And** GET /api/quiz-results returns all results with filtering by module_id and correct status

## Epic 5: Pipeline Operations & Monitoring

Demi can configure pipeline behavior (priority tracks, quiz-only mode), pause/resume/cancel processing runs, monitor system health and agent costs, and manage multi-day unattended runs with full operational visibility.

### Story 5.1: Pipeline Configuration & Run Control

As a user,
I want to configure pipeline behavior and pause/resume/cancel runs,
So that I can control automation during multi-day processing.

**Acceptance Criteria:**

**Given** I navigate to the Settings page
**When** the page loads
**Then** I see pipeline configuration options: priority track selection, quiz-only mode toggle, and skip-completed toggle
**And** current values are loaded from the database

**Given** I enable "quiz-only mode"
**When** I save the setting
**Then** the pipeline skips content extraction for modules that already have quiz items
**And** queued scrape jobs for those modules are cancelled
**And** a toast confirms: "Pipeline mode updated" (3s)

**Given** a pipeline run is in progress
**When** I click "Pause Pipeline"
**Then** all pg-boss queues are paused via boss.pause() and no new jobs are picked up
**And** currently running jobs complete gracefully (not killed mid-execution)
**And** the dashboard shows a "Paused" banner with a "Resume" button

**Given** the pipeline is paused
**When** I click "Resume Pipeline"
**Then** all pg-boss queues resume via boss.resume()
**And** queued jobs begin processing again from where they left off
**And** the "Paused" banner disappears

**Given** I want to cancel a run entirely
**When** I click "Cancel Run" and confirm the dialog
**Then** all queued jobs for the run are removed from pg-boss
**And** in-progress jobs complete gracefully
**And** module statuses for unfinished modules remain at their current state (not reset)

**Given** I configure priority track
**When** I select a specific track (e.g., "Admin", "Developer")
**Then** modules matching that track receive priority=1 in the job queue
**And** other modules are demoted to priority=5

### Story 5.2: Aggregated Progress & Cost Tracking

As a user,
I want to see aggregated progress metrics and agent cost tracking,
So that I have full operational visibility during multi-day runs.

**Acceptance Criteria:**

**Given** a pipeline run is active or completed
**When** I call GET /api/progress
**Then** I receive aggregated metrics: modules completed, modules total, badges earned, quiz accuracy percentage, chunks indexed, and estimated total cost
**And** the response updates in real-time as modules complete

**Given** an agent performs an action (LLM call, embedding, MCP tool use)
**When** the action completes
**Then** a ToolTrace entry is logged to the agent_logs table with: run_id, agent_type, tool_type, query, raw_output (truncated 50KB), summary, input_tokens, output_tokens, estimated_cost_usd, duration_ms, confidence_score (quiz agent only), and related_chunk_ids

**Given** I want to see cost breakdown
**When** I view the Settings page cost section
**Then** I see per-run cost summary grouped by agent type (scraper, knowledge, quiz, documentation)
**And** totals for input tokens, output tokens, and estimated USD cost
**And** the hero stat card "time saved" shows estimated hours of manual Trailhead work replaced

**Given** the system has been running unattended
**When** I check the dashboard after several hours
**Then** I see an accurate live agent log feed (Supabase Realtime Pattern B: useState direct updates)
**And** the feed shows: agent name, action description, timestamp, and cost per action
**And** the feed auto-scrolls to latest entries with a "Jump to latest" button if scrolled up

**Given** I want to review historical run data
**When** I view past runs on the Settings page
**Then** I see a list of all runs with: start time, end time, modules processed, total cost, and final status
**And** clicking a run shows its detailed agent log history
