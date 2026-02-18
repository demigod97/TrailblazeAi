# TrailBlazeAI

AI-powered Salesforce Trailhead completion assistant. Automates content extraction, knowledge building, and quiz answering to complete 100+ hours of Trailhead content in 2-3 days.

## Architecture

- **Frontend:** Next.js 15 (App Router) on Vercel -- progress dashboard, quiz results, knowledge base viewer
- **Backend:** Fastify 5 in Docker on Hetzner VPS -- content scraping, AI processing, job queue
- **Database:** Supabase (PostgreSQL) -- modules, units, quizzes, knowledge entries, progress tracking
- **AI:** Claude API via AI SDK v5 -- content analysis, quiz answering, knowledge synthesis
- **Browser Automation:** Playwright MCP -- Trailhead content extraction, quiz interaction
- **Job Queue:** pg-boss -- async content processing pipeline

## Monorepo Structure

```
apps/
  web/          -> Next.js 15, Tailwind v4, shadcn/ui (Vercel)
  api/          -> Fastify 5, pg-boss, AI SDK (Docker/VPS)
packages/
  db/           -> Supabase client factory + generated types
  shared/       -> Domain types (Trailhead models) + constants
docker/         -> Compose + Dockerfiles for API + Worker
_bmad/          -> BMAD V6 framework (agents, workflows)
_bmad-output/   -> Planning artifacts, research docs, project context
```

## Key Commands

```bash
pnpm dev            # Start all dev servers (turbo)
pnpm build          # Build all packages
pnpm type-check     # TypeScript check all packages
pnpm clean          # Clean build artifacts

# Individual apps
pnpm --filter @trailblaze/web dev    # Next.js dev server
pnpm --filter @trailblaze/api dev    # Fastify dev server (tsx watch)
```

## Code Conventions

- **TypeScript:** Strict mode, no `any`, `noUncheckedIndexedAccess` enabled
- **Module system:** ESM everywhere (`"type": "module"`)
- **Validation:** Zod for all external data (env vars, API inputs)
- **Imports:** Use `@/*` alias in `apps/web` for `src/` imports
- **Styling:** Tailwind CSS v4 (CSS-first config, `@import "tailwindcss"`)
- **Components:** shadcn/ui (new-york style, radix-ui primitives)
- **Formatting:** Prettier (default config)

## Important Paths

| Path | Purpose |
|------|---------|
| `_bmad-output/planning-artifacts/research/` | Architecture blueprint + action plan |
| `_bmad-output/planning-artifacts/product-brief.md` | Product brief |
| `_bmad-output/planning-artifacts/PRD.md` | Product requirements document |
| `apps/web/src/components/ui/` | shadcn/ui components |
| `apps/web/src/lib/supabase/` | Supabase client (browser + server) |
| `apps/api/src/config.ts` | Zod-validated environment config |
| `packages/shared/src/types/trailhead.ts` | Domain type definitions |
| `docker/docker-compose.yml` | Docker service definitions |

## BMAD V6 Protocol (MANDATORY)

This project is governed by the BMAD V6 framework. All agents and tools MUST follow these protocols.

### File Locations

- Framework: `_bmad/` -- agents, workflows, templates
- Config: `_bmad/bmm/config.yaml`
- Output: `_bmad-output/planning-artifacts/`
- Workflow status: `_bmad-output/planning-artifacts/bmm-workflow-status.yaml`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- PRD: `_bmad-output/planning-artifacts/PRD.md`

### Activation Protocol

Before starting any task:

1. **Check workflow status** -- Read `bmm-workflow-status.yaml` to determine current phase
2. **Respect phase gates** -- 4 phases: Analysis -> Planning -> Solutioning -> Implementation. Never skip ahead.
3. **Load project context** -- Read `project-context.md` for implementation rules and constraints

### Implementation Rules

1. **Story is single source of truth** -- Only implement what the assigned story describes. No scope creep.
2. **Red-green-refactor** -- Write failing test first, then implementation, then refactor. Mandatory cycle.
3. **Honest task completion** -- Mark tasks `[x]` only when BOTH implementation AND tests pass. Never fake test results.
4. **Full test suite** -- Run all tests after each task. Never proceed with failures.
5. **Architecture compliance** -- All patterns must match `architecture.md`

### Code Review Rules

1. **Adversarial review** -- Find 3-10 specific problems per review. Never accept "looks good."
2. **Story compliance** -- Verify implementation matches story acceptance criteria exactly.
3. **Test verification** -- Confirm tests exist and pass 100%. Never assume.

## Environment Variables

See `.env.example` for all required variables:
- Supabase (URL, anon key, service role key, access token)
- Anthropic API key
- VPS API bearer token
- Salesforce credentials
- Playwright config
