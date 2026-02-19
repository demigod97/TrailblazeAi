# Project Reference — TrailBlazeAI

Reference tables and structural info. Loaded on-demand, not every session.

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
