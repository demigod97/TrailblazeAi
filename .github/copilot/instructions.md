# TrailBlazeAI - GitHub Copilot Instructions

AI-powered Salesforce Trailhead completion assistant. Automates content extraction, knowledge building, and quiz answering.

## Architecture

- **Frontend:** Next.js 15 (App Router) on Vercel
- **Backend:** Fastify 5 in Docker on Hetzner VPS
- **Database:** Supabase (PostgreSQL)
- **AI:** Claude API via AI SDK v5
- **Browser Automation:** Playwright MCP
- **Job Queue:** pg-boss

## Monorepo Structure

```
apps/web/       -> Next.js 15, Tailwind v4, shadcn/ui
apps/api/       -> Fastify 5, pg-boss, AI SDK
packages/db/    -> Supabase client factory + generated types
packages/shared -> Domain types (Trailhead models) + constants
docker/         -> Compose + Dockerfiles
```

## TypeScript Patterns

- Strict mode is enabled. Never use `any` -- use `unknown` and narrow with type guards or Zod.
- `noUncheckedIndexedAccess` is enabled -- always handle potential `undefined` from index access.
- ESM everywhere: all packages use `"type": "module"`. Use `import`/`export`, not `require`.
- Use explicit return types on exported functions.
- Prefer `interface` for object shapes, `type` for unions and intersections.

## Zod Validation Patterns

- Validate all environment variables with Zod schemas (see `apps/api/src/config.ts` for reference).
- Validate all API request bodies and query parameters with Zod.
- Use `z.infer<typeof schema>` to derive TypeScript types from schemas.
- Validate external API responses before consuming them.

## Component Conventions (apps/web)

- Use shadcn/ui components from `apps/web/src/components/ui/` (new-york style).
- Components are built on radix-ui primitives.
- Use `@/*` import alias which maps to `src/` in apps/web.
- Keep page components in `app/` directory (App Router), shared components in `components/`.

## Tailwind CSS v4

- CSS-first configuration: styles are configured in CSS with `@import "tailwindcss"`, not in a `tailwind.config.ts` file.
- Use Tailwind utility classes directly; avoid custom CSS unless necessary.
- Follow the shadcn/ui theming approach with CSS custom properties.

## Fastify 5 Patterns (apps/api)

- Register plugins with `fastify.register()`.
- Use Zod schemas for request/response validation in route definitions.
- Environment config is Zod-validated at startup (see `apps/api/src/config.ts`).
- Job processing uses pg-boss for async work queues.

## Supabase Client Usage (packages/db)

- Browser client and server client are separate (see `apps/web/src/lib/supabase/`).
- Use the Supabase client factory from `packages/db`.
- Types are generated from the database schema.
- Use Row Level Security (RLS) where applicable.

## Key Commands

```bash
pnpm dev                              # Start all dev servers
pnpm build                            # Build all packages
pnpm type-check                       # TypeScript check all packages
pnpm --filter @trailblaze/web dev     # Next.js dev server only
pnpm --filter @trailblaze/api dev     # Fastify dev server only
```

## Important Paths

| Path | Purpose |
|------|---------|
| `apps/web/src/components/ui/` | shadcn/ui components |
| `apps/web/src/lib/supabase/` | Supabase client (browser + server) |
| `apps/api/src/config.ts` | Zod-validated environment config |
| `packages/shared/src/types/trailhead.ts` | Domain type definitions |
| `docker/docker-compose.yml` | Docker service definitions |

## BMAD V6 Protocol (MANDATORY)

This project uses the BMAD V6 framework for development governance. All code generation and suggestions MUST follow these rules.

### Key Artifacts

- Workflow status: `_bmad-output/planning-artifacts/bmm-workflow-status.yaml`
- Project context: `_bmad-output/planning-artifacts/project-context.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- PRD: `_bmad-output/planning-artifacts/PRD.md`

### Rules for Code Generation

1. **Respect the current phase** -- Check `bmm-workflow-status.yaml`. The project follows 4 phases: Analysis -> Planning -> Solutioning -> Implementation. Do not generate implementation code until the project reaches Implementation phase.
2. **Story-scoped changes only** -- When implementing, only write code for the assigned story's tasks/subtasks. Do not add extra features, utilities, or abstractions beyond the story scope.
3. **Architecture compliance** -- All generated code must follow patterns defined in `_bmad-output/planning-artifacts/architecture.md`. Check this file before suggesting architectural decisions.
4. **Test-first development** -- When generating new functionality, also generate corresponding test stubs. Follow the red-green-refactor cycle.
5. **Project context rules** -- Read `_bmad-output/planning-artifacts/project-context.md` for specific implementation constraints and patterns that must be followed.
6. **No fake tests** -- Never generate test code that simply passes without actually testing the behavior. Tests must verify real acceptance criteria.
