# AI-powered Trailhead completion assistant: full architecture blueprint

**A Next.js + VPS hybrid system combining Playwright browser automation, Claude-powered RAG, and Supabase pgvector can realistically help Demi process 100+ hours of Salesforce Trailhead content in 2-3 days for $9-49/month.** The architecture orchestrates four specialized AI agents — scraping, knowledge-building, quiz-answering, and documentation — through the Vercel AI SDK 6's Agent class with MCP tool integration. The most critical design decision is using Supabase Realtime as the bridge between Vercel's serverless frontend and the VPS's long-running browser automation, eliminating WebSocket limitations entirely. This report provides the complete technical blueprint: tool selection, database schemas, Docker configurations, agent orchestration patterns, and a phased implementation roadmap.

---

## Browser automation: Playwright MCP wins on every metric

Three mature options exist for AI-driven browser automation, each with distinct tradeoffs. After evaluating all three against the Trailhead use case, **Playwright MCP** (`microsoft/playwright-mcp`, 27.1k GitHub stars) emerges as the clear primary choice, with browser-use as a fallback for complex multi-step tasks.

Playwright MCP operates on **accessibility tree snapshots** rather than screenshots, making it fast, lightweight, and LLM-friendly without requiring vision models. It exposes structured MCP tools — `browser_navigate`, `browser_click`, `browser_type`, `browser_snapshot`, `browser_evaluate` — that an AI agent can invoke through standard MCP protocol. The server runs in HTTP/SSE mode on a VPS (`npx @playwright/mcp@latest --port 8931 --host 0.0.0.0`) with a built-in Dockerfile, persistent browser profiles for maintaining Trailhead authentication, and ~512MB-1GB RAM overhead.

**Stagehand by Browserbase** (v3) provides higher-level primitives — `act()`, `extract()`, `observe()`, and an autonomous `agent()` method — with built-in action caching and self-healing selectors. It supports local mode without Browserbase cloud but adds LLM API costs per action (every browser interaction requires an inference call). This makes it roughly **3-5x more expensive per page interaction** than Playwright MCP, where LLM calls happen only for decision-making, not navigation.

**browser-use** (78.1k stars, Python) recently dropped Playwright entirely in favor of raw CDP for speed. It offers a full agent loop with autonomous multi-step task handling, but its Python ecosystem doesn't integrate as cleanly with the Next.js/TypeScript stack. Its custom CDP library (`cdp-use`) provides faster element extraction than Playwright's abstraction, making it valuable as a fallback for complex Shadow DOM interactions on Trailhead's Lightning Web Components.

| Feature | Playwright MCP | Stagehand v3 | browser-use |
|---------|---------------|-------------|-------------|
| Language | TypeScript/Node.js | TypeScript | Python 3.11+ |
| AI dependency | None (tools output structured data) | Required per action | Required per step |
| Docker-ready | ✅ Official Dockerfile | Community fork | Easy to create |
| VPS RAM | ~512MB-1GB | ~1-2GB | ~1-2GB |
| Self-hosted | ✅ Full | ✅ Local mode | ✅ Full |
| Cost per 100 modules | ~$0 (only Claude for quiz decisions) | ~$5-15 (LLM per action) | ~$3-10 (LLM per step) |

For Trailhead specifically, authentication is handled through **persistent browser profiles** stored at `~/.cache/ms-playwright/mcp-{channel}-profile`. Log in once manually, and the session persists across automation runs. Alternatively, use the Salesforce OAuth JWT Bearer Token flow to construct a front-door URL (`{instanceUrl}/secur/frontdoor.jsp?sid={accessToken}`) that bypasses MFA entirely. Trailhead's Lightning Web Components use Shadow DOM with dynamic IDs, so selectors should rely on `getByRole`, `getByLabel`, and `:has-text()` rather than CSS IDs.

---

## Knowledge pipeline: hybrid RAG with graph-enhanced retrieval

The knowledge pipeline transforms scraped Trailhead content into a searchable, embeddable database through a four-stage process: extraction → structure-aware chunking → embedding → hybrid search with re-ranking.

**DeepTutor** (HKUDS/DeepTutor) provides the most relevant architectural inspiration. Its multi-agent system uses Graph RAG (combining vector embeddings + knowledge graphs + web search) and achieves **55% more comprehensive answers** than traditional RAG — 22.6 claims per answer versus 14.6 — with 2.3x greater conceptual diversity. Its dual-loop reasoning pipeline (DecomposeAgent → ResearchAgent → NoteAgent → ReportingAgent) maps directly to the Trailhead workflow: decompose a module into concepts, research each concept's relationships, build notes, and generate quiz-ready responses. The FastAPI + Next.js stack matches the target architecture perfectly.

**PocketFlow's 6-stage pipeline** (FetchRepo → IdentifyAbstractions → AnalyzeRelationships → OrderChapters → WriteChapters → CombineTutorial) can be adapted for Salesforce content. Replace `FetchRepo` with the Playwright scraper, `IdentifyAbstractions` with Salesforce concept extraction (Objects, Fields, Flows, Apex patterns), and `AnalyzeRelationships` with concept dependency mapping. The output — a structured knowledge graph with Mermaid.js visualizations — creates an optimal learning sequence through Trailhead content.

### Chunking strategy matters more than embedding model choice

For educational content, **document-structure-aware chunking** delivers the highest retrieval accuracy. The recommended approach:

1. Parse Trailhead HTML structure to extract headers, sections, and code blocks
2. Split by section headers (module → unit → section hierarchy)
3. Apply recursive character splitting at **400-512 tokens with 50-100 token overlap** (Chroma research shows 88-89% recall at this size with text-embedding-3-large)
4. Handle content types differently: keep code blocks intact as separate chunks, store quiz questions atomically (one question + all options + correct answer = one chunk), and use larger ~800-token chunks for hands-on step sequences

The embedding model recommendation is **text-embedding-3-small** (1536 dimensions, $0.02 per million tokens) for initial development. At this project's scale (~200K tokens across 100 modules), embedding costs are essentially **$0.004 total** — negligible. For production, consider text-embedding-3-large compressed to 512 dimensions, which Supabase documentation specifically recommends for hybrid search balancing quality with retrieval speed.

### Database schema for triple-purpose knowledge storage

The schema must serve three purposes: quiz answering, coding agent reference, and documentation lookup. This requires three interconnected tables:

```sql
-- Knowledge chunks with vector embeddings
CREATE TABLE sf_knowledge_chunks (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'explanation', 'code', 'quiz', 'hands_on', 'reference'
  module_name TEXT,
  unit_name TEXT,
  trail_name TEXT,
  section_header TEXT,
  difficulty TEXT,
  source_url TEXT,
  sf_topics TEXT[],
  sf_objects TEXT[],
  fts TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(module_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(section_header, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW index (better recall than IVFFlat, no training step)
CREATE INDEX ON sf_knowledge_chunks
  USING hnsw (embedding vector_ip_ops)
  WITH (m = 16, ef_construction = 64);
```

A separate `sf_quiz_items` table stores quiz question-answer pairs with `related_chunk_ids` linking to explanatory content, and an `sf_concept_relationships` table models Salesforce concept dependencies (e.g., "Flows → prerequisite → Objects & Fields", "Apex Triggers → fires_on → SObject DML Events"). This graph structure enables the quiz agent to trace reasoning paths through related concepts.

The **hybrid search function** combines vector similarity with full-text search using Reciprocal Rank Fusion (RRF), with semantic search weighted 1.2x higher than keyword search for educational queries. For quiz answering specifically, a two-stage retrieval pipeline first recalls 20 candidates via hybrid search, then re-ranks using either Claude (for complex questions) or a cross-encoder like bge-reranker-v2-m3 (for speed/cost).

---

## Agent orchestration through Vercel AI SDK 6 and MCP

The **Vercel AI SDK 6** (released December 2025, 20M+ monthly downloads) provides the orchestration layer through its new `Agent` class with native MCP client integration. This is the recommended framework because it unifies LLM interaction, tool execution, and MCP server communication in TypeScript — the same language as the Next.js frontend.

```typescript
import { Agent } from 'ai';
import { createMCPClient } from '@ai-sdk/mcp';
import { anthropic } from '@ai-sdk/anthropic';

const playwrightMCP = await createMCPClient({
  transport: { type: 'http', url: 'https://vps.example.com/playwright-mcp' }
});

const scraperAgent = new Agent({
  model: anthropic('claude-sonnet-4-5'),
  instructions: 'Navigate Trailhead modules, extract content...',
  tools: await playwrightMCP.tools(),
  stopWhen: stepCountIs(20),
});
```

### Four specialized agents with clear responsibilities

The system uses an **orchestrator-worker pattern** inspired by Anthropic's own multi-agent research system:

- **Scraper Agent** uses Playwright MCP tools to navigate Trailhead pages, extract module content (text, code blocks, images), and handle authentication. It operates in a ReAct loop: Thought → Action (browser_navigate/browser_snapshot) → Observation → repeat.

- **Knowledge Agent** processes extracted content through the chunking pipeline, generates embeddings via OpenAI API, stores chunks in Supabase pgvector, and builds concept relationship edges. It runs as a pg-boss worker consuming from the `content-process` queue.

- **Quiz Agent** receives quiz questions, performs hybrid search against the knowledge base, re-ranks results for relevance, and uses Claude Sonnet to reason through answer selection. It returns both the answer and a confidence score, with explanations for learning reinforcement.

- **Documentation Agent** supplements the knowledge base by retrieving Salesforce developer documentation through the **Salesforce DX MCP Server** (official, `salesforcecli/mcp`, 60+ tools including metadata enrichment, code analysis, and org introspection). This agent enriches quiz answers with authoritative Salesforce documentation context.

Communication between agents uses **Supabase as shared state**: a `task_queue` table with status tracking (pending → processing → complete → failed) enables the orchestrator to manage work distribution, and Supabase Realtime pushes status changes to the frontend dashboard via WebSocket.

### The MCP ecosystem provides ready-made infrastructure

Three production-ready MCP servers cover all integration needs:

- **`microsoft/playwright-mcp`** — Browser automation (navigation, extraction, form interaction)
- **`supabase-community/supabase-mcp`** — Database operations (queries, migrations, schema management, vector search)
- **`salesforcecli/mcp`** — Salesforce org interaction (deploy code, retrieve metadata, run Apex, create scratch orgs)

All three run on the VPS connected via stdio transport (fastest, no network overhead). The AI SDK's `createMCPClient` manages connections, and the Agent class handles multi-step tool execution loops with configurable step limits.

---

## Trailhead structure and what can actually be automated

Trailhead organizes content hierarchically: Trails → Modules → Units, with each unit ending in either a multiple-choice quiz or a hands-on challenge. **There is no public Trailhead API for content or quiz data** — all content must be scraped from rendered pages. The internal GraphQL API only exposes profile/badge data (earned badges, rank, skills), not module content.

**Quiz-only modules are the primary automation target.** Multiple-choice quizzes check comprehension of the preceding reading material, with scoring tiers: 100 points on first attempt, 50 on second, 25 on third+. The scraper extracts unit content, stores it in the knowledge base, then the quiz agent uses that content (plus any related knowledge) to select answers. Based on existing AI quiz-solving projects (QuizSolver AI, Coursera Auto-Answer), LLMs achieve **85-95% accuracy** on well-contextualized multiple-choice questions from educational platforms.

**Hands-on challenges require actual Salesforce org configuration.** These verify work by connecting to the user's Trailhead Playground and checking metadata/configuration programmatically. Automation is possible through the Salesforce CLI (`sf project deploy start`, `sf apex run`, `sf data import tree`) to deploy pre-built Apex classes, custom objects, and configuration metadata. The community repository `artysta/salesforce-trailhead-solutions` (29 stars, 212+ commits) provides solutions for many hands-on challenges, organized by module name — this serves as a starting solution database.

**Superbadges and advanced projects** have limited automation potential. They require complex, multi-step work with minimal guidance and are actively monitored by Salesforce for solution sharing. Focus automation effort on quiz modules and standard hands-on challenges.

### Agentforce/Agentblazer learning path

The Agentblazer Status Program has three tiers: **Champion** (AI fundamentals, first agent build), **Innovator** (custom agents, Agent Builder, Testing), and **Legend** (full lifecycle management, requires Agentforce Specialist Certification — 60 questions covering prompt engineering at 30%, Data Cloud at 20%, and Sales/Service integration). Key concepts to index in the knowledge base: Agent Builder, Topics, Actions, Prompt Templates, Agent Script, Testing Center, and the Agent API/Models API.

---

## System architecture: hybrid deployment with Supabase as the glue

The architecture splits across three services with Supabase serving as the central nervous system:

```
┌─────────────────────────────────┐
│         USER'S BROWSER          │
│  Next.js Frontend               │
│  ← Supabase Realtime (WS) ──── │ ──── Live progress updates
└──────────┬──────────────────────┘
           │ HTTPS
           ▼
┌──────────────────────┐      ┌──────────────────────────┐
│  VERCEL (Free Tier)  │      │   SUPABASE (Free/Pro)    │
│  Next.js App Router  │◄────►│  PostgreSQL + pgvector   │
│  API Routes (proxy)  │ REST │  Realtime Engine         │
│  SSR/SSG pages       │      │  Auth (RLS)              │
└──────────┬───────────┘      └────────────┬─────────────┘
           │ Bearer Token                   │ Direct DB
           ▼                                ▼
┌────────────────────────────────────────────────────────┐
│            VPS (Hetzner CX33 — €5.49/mo)              │
│                                                        │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ API Server  │  │ pg-boss  │  │ Playwright MCP   │ │
│  │ (Fastify)   │  │ (queue)  │  │ (Docker/headless)│ │
│  └─────────────┘  └──────────┘  └──────────────────┘ │
│  ┌─────────────┐  ┌──────────────────────────────┐   │
│  │ Nginx+SSL   │  │ Claude/OpenAI API Client     │   │
│  │ (reverse    │  │ (embeddings + quiz reasoning) │   │
│  │  proxy)     │  │                               │   │
│  └─────────────┘  └──────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

The key architectural insight is using **Supabase Realtime Postgres Changes** as the real-time bridge between Vercel and the VPS. When the VPS worker updates a module's status in Supabase, the frontend receives the change instantly via WebSocket — no need for SSE tunneling through Vercel (which has a 25-second Edge timeout). This pattern is both simpler and more reliable than alternatives.

### Job queue: pg-boss eliminates Redis dependency

**pg-boss** uses the existing Supabase PostgreSQL instance for job queuing, eliminating Redis as a dependency and saving ~128MB RAM on the VPS. It supports priority queues (quiz modules processed first with priority=1, content modules with priority=5), configurable retries with exponential backoff, and team concurrency limiting (cap at 2 concurrent browser pages on a 4GB RAM VPS). Jobs chain through queues: `module-scrape` → `content-process` → `embedding-generate` → `quiz-ready`.

### Docker Compose for the VPS

```yaml
services:
  api:
    build: ./api
    ports: ["3001:3001"]
    environment:
      - DATABASE_URL=${SUPABASE_DB_URL}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - VPS_API_SECRET=${VPS_API_SECRET}
    deploy:
      resources:
        limits:
          memory: 512M

  worker:
    build:
      context: ./worker
      dockerfile: Dockerfile  # FROM mcr.microsoft.com/playwright:v1.58.2-noble
    ipc: host
    deploy:
      resources:
        limits:
          memory: 3G
          cpus: '3.0'

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./certbot/conf:/etc/letsencrypt
```

The worker container uses Microsoft's official Playwright Docker image with headless Chromium, running as a non-root user for security. The `ipc: host` flag is required for Chromium's shared memory access in Docker.

---

## Cost breakdown fits comfortably within $20-50/month

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Hetzner CX33 (4 vCPU, 8GB RAM) | Standard | **~$6** |
| Supabase | Free (upgrade to Pro $25 if needed) | **$0-25** |
| Vercel | Hobby (Free) | **$0** |
| Claude API (Haiku for bulk, Sonnet for quizzes) | Pay-as-you-go | **$5-15** |
| OpenAI Embeddings (text-embedding-3-small) | Pay-as-you-go | **~$0.01** |
| Domain + SSL (Let's Encrypt) | Free | **$0** |
| **Total** | | **$11-46/month** |

Cost-saving strategies that matter: use **Claude's Batch API** for non-urgent content processing (50% discount), enable **prompt caching** to reuse system prompts across modules (90% savings on cached tokens), and run Claude Haiku for content extraction while reserving Sonnet only for complex quiz reasoning. At this project's scale (~800K tokens total for 100 modules), the one-time processing cost is roughly **$6-15** — this isn't an ongoing expense but a burst workload.

For the $20-50/month budget constraint, the **MVP configuration** (Free Supabase + Hetzner CX33 + pay-as-you-go LLM APIs) lands at **$11-21/month** ongoing after the initial processing burst. The Pro Supabase upgrade ($25/month) is only needed if the project sits idle for 7+ days (Free tier pauses inactive projects).

---

## Implementation roadmap: four phases over 2-3 weeks

**Phase 1 — Foundation (Days 1-3):** Set up Supabase with pgvector extension and the full database schema. Provision the Hetzner VPS, install Docker, configure Nginx with Let's Encrypt. Deploy a skeleton Next.js app on Vercel with Supabase Auth. Create the Docker Compose stack with the API server and Playwright worker container.

**Phase 2 — Scraping pipeline (Days 4-7):** Implement the Playwright MCP server in Docker with persistent browser profiles. Build the Trailhead login flow (manual first login, then persistent session). Create the module scraping pipeline: enumerate Trailmix URLs → queue in pg-boss → scrape unit content → store raw HTML. Connect Vercel API routes to VPS backend with Bearer token auth.

**Phase 3 — Knowledge + quiz engine (Days 8-12):** Build the content processing pipeline: clean HTML → structure-aware chunking → OpenAI embedding generation → Supabase pgvector storage. Implement the hybrid search function (vector + full-text with RRF). Create the quiz agent: extract questions from Trailhead quiz pages → search knowledge base → Claude reasons through answers → submit via Playwright MCP. Wire up Supabase Realtime subscriptions for the progress dashboard.

**Phase 4 — Optimization + hands-on automation (Days 13-18):** Integrate the Salesforce DX MCP server for hands-on challenge automation via CLI. Import solutions from `artysta/salesforce-trailhead-solutions` into the knowledge base. Add prompt caching and batch API support. Build the interactive dashboard with per-module status cards, quiz accuracy stats, and knowledge base growth metrics. Harden error handling with retry logic and dead letter queues.

---

## Key repos, tools, and resources to bookmark

The five most critical GitHub repositories for this project are: **`microsoft/playwright-mcp`** (browser automation MCP server), **`HKUDS/DeepTutor`** (multi-agent RAG architecture reference), **`salesforcecli/mcp`** (official Salesforce DX MCP), **`browser-use/browser-use`** (fallback browser automation with CDP), and **`artysta/salesforce-trailhead-solutions`** (hands-on challenge solutions database).

For the Vercel AI SDK integration, the key packages are `ai` (core Agent class), `@ai-sdk/mcp` (MCP client), and `@ai-sdk/anthropic` (Claude provider). The `mcp-to-ai-sdk` CLI tool generates static tool definitions from MCP servers for production use, preventing schema drift and reducing token overhead.

Two additional projects worth evaluating during implementation: **Tuntle** (AI study planner using Supabase — closest architecture match), and **OATutor** (Bayesian Knowledge Tracing for adaptive skill mastery estimation, applicable to tracking Salesforce concept understanding across modules).

## Conclusion: a tractable system with real constraints

This architecture is technically sound and financially viable within the stated budget. The highest-risk component is **Trailhead's Shadow DOM and dynamic page structure** — Salesforce's Lightning Web Components use non-standard Shadow DOM with runtime-generated IDs, meaning selectors will need maintenance as Trailhead's UI evolves. Mitigate this by preferring accessibility tree snapshots (Playwright MCP's default mode) over CSS selectors, and by using Stagehand's self-healing selectors as a fallback.

The system's most powerful capability isn't quiz automation — it's the **persistent Salesforce knowledge database** that outlives the Trailhead sprint. By structuring the schema for triple-purpose use (quiz answering, coding agent reference, documentation lookup) with concept relationship graphs, Demi builds a personal Salesforce knowledge graph that becomes increasingly valuable for Agentforce development, certification prep, and day-to-day Salesforce work. The Trailhead completion is the input; the knowledge base is the real output.

One important caveat on ethics and terms: Salesforce explicitly prohibits sharing certification exam content and monitors for automated badge completion. **Trailhead module badges have lower enforcement** than certifications — Salesforce has acknowledged that cheating on badges is possible but "there is little learning in that." The system should be positioned as a learning accelerator (extract content, build knowledge, explain answers) rather than a blind automation tool. This distinction matters for account safety and, more practically, for actually learning the material needed for the certification exams that follow the Trailmix.