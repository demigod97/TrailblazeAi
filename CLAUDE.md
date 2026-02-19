# TrailBlazeAI

AI-powered Salesforce Trailhead completion assistant. Automates content extraction, knowledge building, and quiz answering to complete 100+ hours of Trailhead content in 2-3 days.

## Architecture

- **Frontend:** Next.js 15 (App Router) on Vercel — progress dashboard, quiz results, knowledge base viewer
- **Backend:** Fastify 5 in Docker on Hetzner VPS — content scraping, AI processing, job queue
- **Database:** Supabase (PostgreSQL) — modules, units, quizzes, knowledge entries, progress tracking
- **AI:** Claude API via AI SDK v5 — content analysis, quiz answering, knowledge synthesis
- **Browser Automation:** Playwright MCP — Trailhead content extraction, quiz interaction
- **Job Queue:** pg-boss — async content processing pipeline

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

For monorepo structure, important paths, AI tool configs, MCP servers, and env vars, see `.claude/rules/project-reference.md`.

## BMAD V6 Protocol (MANDATORY)

This project is governed by the BMAD V6 workflow framework. **All agents, tools, and AI assistants MUST follow these protocols.**

### Phase Gate Enforcement

The project follows 4 sequential phases. Never skip ahead:

1. **Analysis** — Research, brainstorming, product brief
2. **Planning** — PRD, UX design specification
3. **Solutioning** — Architecture, epics & stories, implementation readiness check
4. **Implementation** — Sprint planning, story execution, code review, retrospective

Check current phase: `/bmad:bmm:workflows:workflow-status` or read `_bmad-output/planning-artifacts/bmm-workflow-status.yaml`

### Activation Protocol

Before starting any task:

1. **Read workflow status** — `_bmad-output/planning-artifacts/bmm-workflow-status.yaml`
2. **Load project context** — `_bmad-output/planning-artifacts/project-context.md`
3. **Load architecture** — `_bmad-output/planning-artifacts/architecture.md`
4. **Load config** — `_bmad/bmm/config.yaml` (project name, user, paths)

### Implementation Rules (Phase 4 Only)

1. **Story is single source of truth** — Only implement tasks/subtasks from the assigned story file. No scope creep.
2. **Red-green-refactor** — Write failing test → implement to pass → refactor. This cycle is mandatory.
3. **Honest completion** — Mark tasks `[x]` only when BOTH implementation AND tests pass. Never lie about test results.
4. **Full test suite** — Run all tests after each task. Never proceed with failing tests.
5. **Architecture compliance** — All code must follow patterns in `architecture.md`.

### Code Review Protocol

1. **Adversarial review** — Find 3-10 specific problems per review. NEVER accept "looks good."
2. **Story compliance** — Verify implementation matches story acceptance criteria exactly.
3. **Test verification** — Confirm tests exist and pass 100%. Never assume.

### BMAD File Locations

| Path | Purpose |
|------|---------|
| `_bmad/` | Framework — agents, workflows, templates |
| `_bmad/bmm/config.yaml` | Project configuration |
| `_bmad-output/planning-artifacts/` | All planning outputs |
| `_bmad-output/planning-artifacts/bmm-workflow-status.yaml` | Current phase/status |
| `_bmad-output/planning-artifacts/project-context.md` | Implementation rules |
| `_bmad-output/planning-artifacts/architecture.md` | Architecture decisions |
| `_bmad-output/planning-artifacts/PRD.md` | Product requirements |
| `_bmad-output/planning-artifacts/ux-design-specification.md` | UX specification |
