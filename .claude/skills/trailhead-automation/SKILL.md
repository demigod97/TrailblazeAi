---
name: trailhead-automation
description: Automate Salesforce Trailhead module completion using Playwright for content extraction, Claude for quiz answering, and Supabase for progress tracking. Use this skill when working on the core automation pipeline. BMAD-governed — requires approved story with acceptance criteria before implementation.
---

# Trailhead Automation Skill

## BMAD Protocol

**CRITICAL:** Before implementing any automation pipeline changes:

1. **Check workflow status** — Read `_bmad-output/planning-artifacts/bmm-workflow-status.yaml` to confirm project is in Implementation phase
2. **Story file is single source of truth** — Only implement what is described in the assigned story's tasks/subtasks
3. **Load project-context.md** — Read `_bmad-output/planning-artifacts/project-context.md` for implementation rules and patterns
4. **Red-green-refactor** — Write failing test first, then implementation, then refactor
5. **Mark tasks complete** — Only mark [x] when BOTH implementation AND tests pass
6. **Run full test suite** — After each task, never proceed with failing tests

## Pipeline Steps

1. **Content Extraction** — Use Playwright MCP to navigate Trailhead pages and extract module content
2. **Knowledge Building** — Process extracted content through Claude API to build structured knowledge entries
3. **Quiz Answering** — Analyze quiz questions against knowledge base to determine correct answers
4. **Progress Tracking** — Record completion status in Supabase database

## Key Architecture

- Browser automation via `@playwright/mcp` MCP server
- Content stored in Supabase `modules`, `units`, `knowledge_entries` tables
- Quiz answers processed through AI SDK v5 with Claude
- Job queue managed by pg-boss in the API service

## Implementation References

- **PRD:** `_bmad-output/planning-artifacts/prd.md` — Requirements and success criteria
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md` — Technical decisions and patterns
- **UX Spec:** `_bmad-output/planning-artifacts/ux-design-specification.md` — UI/UX requirements

## Commands

```bash
pnpm --filter @trailblaze/api dev    # Start the API server (handles job processing)
pnpm --filter @trailblaze/web dev    # Start the web dashboard
```

## Important Files

- `apps/api/src/` — Backend processing pipeline
- `apps/web/src/` — Progress dashboard
- `packages/db/` — Supabase client and types
- `packages/shared/src/types/trailhead.ts` — Domain types
