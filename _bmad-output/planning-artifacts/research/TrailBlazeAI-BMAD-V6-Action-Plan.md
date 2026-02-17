# 🚀 BMAD V6 Action Plan: Salesforce Trailhead AI Learning Assistant

## Project Codename: **TrailBlazeAI**

---

## TABLE OF CONTENTS

1. [Project Analysis & Requirements](#1-project-analysis--requirements)
2. [BMAD V6 Agent Team Structure](#2-bmad-v6-agent-team-structure)
3. [Master TODO Checklist](#3-master-todo-checklist)
4. [Phase 0: BMAD Setup & Project Initialization](#phase-0)
5. [Phase 1: Infrastructure & Foundation](#phase-1)
6. [Phase 2: Browser Automation Engine](#phase-2)
7. [Phase 3: Knowledge Pipeline & RAG](#phase-3)
8. [Phase 4: Quiz Engine & Agent Orchestration](#phase-4)
9. [Phase 5: Dashboard & Frontend](#phase-5)
10. [Phase 6: Salesforce Integration & Hands-On Automation](#phase-6)
11. [Phase 7: Testing, Optimization & Launch](#phase-7)
12. [Prompt Library (Copy-Paste Ready)](#prompt-library)
13. [Key Repos & Resources](#key-repos--resources)

---

## 1. Project Analysis & Requirements

### Problem Statement
100+ hours of Salesforce Trailhead content (Admin, Developer, Agentblazer tracks) needs to be completed in 2-3 days. Manual completion is impossible. Need an AI system that:
- **Scrapes** all Trailhead module content automatically
- **Builds** a searchable Salesforce knowledge database
- **Answers** quiz questions using RAG + LLM reasoning
- **Automates** hands-on challenges via Salesforce CLI
- **Creates** a persistent knowledge base for future coding agents

### Core Architecture Decisions (Locked)
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | Next.js 15 (App Router) on Vercel | SSR + Vercel AI SDK native |
| Backend | Fastify on VPS (Docker) | Long-running browser automation |
| LLM Primary | Claude API (Sonnet 4.5) | Max Plan + best reasoning |
| LLM Secondary | OpenAI GPT-4o | Fallback + embeddings |
| LLM Budget | Ollama (local on VPS) | Zero-cost for bulk tasks |
| Database | Supabase (PostgreSQL + pgvector) | Free tier + realtime + vectors |
| Browser Automation | Playwright MCP | Microsoft-backed, MCP native |
| Job Queue | pg-boss | Uses existing Supabase Postgres |
| MCP Servers | Playwright + Salesforce DX + Supabase | Full coverage |
| Deployment | Hybrid (Vercel + Hetzner VPS) | Cost optimal |

### Budget Constraint: $20-50/month
| Service | Cost |
|---------|------|
| Hetzner CX33 (4vCPU, 8GB) | ~$6/mo |
| Supabase Free → Pro if needed | $0-25/mo |
| Vercel Hobby | $0 |
| Claude API (burst) | $5-15 one-time |
| OpenAI Embeddings | ~$0.01 |
| **Total** | **$11-46/mo** |

---

## 2. BMAD V6 Agent Team Structure

### Agent Teams for TrailBlazeAI

```
┌─────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR AGENT                     │
│  (Project Manager - coordinates all teams)               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  TEAM 1: INFRASTRUCTURE          TEAM 2: SCRAPING       │
│  ├─ DevOps Agent                 ├─ Browser Agent        │
│  ├─ Database Architect Agent     ├─ Content Extractor    │
│  └─ Security Agent               └─ Auth Manager         │
│                                                          │
│  TEAM 3: KNOWLEDGE               TEAM 4: INTELLIGENCE   │
│  ├─ Chunking Agent               ├─ Quiz Solver Agent    │
│  ├─ Embedding Agent              ├─ Explanation Agent    │
│  └─ Graph Builder Agent          └─ Doc Retrieval Agent  │
│                                                          │
│  TEAM 5: FRONTEND                TEAM 6: SALESFORCE      │
│  ├─ UI/UX Agent                  ├─ CLI Automation Agent │
│  ├─ Dashboard Agent              ├─ Sandbox Agent        │
│  └─ Realtime Agent               └─ Metadata Agent       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### BMAD V6 Skill Definitions

Each agent has defined **Skills** (what it can do) and **Sub-Agents** (specialized workers):

**Browser Agent Skills:**
- `navigate_trailhead` - Navigate to any Trailhead URL
- `extract_page_content` - Pull text, code, images from modules
- `handle_quiz_ui` - Interact with quiz forms (select answers, submit)
- `maintain_session` - Keep Salesforce auth alive
- `screenshot_state` - Capture page state for debugging

**Knowledge Agent Skills:**
- `chunk_content` - Structure-aware content splitting
- `generate_embeddings` - OpenAI embedding generation
- `hybrid_search` - Vector + full-text combined retrieval
- `build_concept_graph` - Map Salesforce concept relationships
- `export_for_agents` - Package knowledge for external coding agents

**Quiz Agent Skills:**
- `analyze_question` - Parse question + options
- `retrieve_context` - RAG search for relevant knowledge
- `reason_answer` - Claude chain-of-thought for answer selection
- `confidence_check` - Self-evaluate answer confidence
- `explain_answer` - Generate learning explanation

---

## 3. Master TODO Checklist

### Phase 0: BMAD Setup (Day 1, ~2 hours)
- [ ] Initialize BMAD V6 project structure
- [ ] Define all agent personas and skills
- [ ] Create project brief and PRD
- [ ] Set up Claude Code workspace with MCP configs
- [ ] Clone reference repos (DeepTutor, PocketFlow)

### Phase 1: Infrastructure (Day 1-2, ~4 hours)
- [ ] Provision Hetzner VPS
- [ ] Set up Docker + Docker Compose
- [ ] Initialize Supabase project
- [ ] Create database schema (all tables + indexes)
- [ ] Deploy Next.js skeleton on Vercel
- [ ] Configure Nginx + Let's Encrypt on VPS
- [ ] Set up environment variables across all services
- [ ] Test Supabase Realtime connection from Vercel

### Phase 2: Browser Automation (Day 2-3, ~6 hours)
- [ ] Deploy Playwright MCP server in Docker
- [ ] Implement Trailhead authentication flow
- [ ] Build module URL enumerator (parse Trailmix page)
- [ ] Create content extraction pipeline
- [ ] Handle Shadow DOM / LWC elements
- [ ] Build quiz page interaction flow
- [ ] Test with 3-5 real Trailhead modules
- [ ] Add error recovery and retry logic

### Phase 3: Knowledge Pipeline (Day 3-4, ~6 hours)
- [ ] Build HTML-to-structured-content parser
- [ ] Implement structure-aware chunking
- [ ] Set up OpenAI embedding generation
- [ ] Create Supabase hybrid search function
- [ ] Build concept relationship extractor
- [ ] Import DeepTutor's Graph RAG patterns
- [ ] Seed with Salesforce documentation
- [ ] Test retrieval accuracy on sample queries

### Phase 4: Quiz Engine (Day 4-5, ~6 hours)
- [ ] Build quiz question parser
- [ ] Implement RAG retrieval pipeline for questions
- [ ] Create Claude reasoning chain for answers
- [ ] Add confidence scoring and fallback logic
- [ ] Build answer submission via Playwright MCP
- [ ] Create quiz result tracker
- [ ] Test accuracy on 20+ real quiz questions
- [ ] Optimize prompt engineering for 90%+ accuracy

### Phase 5: Dashboard (Day 5-7, ~6 hours)
- [ ] Build progress dashboard (modules, badges, scores)
- [ ] Add real-time status updates via Supabase Realtime
- [ ] Create knowledge base explorer UI
- [ ] Build quiz review interface
- [ ] Add manual override controls
- [ ] Deploy to Vercel

### Phase 6: Salesforce Integration (Day 7-9, ~6 hours)
- [ ] Set up Salesforce DX MCP server
- [ ] Connect to Trailhead Playground sandbox
- [ ] Build hands-on challenge automation
- [ ] Import solutions from artysta/salesforce-trailhead-solutions
- [ ] Create Apex deployment pipeline
- [ ] Test with 5+ hands-on challenges

### Phase 7: Optimization & Launch (Day 9-10, ~4 hours)
- [ ] Enable Claude Batch API for bulk processing
- [ ] Add prompt caching for system prompts
- [ ] Implement dead letter queue for failures
- [ ] Load test with full Trailmix (100+ modules)
- [ ] Monitor costs and optimize
- [ ] Document knowledge base export for coding agents

---

## Phase 0: BMAD Setup & Project Initialization {#phase-0}

### Step 0.1: Initialize BMAD V6 Project

**Action:** Open Claude Code and run the BMAD initialization sequence.

**Prompt 0.1.1 — Create BMAD Project Structure:**
```
You are the BMAD V6 Orchestrator Agent. Initialize a new BMAD V6 project called "TrailBlazeAI" with the following specifications:

PROJECT BRIEF:
- Name: TrailBlazeAI - AI-Powered Salesforce Trailhead Learning Assistant
- Goal: Complete 100+ hours of Trailhead content in 2-3 days by automating content extraction, knowledge building, and quiz answering
- Tech Stack: Next.js 15 (Vercel) + Fastify (VPS/Docker) + Supabase + Playwright MCP + Claude API
- Architecture: Hybrid deployment (Vercel frontend + Hetzner VPS backend)

Create the full BMAD V6 directory structure:
```
trailblazeai/
├── .bmad/
│   ├── config.yml              # BMAD configuration
│   ├── agents/                 # Agent definitions
│   │   ├── orchestrator.yml
│   │   ├── browser-agent.yml
│   │   ├── knowledge-agent.yml
│   │   ├── quiz-agent.yml
│   │   ├── devops-agent.yml
│   │   └── salesforce-agent.yml
│   ├── skills/                 # Skill definitions
│   │   ├── navigate-trailhead.yml
│   │   ├── extract-content.yml
│   │   ├── chunk-and-embed.yml
│   │   ├── hybrid-search.yml
│   │   ├── solve-quiz.yml
│   │   └── deploy-salesforce.yml
│   ├── teams/                  # Team compositions
│   │   ├── infrastructure-team.yml
│   │   ├── scraping-team.yml
│   │   ├── knowledge-team.yml
│   │   ├── intelligence-team.yml
│   │   └── frontend-team.yml
│   └── workflows/              # Orchestration flows
│       ├── full-pipeline.yml
│       ├── scrape-module.yml
│       ├── process-knowledge.yml
│       └── solve-quiz.yml
├── apps/
│   ├── web/                    # Next.js frontend (Vercel)
│   └── api/                    # Fastify backend (VPS)
├── packages/
│   ├── db/                     # Supabase schema & migrations
│   ├── agents/                 # Agent implementations
│   ├── mcp-clients/            # MCP server connections
│   └── shared/                 # Shared types & utils
├── docker/
│   ├── docker-compose.yml
│   ├── api.Dockerfile
│   └── worker.Dockerfile
├── docs/
│   ├── PRD.md
│   ├── architecture.md
│   └── runbook.md
├── turbo.json
├── package.json
└── .env.example
```

For each agent YAML file, define:
- name, role, persona
- skills (list of capabilities)
- tools (MCP servers it connects to)
- llm_config (which model, temperature, max_tokens)
- constraints (rate limits, cost caps)

Generate ALL files with complete content. This is the project foundation.
```

### Step 0.2: Create PRD Document

**Prompt 0.2.1 — Generate PRD:**
```
You are the Product Manager agent in the BMAD V6 team. Create a comprehensive PRD (Product Requirements Document) for TrailBlazeAI.

CONTEXT:
- User: Salesforce learner with 100+ hour Trailmix
- Focus tracks: Admin, Developer, Agentblazer (Agentforce)
- Time constraint: Complete all badges in 2-3 days
- Post-completion: Knowledge base for coding agents and Salesforce automation

REQUIREMENTS TO COVER:
1. User Stories (at least 10)
2. Functional Requirements (content scraping, knowledge building, quiz automation, hands-on automation, progress tracking)
3. Non-Functional Requirements (performance, cost, reliability, security)
4. Data Model (all Supabase tables with relationships)
5. API Specifications (Vercel ↔ VPS communication)
6. MCP Integration Points (Playwright, Salesforce DX, Supabase)
7. Success Metrics (badges earned, accuracy %, knowledge chunks indexed, time to complete)
8. Risk Register (rate limiting, auth failures, quiz accuracy, Salesforce TOS)
9. Phase gates and acceptance criteria

Format as a professional PRD in markdown. Include mermaid diagrams for data flow and architecture.
```

### Step 0.3: Set Up Claude Code MCP Configuration

**Prompt 0.3.1 — Configure Claude Code for TrailBlazeAI:**
```
Create the Claude Code MCP configuration file for the TrailBlazeAI project. I need to connect to the following MCP servers from my development environment:

1. Playwright MCP (@playwright/mcp) — for browser automation development/testing
2. Supabase MCP (supabase-community/supabase-mcp) — for database operations
3. Salesforce DX MCP (salesforcecli/mcp) — for Salesforce org interaction
4. Filesystem MCP — for project file access

Create the `.claude/mcp.json` configuration file with:
- All four MCP server definitions
- Proper transport configs (stdio for local, HTTP/SSE for remote)
- Environment variable references for secrets
- Comments explaining each server's purpose

Also create a `.env.example` with all required environment variables documented.
```

### Step 0.4: Clone and Analyze Reference Repos

**Prompt 0.4.1 — Analyze DeepTutor Architecture:**
```
I've cloned the DeepTutor repo (https://github.com/HKUDS/DeepTutor). Analyze its architecture and identify the components we should adapt for TrailBlazeAI:

Specifically extract:
1. The multi-agent pipeline structure (DecomposeAgent → ResearchAgent → NoteAgent → ReportingAgent)
2. The Graph RAG implementation — how it combines vector search + knowledge graph + web search
3. The FastAPI backend structure
4. The Next.js frontend patterns
5. How it handles document ingestion and processing

For each component, tell me:
- Can we use it as-is? (fork/import)
- Do we need to adapt it? (what changes)
- Should we build from scratch? (why)

Create an integration plan that maps DeepTutor components to our TrailBlazeAI architecture.
```

**Prompt 0.4.2 — Analyze PocketFlow Knowledge Builder:**
```
I've cloned PocketFlow-Tutorial-Codebase-Knowledge (https://github.com/The-Pocket/PocketFlow-Tutorial-Codebase-Knowledge). Analyze its 6-stage pipeline:

1. FetchRepo → How does it gather source material?
2. IdentifyAbstractions → How does it find key concepts?
3. AnalyzeRelationships → How does it map concept dependencies?
4. OrderChapters → How does it create learning sequences?
5. WriteChapters → How does it generate explanations?
6. CombineTutorial → How does it assemble the final output?

Map each stage to our Salesforce Trailhead use case:
- FetchRepo → Playwright scraper
- IdentifyAbstractions → Salesforce concept extractor (Objects, Fields, Flows, Apex, etc.)
- AnalyzeRelationships → Concept dependency mapper
- OrderChapters → Optimal learning path through Trailmix
- WriteChapters → Knowledge base entry generator
- CombineTutorial → Exportable Salesforce knowledge graph

Create the adapted pipeline code structure.
```

---

## Phase 1: Infrastructure & Foundation {#phase-1}

### Step 1.1: Provision and Configure VPS

**Action:** Set up Hetzner VPS and Docker environment.

**Prompt 1.1.1 — VPS Setup Script:**
```
You are the DevOps Agent. Create a complete VPS provisioning script for a Hetzner CX33 (4 vCPU, 8GB RAM, Ubuntu 24.04).

The script should:
1. Update system and install essentials (curl, git, htop, ufw)
2. Install Docker Engine + Docker Compose v2
3. Install Node.js 22 LTS via nvm
4. Configure UFW firewall (allow 80, 443, 22 only)
5. Create non-root user 'deploy' with Docker group access
6. Install Nginx as reverse proxy
7. Set up Certbot for Let's Encrypt SSL
8. Create project directory structure at /opt/trailblazeai
9. Configure swap file (4GB for safety)
10. Set up fail2ban for SSH protection

Output as a single bash script with clear section comments.
Also output the Nginx site config for:
- api.trailblazeai.yourdomain.com → localhost:3001
- mcp.trailblazeai.yourdomain.com → localhost:8931 (Playwright MCP)

Include a post-install verification checklist.
```

### Step 1.2: Create Supabase Schema

**Prompt 1.2.1 — Full Database Schema:**
```
You are the Database Architect Agent. Create the complete Supabase migration SQL for TrailBlazeAI.

TABLES NEEDED:

1. `trailmixes` — Track Trailmix metadata
   - id, name, url, total_modules, total_estimated_hours, status, created_at

2. `modules` — Individual Trailhead modules
   - id, trailmix_id (FK), name, url, module_type (trail/module/project/superbadge)
   - track (admin/developer/agentblazer), difficulty, estimated_minutes
   - status (pending/scraping/scraped/processing/ready/completed/failed)
   - badge_earned (boolean), points_earned, attempts, created_at, updated_at

3. `units` — Units within modules
   - id, module_id (FK), name, url, unit_type (reading/quiz/hands_on)
   - content_raw (TEXT), content_clean (TEXT)
   - status, quiz_score, created_at

4. `sf_knowledge_chunks` — Vector knowledge base (from research doc schema)
   - id, content, content_type, module_name, unit_name, trail_name
   - section_header, difficulty, source_url
   - sf_topics (TEXT[]), sf_objects (TEXT[])
   - fts (TSVECTOR - generated), embedding (VECTOR(1536))
   - metadata (JSONB), created_at

5. `sf_quiz_items` — Quiz Q&A pairs
   - id, unit_id (FK), question_text, options (JSONB array)
   - correct_answer, ai_selected_answer, ai_confidence (FLOAT)
   - ai_explanation, related_chunk_ids (BIGINT[])
   - attempt_number, is_correct, created_at

6. `sf_concept_relationships` — Knowledge graph edges
   - id, source_concept, target_concept, relationship_type
   - (prerequisite/related/contains/triggers/extends)
   - strength (FLOAT), source_module, created_at

7. `task_queue` — Job tracking for pg-boss visibility
   - id, job_type, payload (JSONB), status, priority
   - started_at, completed_at, error_message, retry_count

8. `agent_logs` — Agent activity logging
   - id, agent_name, action, input_summary, output_summary
   - tokens_used, cost_usd, duration_ms, created_at

CREATE:
- All tables with proper constraints and indexes
- HNSW vector index on sf_knowledge_chunks.embedding
- GIN index on fts column
- Composite indexes for common query patterns
- The hybrid_search RPC function (vector + FTS with RRF scoring)
- Row Level Security policies (service role bypass)
- Supabase Realtime publication for modules and task_queue tables

Output as a single SQL migration file with comments.
```

### Step 1.3: Initialize Next.js Frontend

**Prompt 1.3.1 — Next.js Project Setup:**
```
You are the Frontend Agent. Initialize the Next.js 15 project for TrailBlazeAI.

Create the project with:
- Next.js 15 with App Router
- TypeScript strict mode
- Tailwind CSS v4
- Vercel AI SDK 6 (@ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/mcp)
- Supabase JS client (@supabase/supabase-js)
- shadcn/ui components (button, card, progress, badge, table, tabs)
- Lucide React icons

Project structure:
```
apps/web/
├── app/
│   ├── layout.tsx              # Root layout with Supabase provider
│   ├── page.tsx                # Landing/login
│   ├── dashboard/
│   │   ├── page.tsx            # Main progress dashboard
│   │   ├── modules/
│   │   │   └── [id]/page.tsx   # Module detail view
│   │   ├── knowledge/
│   │   │   └── page.tsx        # Knowledge base explorer
│   │   ├── quiz/
│   │   │   └── page.tsx        # Quiz review
│   │   └── settings/
│   │       └── page.tsx        # Config & API keys
│   └── api/
│       ├── vps/
│       │   └── [...action]/route.ts  # Proxy to VPS API
│       ├── chat/
│       │   └── route.ts        # AI chat endpoint
│       └── webhooks/
│           └── supabase/route.ts
├── components/
│   ├── dashboard/
│   │   ├── ModuleCard.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── StatsBar.tsx
│   │   └── RealtimeStatus.tsx
│   ├── knowledge/
│   │   ├── SearchBar.tsx
│   │   ├── ChunkViewer.tsx
│   │   └── ConceptGraph.tsx
│   └── shared/
│       ├── Header.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── realtime.ts
│   ├── agents/
│   │   └── quiz-agent.ts       # Vercel AI SDK Agent
│   └── utils.ts
└── types/
    └── database.ts             # Generated from Supabase
```

Generate the package.json with all dependencies, tsconfig.json, tailwind.config.ts, and the root layout with Supabase client initialization.

Also generate the Supabase types file using the schema from the database migration.
```

### Step 1.4: Create Docker Compose for VPS

**Prompt 1.4.1 — Docker Compose Configuration:**
```
You are the DevOps Agent. Create the complete Docker setup for the VPS backend of TrailBlazeAI.

Create these files:

1. docker-compose.yml with services:
   - api (Fastify server, port 3001, 512MB limit)
   - worker (Playwright + automation, FROM mcr.microsoft.com/playwright:v1.50.0-noble, 3GB limit, ipc: host)
   - ollama (optional, for local LLM, commented out by default)
   
   All services share:
   - .env file for secrets
   - Docker network 'trailblazeai'
   - Restart policy: unless-stopped
   - Health checks

2. docker/api.Dockerfile
   - Node.js 22 Alpine
   - Install Fastify app
   - Non-root user

3. docker/worker.Dockerfile
   - Based on mcr.microsoft.com/playwright:v1.50.0-noble
   - Install @playwright/mcp, pg-boss
   - Set up persistent browser profile directory as volume
   - Non-root user (pwuser)

4. .env.example with ALL required variables:
   - SUPABASE_URL, SUPABASE_SERVICE_KEY
   - CLAUDE_API_KEY, OPENAI_API_KEY
   - VPS_API_SECRET (for Vercel → VPS auth)
   - SALESFORCE_LOGIN_URL, SALESFORCE_USERNAME
   - PLAYWRIGHT_PROFILE_DIR

Include clear comments and a startup guide.
```

### Step 1.5: Build Fastify API Server

**Prompt 1.5.1 — VPS API Server:**
```
You are the Backend Agent. Create the Fastify API server for TrailBlazeAI's VPS backend.

The API server acts as the control plane for all automation:

```
apps/api/
├── src/
│   ├── index.ts                # Fastify app entry
│   ├── config.ts               # Environment config
│   ├── plugins/
│   │   ├── auth.ts             # Bearer token validation
│   │   ├── supabase.ts         # Supabase client singleton
│   │   └── pg-boss.ts          # Job queue setup
│   ├── routes/
│   │   ├── health.ts           # GET /health
│   │   ├── scrape.ts           # POST /scrape/start, GET /scrape/status
│   │   ├── quiz.ts             # POST /quiz/solve, GET /quiz/results
│   │   ├── knowledge.ts        # GET /knowledge/search, POST /knowledge/rebuild
│   │   └── salesforce.ts       # POST /sf/deploy, POST /sf/verify
│   ├── workers/
│   │   ├── scrape-worker.ts    # pg-boss handler: scrape modules
│   │   ├── process-worker.ts   # pg-boss handler: chunk & embed
│   │   ├── quiz-worker.ts      # pg-boss handler: solve quizzes
│   │   └── sf-worker.ts        # pg-boss handler: SF CLI operations
│   ├── agents/
│   │   ├── browser-agent.ts    # Playwright MCP client wrapper
│   │   ├── knowledge-agent.ts  # Chunking + embedding pipeline
│   │   ├── quiz-agent.ts       # RAG + Claude reasoning
│   │   └── sf-agent.ts         # Salesforce DX MCP client
│   └── lib/
│       ├── mcp-client.ts       # Generic MCP client factory
│       ├── llm.ts              # Claude/OpenAI/Ollama unified interface
│       └── embeddings.ts       # Embedding generation
├── package.json
└── tsconfig.json
```

Implement:
1. Fastify app with CORS, rate limiting, request logging
2. Bearer token auth middleware (VPS_API_SECRET)
3. pg-boss queue initialization with job types:
   - 'module-scrape' (priority 1)
   - 'content-process' (priority 3)
   - 'embedding-generate' (priority 3)
   - 'quiz-solve' (priority 2)
   - 'sf-deploy' (priority 4)
4. Supabase client with service role key
5. All route handlers with proper error handling
6. Worker registration for all job types

Generate ALL files with complete, working code.
Use @ai-sdk/anthropic and @ai-sdk/openai for LLM calls.
```

---

## Phase 2: Browser Automation Engine {#phase-2}

### Step 2.1: Deploy Playwright MCP

**Prompt 2.1.1 — Playwright MCP Setup:**
```
You are the Browser Agent. Set up the Playwright MCP server inside the worker Docker container for TrailBlazeAI.

Requirements:
1. Playwright MCP runs in HTTP/SSE mode on port 8931
2. Uses persistent browser profile at /data/browser-profile (Docker volume)
3. Headless Chromium with these flags:
   - --disable-gpu
   - --no-sandbox (Docker)
   - --disable-dev-shm-usage
4. Viewport: 1280x800

Create:
1. The worker startup script that:
   a. Starts Playwright MCP server in background
   b. Starts the pg-boss worker process
   c. Handles graceful shutdown

2. A TypeScript MCP client wrapper (browser-agent.ts) that:
   - Connects to the Playwright MCP server via HTTP
   - Provides high-level methods:
     * navigateTo(url: string)
     * getPageSnapshot() → returns accessibility tree
     * clickElement(ref: string) → clicks by accessibility ref
     * typeText(ref: string, text: string)
     * evaluateJS(script: string) → run JS in page context
     * extractContent(selector?: string) → get page text/HTML
     * takeScreenshot() → base64 image
   - Handles connection retries and timeouts
   - Logs all actions to Supabase agent_logs

3. Integration test that:
   - Navigates to https://trailhead.salesforce.com
   - Takes a snapshot
   - Verifies page loaded correctly
```

### Step 2.2: Trailhead Authentication

**Prompt 2.2.1 — Auth Flow:**
```
You are the Browser Agent specializing in authentication. Implement Trailhead login automation.

APPROACH 1 (Primary): Persistent Session
- User logs in manually ONCE via browser
- Session cookies stored in Playwright's persistent profile
- Worker detects session expiry and alerts user

APPROACH 2 (Fallback): Automated Login
- Navigate to login.salesforce.com
- Enter credentials (stored in encrypted env vars)
- Handle MFA if configured (TOTP support)
- Capture session cookies

Create a TypeScript module `auth-manager.ts` that:
1. Checks if existing session is valid (navigate to trailhead profile, check for login redirect)
2. If invalid, attempts re-authentication
3. Stores session state in Supabase (last_auth_check, session_valid, expires_at)
4. Exposes methods:
   - checkSession(): Promise<boolean>
   - login(credentials: SalesforceCredentials): Promise<void>
   - getSessionStatus(): Promise<SessionStatus>
5. Emits events on auth state changes (for frontend notification)

IMPORTANT: Handle Salesforce's Lightning Web Components - they use Shadow DOM
and dynamic element IDs. Use accessibility tree selectors, not CSS selectors.

Include error handling for:
- Network timeouts
- CAPTCHA detection (alert user for manual intervention)
- Session token rotation
- Concurrent session limits
```

### Step 2.3: Trailmix Module Enumerator

**Prompt 2.3.1 — Module Discovery:**
```
You are the Browser Agent. Create the Trailmix module enumerator that discovers all modules in a Trailmix URL.

Given a Trailmix URL like: https://trailhead.salesforce.com/users/trailmix/[id]

The enumerator should:
1. Navigate to the Trailmix page
2. Scroll to load all modules (handle infinite scroll/pagination)
3. Extract for each module:
   - Module name and URL
   - Module type (module, project, superbadge, trail)
   - Track (admin, developer, agentblazer)
   - Estimated time (minutes)
   - Number of units
   - Badge info (name, image URL)
   - Completion status (if already started)
4. For each module URL, enumerate its units:
   - Unit name and URL
   - Unit type (reading, quiz, hands_on_challenge)
   - Unit number/order
5. Store everything in Supabase (modules + units tables)
6. Queue scraping jobs in pg-boss for each unit

Create the complete TypeScript implementation with:
- trailmix-enumerator.ts (main logic)
- Types for all data structures
- Supabase insert operations (batch upsert)
- pg-boss job creation (one job per unit, with module priority ordering)

Handle edge cases:
- Private Trailmixes
- Archived/deprecated modules
- Already-completed modules (skip or re-scrape option)
```

### Step 2.4: Content Extraction Pipeline

**Prompt 2.4.1 — Content Scraper:**
```
You are the Content Extractor sub-agent. Build the pipeline that extracts clean, structured content from Trailhead module unit pages.

A typical Trailhead unit page contains:
- Breadcrumb (Trail > Module > Unit)
- Learning objectives
- Main content (paragraphs, headers, code blocks, tables, images, callouts)
- Knowledge check / Quiz (if applicable)
- Hands-on challenge instructions (if applicable)

Create `content-extractor.ts` that:

1. Takes a unit URL and uses the Browser Agent to navigate to it
2. Waits for content to fully render (Trailhead uses client-side rendering)
3. Extracts content using browser_evaluate with DOM parsing:
   ```javascript
   // Trailhead content is in specific containers
   // Main content: .unit-content, .slds-rich-text-editor__output
   // Code blocks: <pre><code>
   // Callouts: .note, .tip, .warning
   // Quiz: .quiz-container, .challenge-container
   ```
4. Produces a structured output:
   ```typescript
   interface ExtractedUnit {
     moduleId: string;
     unitId: string;
     breadcrumb: string[];
     learningObjectives: string[];
     sections: ContentSection[];
     codeBlocks: CodeBlock[];
     quizQuestions?: QuizQuestion[];
     handsOnSteps?: HandsOnStep[];
     keyTerms: string[];
     salesforceObjects: string[];  // Detected SF object references
     rawHtml: string;
     cleanText: string;
   }
   ```
5. Cleans HTML while preserving structure (headers, lists, code formatting)
6. Identifies Salesforce-specific entities (Object names, API names, Apex keywords)
7. Stores raw and clean content in Supabase units table
8. Queues the content for knowledge processing

Handle Trailhead-specific challenges:
- Content loaded via JavaScript (wait for selectors)
- Embedded Salesforce playground iframes (skip these)
- Dynamic accordion/tab content (expand all before extraction)
- Code blocks with syntax highlighting (preserve language hints)

Test with these module types:
- Reading-only unit
- Unit with quiz
- Unit with hands-on challenge
- Unit with code examples
```

---

## Phase 3: Knowledge Pipeline & RAG {#phase-3}

### Step 3.1: Content Processing Pipeline

**Prompt 3.1.1 — Chunking Engine:**
```
You are the Knowledge Agent - Chunking sub-agent. Build the structure-aware content chunking pipeline for TrailBlazeAI.

CHUNKING STRATEGY (based on research findings):
- Target chunk size: 400-512 tokens with 50-100 token overlap
- Structure-aware: respect section boundaries
- Content-type specific handling

Create `chunker.ts` that implements:

1. HTML Structure Parser:
   - Parse Trailhead HTML to identify sections (h1 → h4)
   - Maintain section hierarchy as metadata
   - Identify content type per block (explanation, code, quiz, reference)

2. Salesforce-Specific Chunking Rules:
   - Keep code blocks INTACT as single chunks (even if >512 tokens)
   - Quiz questions are ATOMIC: one question + all options + correct answer = one chunk
   - Hands-on step sequences: keep related steps together (~800 tokens max)
   - Object/field definitions: include the full definition + example
   - Apex class definitions: include class header + method signatures as one chunk
   - Flow descriptions: keep trigger + criteria + actions together

3. Metadata Enrichment:
   - Extract sf_topics[] from content (e.g., ['Flows', 'Process Builder', 'Automation'])
   - Extract sf_objects[] (e.g., ['Account', 'Contact', 'Opportunity'])
   - Assign content_type enum
   - Tag difficulty level
   - Include source breadcrumb (Trail > Module > Unit > Section)

4. Overlap Strategy:
   - For explanatory text: 100 token overlap with surrounding context sentence
   - For code: no overlap (code blocks are self-contained)
   - For quizzes: include the preceding paragraph as context

Output each chunk as:
```typescript
interface KnowledgeChunk {
  content: string;
  content_type: 'explanation' | 'code' | 'quiz' | 'hands_on' | 'reference' | 'definition';
  module_name: string;
  unit_name: string;
  trail_name: string;
  section_header: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sf_topics: string[];
  sf_objects: string[];
  metadata: {
    token_count: number;
    chunk_index: number;
    total_chunks: number;
    has_code: boolean;
    salesforce_api_version?: string;
  };
}
```

Include unit tests with sample Trailhead HTML fixtures.
```

### Step 3.2: Embedding & Storage

**Prompt 3.2.1 — Embedding Pipeline:**
```
You are the Knowledge Agent - Embedding sub-agent. Build the embedding generation and Supabase storage pipeline.

Create `embeddings.ts` that:

1. Accepts batches of KnowledgeChunks
2. Generates embeddings using OpenAI text-embedding-3-small (1536 dimensions)
   - Batch up to 100 chunks per API call
   - Rate limit: max 3000 RPM, 1M TPM
   - Retry with exponential backoff on 429s
3. Stores in Supabase sf_knowledge_chunks table via batch upsert
4. Creates the full-text search tsvector automatically (generated column)
5. Reports progress to Supabase task_queue for frontend updates

Create `hybrid-search.ts` that implements the Supabase RPC function client:

1. hybrid_search(query, match_count, filter_options):
   - Semantic search: cosine similarity on embeddings
   - Keyword search: ts_rank on fts column
   - Combine with Reciprocal Rank Fusion (RRF):
     score = (1 / (60 + semantic_rank)) * 1.2 + (1 / (60 + keyword_rank))
   - Filter by: content_type, sf_topics, difficulty, module_name
   - Return top-k with scores

2. For quiz answering, use a two-stage pipeline:
   Stage 1: Retrieve top 20 candidates via hybrid search
   Stage 2: Re-rank using Claude (send question + 20 candidates, ask for top 5 most relevant)

Include the Supabase SQL function for server-side hybrid search and the TypeScript client that calls it.
```

### Step 3.3: Knowledge Graph Builder

**Prompt 3.3.1 — Concept Graph:**
```
You are the Knowledge Agent - Graph Builder sub-agent. Build the Salesforce concept relationship graph.

Adapt PocketFlow's AnalyzeRelationships pattern for Salesforce concepts.

Create `graph-builder.ts` that:

1. After processing a module's chunks, uses Claude to extract concepts and relationships:

   PROMPT FOR CLAUDE:
   "Given this Salesforce Trailhead module content, identify:
   1. Key Salesforce concepts (e.g., 'Custom Objects', 'Apex Triggers', 'Flow Builder')
   2. Relationships between concepts:
      - prerequisite (A must be understood before B)
      - related (A and B are used together)
      - contains (A is part of B)
      - triggers (A causes B to execute)
      - extends (A builds upon B)
   3. Confidence score (0-1) for each relationship

   Return as JSON array of: {source, target, relationship_type, strength, reasoning}"

2. Stores edges in sf_concept_relationships table
3. Deduplicates edges (merge strengths if duplicate, keep max)
4. Builds an adjacency list for fast traversal
5. Exports as Mermaid.js diagram for visualization

SEED CONCEPTS (pre-load these relationships):
- Salesforce Platform → contains → [Objects, Fields, Users, Security]
- Apex → extends → [Triggers, Classes, Batch, Queueable, Schedulable]
- Declarative → contains → [Flows, Process Builder, Workflow Rules, Validation Rules]
- Agentforce → contains → [Agent Builder, Topics, Actions, Prompt Templates]
- Data Model → prerequisite → [Reports, Dashboards, Flows]
- Security Model → prerequisite → [Profiles, Permission Sets, OWD, Sharing Rules]

Create the concept graph with at least 50 seed relationships for the Admin, Developer, and Agentblazer tracks.
```

---

## Phase 4: Quiz Engine & Agent Orchestration {#phase-4}

### Step 4.1: Quiz Solver Agent

**Prompt 4.1.1 — Quiz Agent Implementation:**
```
You are the Quiz Agent - the core intelligence of TrailBlazeAI. Build the quiz-solving pipeline.

PIPELINE:
1. EXTRACT: Parse quiz questions from the Trailhead page
2. RETRIEVE: Search knowledge base for relevant context
3. REASON: Use Claude to analyze and select answers
4. VERIFY: Cross-check against concept graph
5. SUBMIT: Select answer in browser and submit
6. LOG: Record result and explanation

Create `quiz-agent.ts`:

```typescript
class QuizAgent {
  // Step 1: Extract quiz from page
  async extractQuiz(unitUrl: string): Promise<QuizQuestion[]>
  
  // Step 2: For each question, find relevant knowledge
  async retrieveContext(question: QuizQuestion): Promise<RelevantContext>
  
  // Step 3: Reason through the answer with Claude
  async reasonAnswer(question: QuizQuestion, context: RelevantContext): Promise<AnswerResult>
  
  // Step 4: Submit answer via browser
  async submitAnswer(question: QuizQuestion, answer: string): Promise<SubmissionResult>
  
  // Full pipeline
  async solveQuiz(unitUrl: string): Promise<QuizResult>
}
```

THE REASONING PROMPT (this is critical for accuracy):

```
You are an expert Salesforce professional taking a Trailhead quiz. 

CONTEXT FROM KNOWLEDGE BASE:
{retrieved_chunks}

QUESTION:
{question_text}

OPTIONS:
A) {option_a}
B) {option_b}  
C) {option_c}
D) {option_d}

INSTRUCTIONS:
1. First, identify which Salesforce concepts this question tests
2. Review each option against the provided context
3. Eliminate clearly wrong answers with reasoning
4. For remaining options, cite specific knowledge base content that supports or contradicts each
5. Select the best answer
6. Rate your confidence (0.0 to 1.0)

RESPOND IN THIS EXACT FORMAT:
<analysis>
Concepts tested: [list]
</analysis>
<elimination>
[reasoning for each eliminated option]
</elimination>
<selection>
Answer: [A/B/C/D]
Confidence: [0.0-1.0]
Reasoning: [why this is correct, citing context]
</selection>
<learning>
Key takeaway: [one sentence the user should remember]
</learning>
```

CONFIDENCE THRESHOLDS:
- >= 0.85: Submit automatically
- 0.60 - 0.84: Submit but flag for review
- < 0.60: Try web search for additional context, re-reason, if still low → flag for manual review

FALLBACK STRATEGY (when confidence is low):
1. Search Salesforce official docs via web search
2. Check the concept graph for related knowledge
3. If still uncertain, use the "process of elimination" approach
4. If multiple attempts allowed, submit best guess and learn from feedback

Implement the complete agent with all methods, error handling, and logging.
```

### Step 4.2: Agent Orchestrator

**Prompt 4.2.1 — Orchestration Pipeline:**
```
You are the Orchestrator Agent for TrailBlazeAI. Build the master pipeline that coordinates all agents to process a complete Trailmix.

WORKFLOW:
```
for each module in trailmix:
  1. SCRAPE all units (Browser Agent)
     → Store raw content in Supabase
     → Update module status to 'scraped'
  
  2. PROCESS content (Knowledge Agent)
     → Chunk content
     → Generate embeddings
     → Build concept relationships
     → Update module status to 'processed'
  
  3. SOLVE quizzes (Quiz Agent)
     for each quiz unit:
       → Extract questions
       → Retrieve context from knowledge base
       → Reason answers with Claude
       → Submit answers via browser
       → Record results
     → Update module status to 'quiz_complete'
  
  4. COMPLETE hands-on challenges (Salesforce Agent)
     for each hands_on unit:
       → Check if solution exists in database
       → Deploy via SF CLI if automated
       → Flag for manual completion if not
     → Update module status to 'completed'
  
  5. VERIFY badge (Browser Agent)
     → Check if badge was earned
     → Update badge_earned status
```

Create `orchestrator.ts` that:

1. Accepts a Trailmix URL and orchestration config:
   - concurrency: number of parallel modules (default 2)
   - priority_track: which track to process first
   - skip_completed: boolean
   - quiz_only_mode: boolean (skip hands-on)

2. Creates pg-boss jobs for the entire pipeline
3. Manages dependencies (Step 2 waits for Step 1, etc.)
4. Tracks progress in Supabase with real-time updates
5. Handles failures with configurable retry policies
6. Reports cost tracking (tokens used, API costs)
7. Provides pause/resume/cancel controls

Use the Vercel AI SDK Agent class for LLM-dependent steps and pg-boss for job orchestration.

CONCURRENCY SAFETY:
- Max 2 browser pages simultaneously (memory constraint)
- Max 5 embedding requests in parallel
- Max 3 Claude API calls in parallel
- Queue overflow → backpressure (slow down scraping)

Generate the complete implementation with worker handlers.
```

---

## Phase 5: Dashboard & Frontend {#phase-5}

### Step 5.1: Progress Dashboard

**Prompt 5.1.1 — Dashboard UI:**
```
You are the Frontend Agent - Dashboard sub-agent. Build the main TrailBlazeAI dashboard.

The dashboard shows:

1. HERO STATS BAR (top):
   - Total modules: X/Y completed
   - Badges earned: X/Y  
   - Knowledge chunks: X indexed
   - Quiz accuracy: X%
   - Time elapsed / estimated remaining

2. MODULE GRID (main area):
   - Card for each module showing:
     * Module name + track badge (Admin/Dev/Agentblazer)
     * Status indicator (color-coded: pending/scraping/processing/quiz/complete/failed)
     * Progress bar (units completed / total)
     * Quiz score (if attempted)
     * Badge icon (earned/not earned)
   - Click to expand → shows units list with per-unit status
   - Sort/filter by: track, status, difficulty, estimated time

3. REAL-TIME LOG (bottom):
   - Live feed of agent actions
   - "Scraping Module: Platform Basics..."
   - "Quiz answered: Q3 correct (confidence: 0.92)"
   - "Badge earned: Data Modeling!"
   - Uses Supabase Realtime subscription

4. CONTROL PANEL (sidebar):
   - Start/Pause/Resume/Stop buttons
   - Trailmix URL input
   - Priority selector (Admin first / Dev first / Fastest first)
   - Quiz-only mode toggle
   - Manual override: "Solve this quiz for me" per-module

Implement using:
- Next.js App Router with Server Components where possible
- Client Components for real-time elements
- Supabase Realtime for live updates (subscribe to modules table changes)
- shadcn/ui components for consistent styling
- Tailwind CSS for layout

Create ALL component files with complete implementations.
Use the Supabase client from lib/supabase/client.ts.
Data fetching via server components + real-time subscriptions for updates.
```

### Step 5.2: Knowledge Explorer

**Prompt 5.2.1 — Knowledge Base UI:**
```
You are the Frontend Agent - Knowledge sub-agent. Build the knowledge base explorer page.

Features:
1. SEMANTIC SEARCH BAR:
   - Input field with "Search your Salesforce knowledge..."
   - Calls hybrid_search RPC via API route
   - Shows results with relevance scores
   - Highlights matching terms

2. CONCEPT GRAPH VISUALIZATION:
   - Interactive network graph of Salesforce concepts
   - Nodes = concepts, edges = relationships
   - Color-coded by track (Admin=blue, Dev=green, Agentblazer=purple)
   - Click node → shows related chunks
   - Use D3.js force-directed graph or Mermaid for initial version

3. BROWSE BY MODULE:
   - Tree view: Trail > Module > Unit > Chunks
   - Expandable sections
   - Click chunk → full content view with code highlighting

4. EXPORT OPTIONS:
   - "Export for Claude Code" → generates CLAUDE.md context file
   - "Export for coding agent" → structured JSON with key concepts
   - "Export quiz review" → all questions + correct answers + explanations

Implement with Next.js, shadcn/ui, and the Supabase client.
The search should use the API route that calls the hybrid_search function.
```

---

## Phase 6: Salesforce Integration {#phase-6}

### Step 6.1: Salesforce DX MCP Setup

**Prompt 6.1.1 — SF DX Integration:**
```
You are the Salesforce Agent. Set up the Salesforce DX MCP server and build the hands-on challenge automation pipeline.

1. Install and configure the Salesforce CLI MCP server (salesforcecli/mcp):
   - Connect to user's Trailhead Playground
   - Authenticate via SF CLI (`sf org login web`)
   - Store auth tokens securely

2. Create `sf-agent.ts` with methods:
   - deployMetadata(components: string[]) → deploy Apex classes, LWC, custom objects
   - runApex(code: string) → execute anonymous Apex
   - importData(plan: string) → sf data import tree
   - queryOrg(soql: string) → run SOQL queries
   - createScratchOrg(definition: object) → for isolated testing
   - checkChallenge(challengeId: string) → verify hands-on completion

3. Import known solutions from artysta/salesforce-trailhead-solutions:
   - Clone the repo
   - Index all solution files by module name
   - Create a lookup table: module_name → solution_files[]
   - Auto-deploy when a hands-on challenge matches

4. For challenges WITHOUT existing solutions:
   - Extract the challenge requirements from the page
   - Use Claude to generate the Apex/config needed
   - Deploy to sandbox for verification
   - If verification fails, retry with error context

Create the complete implementation with MCP client connection and all methods.
```

---

## Phase 7: Testing, Optimization & Launch {#phase-7}

### Step 7.1: End-to-End Testing

**Prompt 7.1.1 — Integration Tests:**
```
You are the QA Agent. Create an end-to-end test suite for TrailBlazeAI.

Test scenarios:
1. Full pipeline test: Single module (e.g., "Salesforce Platform Basics")
   - Enumerate → Scrape → Process → Quiz → Verify badge
   - Assert: all units extracted, chunks stored, quiz answered, badge earned

2. Knowledge retrieval accuracy:
   - Index 5 modules
   - Run 20 quiz questions through the knowledge base
   - Assert: relevant chunks appear in top-5 results for 80%+ of questions

3. Quiz accuracy benchmark:
   - Solve 50 real quiz questions
   - Assert: 85%+ correct on first attempt

4. Concurrent processing:
   - Process 3 modules simultaneously
   - Assert: no race conditions, all complete correctly

5. Error recovery:
   - Simulate network failure mid-scrape
   - Assert: job retries and completes
   - Simulate auth expiry
   - Assert: user notified, re-auth flow triggered

6. Cost tracking:
   - Process 10 modules
   - Assert: cost stays under $2

Create tests using Vitest with descriptive names and clear assertions.
```

### Step 7.2: Cost Optimization

**Prompt 7.2.1 — Optimize for Budget:**
```
You are the DevOps Agent - Cost Optimization specialist. Apply these optimizations to TrailBlazeAI:

1. CLAUDE BATCH API:
   - Identify all non-time-critical Claude calls
   - Move content analysis, concept extraction, and explanation generation to Batch API (50% discount)
   - Only use real-time API for quiz answering (needs speed)

2. PROMPT CACHING:
   - Create a shared system prompt for quiz answering (~2000 tokens)
   - Enable caching: first request pays full price, subsequent requests pay 10%
   - Structure prompts so the cached prefix contains:
     * Salesforce expert persona
     * Quiz answering instructions
     * Output format specification
   - Variable suffix: question + retrieved context

3. MODEL TIERING:
   - Content extraction: Claude Haiku (cheapest, sufficient for parsing)
   - Chunk processing: Claude Haiku or Ollama/Llama-3.2 (free local)
   - Quiz answering: Claude Sonnet (best reasoning)
   - Concept relationships: Claude Haiku (structured extraction)

4. EMBEDDING OPTIMIZATION:
   - Batch all embeddings (max 100 per request)
   - Use text-embedding-3-small (cheapest, sufficient quality)
   - Cache embeddings for duplicate/similar content

5. BROWSER OPTIMIZATION:
   - Reuse browser page (don't create new page per unit)
   - Block images, CSS, fonts during scraping (faster loads)
   - Set reasonable timeouts (15s per page)

Implement all optimizations and add cost tracking to agent_logs.
```

---

## Prompt Library (Copy-Paste Ready) {#prompt-library}

### Quick Reference: Which Prompt to Use When

| Task | Prompt # | Agent | Estimated Time |
|------|----------|-------|---------------|
| Initialize BMAD project | 0.1.1 | Orchestrator | 30 min |
| Create PRD | 0.2.1 | PM | 20 min |
| Configure MCP | 0.3.1 | DevOps | 15 min |
| Analyze DeepTutor | 0.4.1 | Researcher | 20 min |
| Analyze PocketFlow | 0.4.2 | Researcher | 20 min |
| VPS setup | 1.1.1 | DevOps | 45 min |
| Database schema | 1.2.1 | DB Architect | 30 min |
| Next.js frontend | 1.3.1 | Frontend | 30 min |
| Docker setup | 1.4.1 | DevOps | 20 min |
| Fastify API | 1.5.1 | Backend | 45 min |
| Playwright MCP | 2.1.1 | Browser | 30 min |
| Auth flow | 2.2.1 | Browser | 30 min |
| Module enumerator | 2.3.1 | Browser | 30 min |
| Content extractor | 2.4.1 | Browser | 45 min |
| Chunking engine | 3.1.1 | Knowledge | 45 min |
| Embedding pipeline | 3.2.1 | Knowledge | 30 min |
| Concept graph | 3.3.1 | Knowledge | 30 min |
| Quiz solver | 4.1.1 | Quiz | 60 min |
| Orchestrator | 4.2.1 | Orchestrator | 45 min |
| Dashboard UI | 5.1.1 | Frontend | 60 min |
| Knowledge explorer | 5.2.1 | Frontend | 45 min |
| SF DX integration | 6.1.1 | Salesforce | 45 min |
| E2E tests | 7.1.1 | QA | 30 min |
| Cost optimization | 7.2.1 | DevOps | 30 min |

**Total estimated development time: ~14-16 hours across 7-10 days**

---

### Utility Prompts (Use Throughout)

**Debug Prompt — When Something Breaks:**
```
You are the Debug Agent for TrailBlazeAI. I'm encountering an error:

ERROR:
{paste error message}

CONTEXT:
- Component: {which agent/module}
- Last working state: {what was working}
- Recent changes: {what changed}

LOGS:
{paste relevant logs}

Diagnose the issue:
1. What is the root cause?
2. What is the minimal fix?
3. Are there any side effects to watch for?
4. How can we prevent this in the future?
```

**Architecture Decision Prompt — When Unsure:**
```
You are the Architecture Agent for TrailBlazeAI. I need to make a design decision:

DECISION: {describe the choice}

OPTIONS:
A) {option A with pros/cons}
B) {option B with pros/cons}

CONSTRAINTS:
- Budget: $20-50/month
- VPS: 4 vCPU, 8GB RAM
- Must work with: Next.js, Supabase, Playwright MCP, Claude API
- Priority: speed of completion > elegance

Recommend the best option with clear reasoning.
```

**Code Review Prompt — Before Merging:**
```
You are the Code Review Agent for TrailBlazeAI. Review this code:

FILE: {filename}
```
{paste code}
```

Check for:
1. TypeScript type safety (no 'any' types)
2. Error handling completeness
3. Supabase query efficiency (avoid N+1)
4. Memory leaks (especially in browser automation)
5. Security issues (credential exposure, injection)
6. Cost implications (unnecessary LLM calls)
7. Alignment with the BMAD V6 architecture

Provide specific, actionable feedback.
```

**Daily Standup Prompt — Start of Each Day:**
```
You are the Orchestrator Agent. Here's my TrailBlazeAI daily standup:

YESTERDAY: {what I completed}
BLOCKERS: {any issues}
TODAY'S PLAN: {what I want to accomplish}

Based on the master TODO checklist, tell me:
1. Am I on track? (% completion vs plan)
2. What should I prioritize today?
3. Are there any dependencies I need to unblock first?
4. What prompts should I run today? (reference by number)
```

---

## Key Repos & Resources {#key-repos--resources}

### Must-Clone Repos
| Repo | Purpose | URL |
|------|---------|-----|
| DeepTutor | Graph RAG architecture | https://github.com/HKUDS/DeepTutor |
| PocketFlow Knowledge | Concept graph pipeline | https://github.com/The-Pocket/PocketFlow-Tutorial-Codebase-Knowledge |
| Playwright MCP | Browser automation | https://github.com/microsoft/playwright-mcp |
| Salesforce DX MCP | SF org integration | https://github.com/salesforcecli/mcp |
| Trailhead Solutions | Hands-on answers | https://github.com/artysta/salesforce-trailhead-solutions |
| browser-use | Fallback browser agent | https://github.com/browser-use/browser-use |
| Stagehand | AI browser framework | https://github.com/browserbase/stagehand |

### Documentation Links
| Doc | URL |
|-----|-----|
| Vercel AI SDK 6 | https://ai-sdk.dev/docs |
| Supabase pgvector | https://supabase.com/docs/guides/ai |
| Supabase Realtime | https://supabase.com/docs/guides/realtime |
| Playwright MCP npm | https://www.npmjs.com/package/@playwright/mcp |
| Claude API Docs | https://docs.anthropic.com |
| Salesforce Developer Docs | https://developer.salesforce.com/docs |
| pg-boss | https://github.com/timgit/pg-boss |

### Salesforce Trailhead Targets
| Track | Focus Areas | Key Modules |
|-------|-------------|-------------|
| Admin | Objects, Security, Reports, Users | Platform Basics, Data Modeling, Security |
| Developer | Apex, LWC, SOQL, Testing | Developer Beginner, Apex Basics, LWC |
| Agentblazer | Agentforce, Topics, Actions | AI Fundamentals, Agent Builder, Testing |

---

## Execution Strategy: Day-by-Day Plan

| Day | Phases | Key Deliverables | Prompts to Run |
|-----|--------|-----------------|----------------|
| 1 | 0 + 1 (start) | BMAD structure, PRD, Supabase schema, VPS provisioned | 0.1.1 → 0.4.2, 1.1.1, 1.2.1 |
| 2 | 1 (finish) + 2 (start) | Next.js deployed, Docker running, Playwright MCP live | 1.3.1 → 1.5.1, 2.1.1, 2.2.1 |
| 3 | 2 (finish) | Module enumerator + content extractor working | 2.3.1, 2.4.1 |
| 4 | 3 | Knowledge pipeline: chunking + embeddings + search working | 3.1.1, 3.2.1, 3.3.1 |
| 5 | 4 | Quiz agent solving real quizzes at 85%+ accuracy | 4.1.1, 4.2.1 |
| 6-7 | 5 | Dashboard live with real-time progress | 5.1.1, 5.2.1 |
| 8-9 | 6 | SF DX hands-on automation | 6.1.1 |
| 10 | 7 | Full pipeline tested, optimized, LAUNCH 🚀 | 7.1.1, 7.2.1 |

---

*Generated for Demi's BMAD V6 TrailBlazeAI project — February 2026*
*Architecture based on research: Playwright MCP, Vercel AI SDK 6, Supabase pgvector, Claude API*
