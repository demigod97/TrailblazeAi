# AGENTS.md — TrailBlazeAI Operational Knowledge

## Build & Test Commands

```bash
pnpm test                              # Run all tests (Vitest)
pnpm type-check                        # TypeScript strict check all packages
pnpm build                             # Build all packages
pnpm --filter @trailblaze/api test     # API tests only
pnpm --filter @trailblaze/web test     # Web tests only
pnpm dev                               # Start all dev servers (turbo)
pnpm --filter @trailblaze/web dev      # Next.js dev server only
pnpm --filter @trailblaze/api dev      # Fastify dev server only (tsx watch)
```

## Guardrails

- **NEVER** use `any` type — use `unknown` + Zod parsing or type narrowing
- **NEVER** modify files outside the current story's scope
- **NEVER** mark tasks `[x]` without running and passing tests
- **NEVER** skip the RED phase — a failing test MUST exist before implementation
- **ALWAYS** use `as unknown as TargetType` for structural casts (never `as any`)
- **ALWAYS** run full test suite between stories
- **ALWAYS** commit after completing a story (before starting the next one)

## Naming Conventions

- Files: `kebab-case.ts` | Components: `PascalCase.tsx` | Functions: `camelCase()` | DB fields: `snake_case` | API routes: `kebab-case` | Tests: co-located `*.test.ts`

## Code Patterns

For detailed TypeScript patterns (pipeline stages, Supabase types, queue handlers, AI SDK, error handling, ESM imports, testing strategy), see `.claude/rules/code-patterns.md`.
