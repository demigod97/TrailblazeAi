# TrailBlazeAI - Agent Instructions

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

## Code Conventions (MUST FOLLOW)

- **TypeScript:** Strict mode enabled. Never use `any`. `noUncheckedIndexedAccess` is enabled.
- **Module system:** ESM everywhere. All packages use `"type": "module"`.
- **Validation:** Use Zod for all external data boundaries (environment variables, API request/response bodies, form inputs).
- **Imports:** Use `@/*` path alias in `apps/web` which maps to `src/`.
- **Styling:** Tailwind CSS v4 with CSS-first configuration (`@import "tailwindcss"` in CSS, not `tailwind.config.ts`).
- **Components:** shadcn/ui with new-york style, built on radix-ui primitives.
- **Formatting:** Prettier with default configuration.

## BMAD V6 Workflow Framework

The project uses the BMAD V6 framework for planning and workflow management:

- Framework location: `_bmad/` -- contains agents, workflows, and templates
- Configuration: `_bmad/bmm/config.yaml`
- Output artifacts: `_bmad-output/planning-artifacts/`
- Workflow status: `_bmad-output/planning-artifacts/bmm-workflow-status.yaml`
- Planning research: `_bmad-output/planning-artifacts/research/`
- Product brief: `_bmad-output/planning-artifacts/product-brief.md`
- PRD: `_bmad-output/planning-artifacts/PRD.md`

When working on planning or architecture tasks, consult the BMAD artifacts for context.

## Important Paths

| Path | Purpose |
|------|---------|
| `apps/web/src/components/ui/` | shadcn/ui components |
| `apps/web/src/lib/supabase/` | Supabase client (browser + server) |
| `apps/api/src/config.ts` | Zod-validated environment config |
| `packages/shared/src/types/trailhead.ts` | Domain type definitions |
| `docker/docker-compose.yml` | Docker service definitions |

## Environment Variables

See `.env.example` for all required variables:
- Supabase (URL, anon key, service role key, access token)
- Anthropic API key
- VPS API bearer token
- Salesforce credentials
- Playwright config
