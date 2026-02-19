# AGENTS.md — TrailBlazeAI Operational Knowledge

> This file accumulates patterns, commands, and guardrails discovered during implementation.
> Updated after each Ralph loop iteration. Start empty, populate as needed.

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

## Key File Locations

| File | Purpose |
|------|---------|
| `_bmad-output/implementation-artifacts/{story-key}.md` | Story files (single source of truth) |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Sprint tracking |
| `_bmad-output/planning-artifacts/architecture.md` | Architecture decisions (15 ADs, 23 patterns) |
| `_bmad-output/planning-artifacts/epics.md` | All epics and stories with ACs |
| `_bmad-output/project-context.md` | Tech stack, coding standards, patterns |
| `.ralph-plan.md` | Implementation order with dependencies |
| `.ralph-progress.md` | Cross-session memory and learnings |
| `AGENTS.md` | This file — operational knowledge |

## Established Code Patterns

### Pipeline Stage Functions
All pipeline stages follow a pure-function pattern:
```typescript
export async function stageName(
  input: StageInput,
  supabase: ReturnType<typeof createClient>,
): Promise<void>
```
Reference: `apps/api/src/pipeline/stages/extract-content.ts`

### Supabase Structural Types
Use structural types to avoid generated-type lag:
```typescript
type PipelineClient = {
  from(table: string): {
    select(cols: string): { eq(col: string, val: string): Promise<{ data: unknown[] | null; error: { message: string } | null }> };
    update(data: Record<string, unknown>): { eq(col: string, val: string): Promise<{ error: { message: string } | null }> };
  };
};
const db = supabase as unknown as PipelineClient;
```

### Queue Handler Registration
```typescript
await (boss as unknown as BossWithWork).work(
  'queue-name',
  { teamSize: 5, teamConcurrency: 5 },
  async (job: BossJob) => { /* handler */ },
);
```
Reference: `apps/api/src/pipeline/queue-handlers.ts`

### AI SDK generateObject
```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
const { object } = await generateObject({
  model: anthropic('claude-haiku-4-5-20251001'),
  schema: zodSchema,
  prompt: builtPrompt,
  maxRetries: 1,
});
```

### Error Handling
- Pipeline stages: throw `PipelineError` from `../../lib/errors.js`
- API routes: use `ApiResponse` envelope (`ApiSuccess<T> | ApiError`)
- AppError hierarchy: `NotFoundError`, `ValidationError`, `PipelineError`

### YAML Prompt Loading
```typescript
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
const prompts = parseYaml(readFileSync(promptsPath, 'utf-8'));
```
Load at module level (not per-call) for performance.

### ESM Imports
Always use `.js` extensions in relative imports:
```typescript
import { identifyUnitConcepts } from './stages/identify-concepts.js';
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

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | kebab-case | `extract-content.ts` |
| Components | PascalCase | `ModuleRow.tsx` |
| Functions | camelCase | `extractUnitContent()` |
| Database fields | snake_case | `content_markdown` |
| API routes | kebab-case | `/api/trailmix/import` |
| Test files | co-located `*.test.ts` | `extract-content.test.ts` |

## Testing Strategy (Git Worktrees)

Test completed stories without disrupting Ralph loop or dev environment:

```bash
# Create a test worktree from main branch
git worktree add ../TrailblazeAi-test main

# In the test worktree — install and run
cd ../TrailblazeAi-test
pnpm install
pnpm dev

# When done, remove worktree
cd ../TrailblazeAi
git worktree remove ../TrailblazeAi-test
```

Alternative: Use Docker compose for isolated testing:
```bash
cd docker && docker-compose up --build
```
