# TrailBlazeAI

AI-powered Salesforce Trailhead completion assistant. Automates content extraction, knowledge building, and quiz answering to complete 100+ hours of Trailhead content in 2-3 days.

## Architecture

- **Frontend:** Next.js 15 (App Router) on Vercel — progress dashboard, quiz results, knowledge base viewer
- **Backend:** Fastify 5 in Docker on Hetzner VPS — content scraping, AI processing, job queue
- **Database:** Supabase (PostgreSQL) — modules, units, quizzes, knowledge entries, progress tracking
- **AI:** Claude API via AI SDK v5 — content analysis, quiz answering, knowledge synthesis
- **Browser Automation:** Playwright MCP — Trailhead content extraction, quiz interaction
- **Job Queue:** pg-boss — async content processing pipeline

## Monorepo Structure

```
apps/
  web/          → Next.js 15, Tailwind v4, shadcn/ui (Vercel)
  api/          → Fastify 5, pg-boss, AI SDK (Docker/VPS)
packages/
  db/           → Supabase client factory + generated types
  shared/       → Domain types (Trailhead models) + constants
docker/         → Compose + Dockerfiles for API + Worker
_bmad/          → BMAD V6 framework (agents, workflows)
_bmad-output/   → Planning artifacts, research docs, project context
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
- **Imports:** Use `@/*` alias in apps/web for src/ imports
- **Styling:** Tailwind CSS v4 (CSS-first config, `@import "tailwindcss"`)
- **Components:** shadcn/ui (new-york style, radix-ui primitives)
- **Formatting:** Prettier (default config)

## BMAD Reference

- Framework at `_bmad/` — agents, workflows, templates
- Config: `_bmad/bmm/config.yaml`
- Output: `_bmad-output/planning-artifacts/`
- Workflow status: `_bmad-output/planning-artifacts/bmm-workflow-status.yaml`
- Use `/bmad:bmm:workflows:workflow-status` to check current phase

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

## AI Tool Configurations

| Directory | Tool | Purpose |
|-----------|------|---------|
| `.claude/` | Claude Code CLI | MCP servers, settings, skills, slash commands (BMAD V6) |
| `.github/workflows/` | GitHub Actions | CI pipeline, Claude Code Action for PR review (uses Haiku for cost) |
| `.github/agents/` | GitHub Copilot Agents | BMAD V6 agent personas for Copilot |
| `.github/copilot/` | GitHub Copilot | Project-specific instructions for code completion |
| `.agent/` | OpenAI Codex | Instructions and BMAD workflows for Codex |
| `.gemini/` | Google Gemini CLI | Settings, instructions, BMAD commands |
| `docs/guides/` | Developer Guides | Guides for each AI tool (Claude CLI, Web, Codex, Gemini, Copilot) |

## Skills & MCP Servers

- **Playwright MCP** — Browser automation for Trailhead interaction
- **Supabase MCP** — Direct database operations
- **Sequential Thinking MCP** — Complex multi-step reasoning
- **Filesystem MCP** — File system operations
- **Custom Skills** — `.claude/skills/trailhead-automation/` and `.claude/skills/code-quality/`

## Environment Variables

See `.env.example` for all required variables:
- Supabase (URL, anon key, service role key, access token)
- Anthropic API key
- VPS API bearer token
- Salesforce credentials
- Playwright config
