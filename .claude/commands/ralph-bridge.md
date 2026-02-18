---
description: 'Parse BMAD epics and stories into a .ralph-plan.md file for Ralph loop execution. Generates implementation plan with model routing, dependency tracking, and architecture context from Phase 3 artifacts.'
---

# Ralph Bridge: BMAD → Ralph Plan Generator

Generate a `.ralph-plan.md` file at the project root from BMAD V6 planning artifacts.

## Prerequisites Check

1. Read `_bmad-output/planning-artifacts/bmm-workflow-status.yaml`
2. Verify that Phase 3 (Solutioning) is complete:
   - `create-architecture` has a file path status
   - `create-epics-and-stories` has a file path status
   - `implementation-readiness` has a file path status
3. If Phase 3 is NOT complete: **STOP** and report which steps are missing

## Input Documents

Read these files completely:

1. `_bmad-output/planning-artifacts/epics.md` — Primary source: all epics and stories with acceptance criteria
2. `_bmad-output/planning-artifacts/architecture.md` — Extract key decisions summary
3. The most recent `_bmad-output/planning-artifacts/implementation-readiness-report-*.md` — Verify READY status (use glob to find latest; there may be multiple dated files — read the most recently modified one)
4. `_bmad-output/project-context.md` — Technology stack and conventions

## Plan Generation Rules

### Story Key Format
Convert story titles to kebab-case keys:
- `Story 1.1: API Foundation & Docker Deployment` → `1-1-api-foundation-and-docker-deployment`
- `Story 2.3: Pipeline Concurrency & Retry Management` → `2-3-pipeline-concurrency-and-retry-management`
- Pattern: `{epic}-{story}-{title-in-kebab-case}`

### Model Tier Assignments

Assign based on story complexity:

**haiku** (default — routine implementation):
- Standard CRUD operations
- UI components following existing patterns
- Database queries and migrations
- Test writing
- Configuration and boilerplate

**sonnet** (complex reasoning required):
- Stories involving AI agent logic (chain-of-thought, confidence scoring)
- Complex integration logic between multiple services
- Stories where the acceptance criteria require nuanced decision-making

**opus escalation flag** (cross-cutting concerns):
- Stories involving Docker infrastructure setup
- Stories requiring MCP integration patterns
- Stories with complex SQL functions (hybrid search)
- Stories where architecture decisions need validation

### Dependency Mapping

Map dependencies based on the epic structure and acceptance criteria:

**Epic 1 (sequential):** 1.1 → 1.2 → 1.3 → 1.4
**Epic 2:** 2.1 → {2.2, 2.3, 2.4} (2.2/2.3/2.4 depend only on 2.1; ralph-run executes serially for safety — one story at a time)
**Epic 3 (sequential):** 3.1 → 3.2 → 3.3 → 3.4 → 3.5
**Epic 4 (sequential):** 4.1 → 4.2 → 4.3
**Epic 5 (sequential):** 5.1 → 5.2

**Cross-epic dependencies:**
- Epic 2 requires Epic 1 complete (API foundation, auth, database schema)
- Epic 3 requires Epic 2 stories 2.1-2.2 complete (content to process)
- Epic 4 requires Epic 3 stories 3.1-3.4 complete (knowledge base for quiz context)
- Epic 5 requires Epic 1 + Epic 2 complete (pipeline infrastructure)

## Output: .ralph-plan.md

Write the file to the project root (`.ralph-plan.md`):

```markdown
# Ralph Implementation Plan — TrailBlazeAI

Generated: [current date]
Source: _bmad-output/planning-artifacts/epics.md
BMAD Phase: 4 (Implementation)
Total Stories: 18
Total Epics: 5

## Architecture Context Summary

[Summarize the 5 most critical architecture decisions that affect implementation:
- Deployment architecture (Vercel + VPS + Supabase)
- API patterns (Fastify + ApiResponse envelope + AppError hierarchy)
- Database patterns (Supabase, pgvector, snake_case)
- Browser automation (Playwright MCP + Stagehand fallback)
- Job queue (pg-boss queue-per-stage)]

## Technology Stack Quick Reference

- Frontend: Next.js 15 (App Router, RSC) + Tailwind v4 + shadcn/ui
- Backend: Fastify 5 (ESM) + pg-boss 10
- Database: Supabase (PostgreSQL + pgvector + Realtime)
- AI: Vercel AI SDK v5 + Anthropic provider
- Browser: Playwright MCP (stdio transport)
- Language: TypeScript 5.7 strict, ESM everywhere
- Tests: Vitest (unit/integration), Playwright (E2E)

## Implementation Order

### Sprint 1: Foundation (Epic 1)
- [ ] 1-1-api-foundation-and-docker-deployment [model: haiku] [escalation: opus] [depends: none]
- [ ] 1-2-frontend-shell-and-authentication [model: haiku] [depends: 1-1]
- [ ] 1-3-trailmix-import-and-module-discovery [model: haiku] [depends: 1-2]
- [ ] 1-4-real-time-module-status-dashboard [model: haiku] [depends: 1-3]

### Sprint 2: Content Extraction (Epic 2)
- [ ] 2-1-playwright-mcp-integration-and-browser-session-management [model: haiku] [escalation: opus] [depends: 1-4]
- [ ] 2-2-unit-content-extraction-pipeline [model: haiku] [depends: 2-1]
- [ ] 2-3-pipeline-concurrency-and-retry-management [model: haiku] [depends: 2-1]
- [ ] 2-4-session-expiry-detection-and-recovery [model: haiku] [depends: 2-1]

### Sprint 3: Knowledge Processing (Epic 3)
- [ ] 3-1-content-chunking-with-salesforce-specific-rules [model: haiku] [depends: 2-2]
- [ ] 3-2-embedding-generation-and-vector-storage [model: haiku] [depends: 3-1]
- [ ] 3-3-concept-relationship-mapping [model: haiku] [depends: 3-2]
- [ ] 3-4-hybrid-search-and-knowledge-api [model: haiku] [escalation: opus] [depends: 3-2]
- [ ] 3-5-knowledge-base-ui-with-global-search [model: haiku] [depends: 3-4]

### Sprint 4: Quiz Automation (Epic 4)
- [ ] 4-1-quiz-agent-with-chain-of-thought-reasoning [model: sonnet] [depends: 3-4]
- [ ] 4-2-quiz-review-panel-with-approve-edit-workflow [model: haiku] [depends: 4-1]
- [ ] 4-3-answer-submission-and-badge-tracking [model: haiku] [depends: 4-2]

### Sprint 5: Pipeline Operations (Epic 5)
- [ ] 5-1-pipeline-configuration-and-run-control [model: haiku] [depends: 1-4, 2-3]
- [ ] 5-2-aggregated-progress-and-cost-tracking [model: haiku] [depends: 5-1]

## BMAD Compliance Rules

1. **Story is single source of truth** — Only implement tasks/subtasks from the assigned story file
2. **Red-green-refactor mandatory** — Write failing test → implement to pass → refactor
3. **Honest completion** — Mark tasks [x] ONLY when implementation AND tests pass
4. **Full test suite** — Run all tests after each task, never proceed with failing tests
5. **Architecture compliance** — All code follows patterns in architecture.md
6. **Adversarial review** — Reviewer must find 3-10 issues minimum per story
7. **No scope creep** — Never implement outside assigned story tasks
8. **No `any` types** — Use `unknown` + Zod parsing or type narrowing

## Status Legend

- `[ ]` — Pending (not started)
- `[~]` — In Progress (currently being implemented)
- `[x]` — Done (implemented, QA passed, review passed)
- `[!]` — Blocked (needs human intervention or architecture decision)

## Completion

When all stories are marked [x]:
<promise>RALPH_BMAD_COMPLETE</promise>

When all remaining stories are [!]:
<promise>RALPH_BMAD_BLOCKED</promise>
```

After generating the file, output: `Ralph plan generated at .ralph-plan.md with [N] stories across [N] sprints.`
