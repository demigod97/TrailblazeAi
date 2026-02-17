---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - _bmad-output/planning-artifacts/research/AI-powered-Trailhead-completion-assistant-full-architecture-blueprint.md
  - _bmad-output/planning-artifacts/research/TrailBlazeAI-BMAD-V6-Action-Plan.md
  - _bmad-output/project-context.md
date: 2026-02-17
author: Demi
---

# Product Brief: TrailBlazeAI

## Executive Summary

TrailBlazeAI is an AI-powered learning accelerator that automates the extraction, comprehension, and assessment completion of Salesforce Trailhead content. Targeting 100+ hours of content across Admin, Developer, and Agentblazer certification tracks, the system combines Playwright browser automation with Claude-powered reasoning and a Supabase-backed knowledge pipeline to compress weeks of study into 2-3 days. The architecture deploys as a hybrid system — Next.js 15 on Vercel for the dashboard, Fastify 5 with Playwright in Docker on a Hetzner VPS for automation — operating within a $20-50/month budget. The lasting output isn't just earned badges: it's a structured Salesforce knowledge graph with vector embeddings and concept relationships that serves as a persistent reference for future development, certification prep, and AI coding agents.

---

## Core Vision

### Problem Statement

Completing 100+ hours of Salesforce Trailhead content across three certification tracks (Administrator, Developer, Agentblazer) within a 2-3 day timeframe is impossible through manual study. Each module requires reading educational content, absorbing Salesforce-specific concepts, passing multiple-choice quizzes, and completing hands-on challenges in Trailhead Playground sandboxes. The volume of material — spanning objects, fields, security, Apex, Lightning Web Components, Flows, Agentforce, and more — creates an insurmountable time barrier when certification deadlines are pressing.

### Problem Impact

Without a systematic approach, learners face a painful choice: spend weeks studying (delaying certification and career progression) or attempt to rush through material without retention (passing quizzes but lacking the knowledge for actual certification exams and on-the-job work). The knowledge is genuinely valuable — Salesforce platform understanding is critical for Agentforce development — but the delivery format (sequential web pages with quiz gates) is optimized for learning pace, not knowledge throughput.

### Why Existing Solutions Fall Short

- **No public Trailhead API** — All content must be scraped from rendered pages using browser automation
- **Browser extensions** (QuizSolver AI, Coursera Auto-Answer) solve individual quizzes but don't build lasting knowledge or handle content extraction
- **Manual note-taking** doesn't scale to 100+ modules and can't be queried semantically
- **No integrated pipeline** exists that combines scraping, knowledge structuring, quiz automation, AND hands-on challenge completion in a single system
- **Shadow DOM barriers** — Trailhead's Lightning Web Components use non-standard Shadow DOM with dynamic IDs, defeating simple CSS selector approaches

### Proposed Solution

TrailBlazeAI orchestrates four specialized AI agents through a unified pipeline:

1. **Scraper Agent** — Playwright MCP navigates Trailhead, extracts module content (text, code blocks, quiz questions), and handles authentication persistence
2. **Knowledge Agent** — Processes extracted content through structure-aware chunking (400-512 tokens), generates embeddings (OpenAI text-embedding-3-small), stores in Supabase pgvector, and builds Salesforce concept relationship graphs
3. **Quiz Agent** — Performs hybrid search (vector + full-text with RRF re-ranking) against the knowledge base, uses Claude to reason through answers with chain-of-thought analysis, and submits via browser automation. Target: 85%+ first-attempt accuracy
4. **Documentation Agent** — Enriches the knowledge base with Salesforce developer documentation context via Salesforce DX MCP

The system uses Supabase Realtime as the bridge between the Vercel frontend dashboard and VPS automation workers, with pg-boss managing the job queue through the existing PostgreSQL connection.

### Key Differentiators

- **Knowledge-first architecture** — The persistent Salesforce knowledge database with vector embeddings and concept graphs is the primary output; badge completion is the input that builds it
- **MCP-native tool integration** — Playwright MCP, Supabase MCP, and Salesforce DX MCP provide production-ready, maintainable integrations without custom API wrappers
- **Accessibility-tree navigation** — Uses Playwright MCP's structured accessibility snapshots instead of fragile CSS selectors, making the system resilient to Trailhead UI changes
- **Budget-conscious design** — Entire system operates within $11-46/month using free tiers (Vercel Hobby, Supabase Free) and a single Hetzner VPS, with Claude Batch API and prompt caching for cost optimization
- **Triple-purpose knowledge base** — Schema designed for quiz answering, coding agent reference, AND documentation lookup with concept relationship graphs enabling reasoning across module boundaries

---

## Target Users

### Primary Users

**Demi — Developer Transitioning to Salesforce Agentforce**

- **Role:** Developer with AI/automation experience, new to the Salesforce ecosystem
- **Context:** Needs to rapidly upskill across three Trailhead tracks (Admin, Developer, Agentblazer) to build Agentforce-powered solutions. Has a pressing deadline to earn badges and build foundational Salesforce knowledge
- **Motivation:** Certification readiness and practical Salesforce platform understanding for Agentforce development. The knowledge itself matters — not just the badges
- **Current pain:** Manually reading 100+ hours of sequential web content with quiz gates is impossibly slow. Note-taking doesn't scale. Context is lost between modules. No way to semantically query what's been learned
- **Success vision:** All three track badges earned in 2-3 days, with a searchable, embeddable Salesforce knowledge base that serves as a persistent reference for daily development work and certification exam prep
- **Emotional state:** Time-pressured but excited about the learning — wants to absorb the material, not just bypass it. Values the "learning accelerator" framing over "quiz cheater"

### Secondary Users

**Future AI Coding Agents**
- The knowledge base's triple-purpose schema (quiz answering, coding agent reference, documentation lookup) means AI coding agents are downstream consumers. The concept relationship graph and vector embeddings make the knowledge base queryable by tools like Claude Code, enabling Salesforce-aware code generation and debugging

**Other Salesforce Learners (Potential Future Use)**
- The system architecture is generalizable. While built for Demi's immediate need, any learner with a large Trailmix could benefit. This is not a current priority but informs schema design decisions (multi-tenant-ready IDs, configurable Trailmix URLs)

### User Journey

1. **Setup** — Demi configures environment variables (Supabase, Anthropic, Salesforce credentials), starts the VPS Docker stack, and opens the dashboard
2. **Import** — Pastes a Trailmix URL into the dashboard. System enumerates all modules and units, displaying the full scope
3. **Automation** — Clicks "Start" with priority settings (Admin first, quiz-only mode toggle). Watches real-time progress as modules are scraped, processed, and quizzes answered
4. **"Aha!" Moment** — Sees the first batch of badges earned automatically with 90%+ quiz accuracy, and realizes the knowledge base search returns genuinely useful explanations
5. **Review** — Uses the knowledge explorer to browse concept graphs, review quiz explanations, and search the knowledge base semantically. Exports context for Claude Code
6. **Completion** — All badges earned. The persistent knowledge database becomes a daily reference tool for Agentforce development and certification prep

---

## Success Metrics

### User Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Badge completion rate | 100% of targeted Trailmix modules | Badges earned / total modules in Trailmix |
| Quiz first-attempt accuracy | 85%+ | Correct answers / total questions on first attempt |
| Time to complete full Trailmix | 2-3 days (vs. 100+ hours manual) | Wall-clock time from first import to last badge |
| Knowledge base utility | Demi uses KB for daily SF work | Semantic search queries post-completion > 0/week |
| Content extraction completeness | 95%+ of unit content captured | Units with extracted content / total units |

### Business Objectives

This is a personal productivity tool, so "business" objectives map to operational efficiency:

| Objective | Target | Timeframe |
|-----------|--------|-----------|
| Operational cost | $20-50/month sustained | Ongoing |
| One-time processing cost | < $15 for full Trailmix | Initial run |
| VPS resource usage | < 8GB RAM, < 4 vCPU sustained | During processing |
| System reliability | < 5% job failure rate (after retries) | Per processing run |
| Knowledge base size | 5,000+ chunks indexed across 100+ modules | After initial run |

### Key Performance Indicators

**Leading indicators (predict success):**
- Content scraping throughput: modules processed per hour (target: 10-15/hr)
- Embedding generation rate: chunks embedded per minute (target: 100+/min)
- Quiz confidence distribution: % of answers with confidence > 0.85 (target: 80%+)

**Lagging indicators (confirm success):**
- Total badges earned vs. target
- Cumulative quiz accuracy across all modules
- Knowledge base recall quality: relevant chunks in top-5 for quiz questions (target: 80%+)
- Cost per badge earned (target: < $0.50)

**Anti-metrics (things to avoid):**
- Salesforce account flags or rate-limit blocks (target: 0)
- Manual interventions required during automation (target: < 10% of modules)
- Quiz retries needed due to low confidence (target: < 15% of quizzes)

---

## MVP Scope

### Core Features (Phases 1-4)

**Must-have for solving the core problem:**

1. **Trailmix Import & Module Enumeration** — Paste a Trailmix URL, system discovers all modules/units, stores in Supabase, creates job queue
2. **Content Scraping Pipeline** — Playwright MCP navigates Trailhead, extracts unit content (text, code blocks, quiz questions), handles auth persistence via persistent browser profiles
3. **Knowledge Processing** — Structure-aware chunking (400-512 tokens), OpenAI embedding generation, Supabase pgvector storage, full-text search indexing
4. **Hybrid Search** — Vector + full-text with Reciprocal Rank Fusion (RRF) re-ranking for quiz context retrieval
5. **Quiz Automation** — Extract questions from Trailhead pages, retrieve knowledge context, Claude chain-of-thought reasoning, submit answers via browser, log results with confidence scores
6. **Job Queue Orchestration** — pg-boss manages scrape → process → embed → quiz pipeline with priority ordering, retries, and concurrency limits (2 browser pages max)
7. **Basic Progress API** — Fastify endpoints for /health, module status, quiz results — consumed by dashboard or CLI
8. **Docker Deployment** — API + Worker containers on Hetzner VPS with Docker Compose

### Out of Scope for MVP

| Feature | Reason for Deferral | Target Phase |
|---------|---------------------|--------------|
| Rich dashboard UI with real-time updates | Core value is automation, not visualization; CLI/API output sufficient initially | Phase 5 |
| Knowledge base explorer / concept graph visualization | Nice-to-have; knowledge is valuable even without a UI | Phase 5 |
| Salesforce DX MCP / hands-on challenge automation | Requires sf CLI + org auth; quiz modules are the primary target | Phase 6 |
| Claude Batch API / prompt caching optimization | Premature optimization; get accuracy right first | Phase 7 |
| Multi-user support / authentication | Personal tool; single-user by design | Future |
| Concept relationship graph builder | Enhances retrieval quality but not essential for 85%+ accuracy | Phase 3+ |
| Supabase Realtime frontend subscriptions | Requires dashboard UI first | Phase 5 |
| Ollama/local LLM fallback | Budget LLM calls are cheap enough with Claude Haiku | Future |

### MVP Success Criteria

The MVP is successful when:
- [ ] A full Trailmix URL can be imported and all modules/units enumerated automatically
- [ ] 95%+ of unit content is successfully extracted and stored
- [ ] Knowledge base has 1,000+ indexed chunks with working hybrid search
- [ ] Quiz automation achieves 85%+ first-attempt accuracy on a 20+ question sample
- [ ] Full pipeline (scrape → process → quiz) runs end-to-end without manual intervention for quiz-type modules
- [ ] System operates within $15 one-time processing cost for a 100-module Trailmix
- [ ] Docker deployment works on a single Hetzner CX33 (4vCPU/8GB) without OOM

**Go/no-go decision point:** After processing 5 real Trailhead modules end-to-end, evaluate quiz accuracy and content extraction quality. If accuracy < 70%, investigate knowledge retrieval before scaling.

### Future Vision

If the MVP proves the pipeline works:

- **Phase 5:** Full Next.js dashboard with real-time progress, knowledge explorer, concept graph visualization, quiz review interface
- **Phase 6:** Salesforce DX MCP integration for hands-on challenge automation, importing community solutions from artysta/salesforce-trailhead-solutions
- **Phase 7:** Cost optimization (Claude Batch API, prompt caching, model tiering), load testing at full Trailmix scale
- **Long-term:** The Salesforce knowledge database becomes a persistent AI coding assistant context — exportable as CLAUDE.md context, queryable by Claude Code, and enriched with Salesforce developer docs. Potentially generalizable to other learning platforms with similar structures
