# AGENTS.md — TrailBlazeAI Operational Knowledge

## Build & Test Commands

```bash
pnpm --filter @trailblaze/api test     # Run API tests (Vitest)
pnpm --filter @trailblaze/web test     # Run web tests (Vitest)
pnpm type-check                        # TypeScript strict check all packages
pnpm build                             # Build all packages
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

## AI SDK Version Alignment (Story 3-2)

`ai@6` uses V3 provider protocol. Matching provider packages:
- `@ai-sdk/anthropic@^3` — used for `generateObject()` / `generateText()`
- `@ai-sdk/openai@^2` — use for `embedMany()` with `openai.embedding()` (NOT `^1` which is V1/incompatible)

With `@ai-sdk/openai@^2`, `openai.embedding()` returns `EmbeddingModelV2<string>` which is in `ai@6`'s `EmbeddingModel` union — **no cast required**. Using `^1` causes a V1/V2 mismatch silenced only by `as unknown as any`.

## Supabase UPDATE Patterns (Story 5-1)

- `supabase.from('table').update(data).eq(...)` does NOT return row data — `data` is always `null`. To return updated rows, re-fetch after update: `await update(); const { data } = await select('*');`
- Bulk UPDATE with filters: use `.eq('col', val)` for matching rows, `.neq('col', val)` for non-matching, `.not('col', 'is', null)` to match all rows. This replaces N+1 loops.
- For run-status queries that need to match multiple values: use `.in('status', ['active', 'paused'])` — more robust than single `.eq('status', 'active')` which misses already-paused runs during cancel/resume.

## RSC Testing Pattern (Story 5-1)

- To test async Next.js Server Components: `const jsx = await MyPage(); render(jsx);` — call the component function directly and render the result. This avoids async rendering complexity.
- Mock `global.fetch` for Server Component tests that call external APIs: `global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });`
- shadcn Switch renders as `<button role="switch" aria-checked="true|false">` — query via `getAllByRole('switch')` and assert `aria-checked` attribute.
- shadcn AlertDialog renders with `role="alertdialog"` when open — use `within(getByRole('alertdialog')).getByRole('button', ...)` to target buttons inside the dialog.
