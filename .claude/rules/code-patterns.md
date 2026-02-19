# Code Patterns — TrailBlazeAI

Detailed TypeScript patterns accumulated during implementation. Referenced from `AGENTS.md`.

## Pipeline Stage Functions

All pipeline stages follow a pure-function pattern:
```typescript
export async function stageName(
  input: StageInput,
  supabase: ReturnType<typeof createClient>,
): Promise<void>
```
Reference: `apps/api/src/pipeline/stages/extract-content.ts`

## Supabase Structural Types

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

## Queue Handler Registration

```typescript
await (boss as unknown as BossWithWork).work(
  'queue-name',
  { teamSize: 5, teamConcurrency: 5 },
  async (job: BossJob) => { /* handler */ },
);
```
Reference: `apps/api/src/pipeline/queue-handlers.ts`

## AI SDK generateObject

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

## Error Handling

- Pipeline stages: throw `PipelineError` from `../../lib/errors.js`
- API routes: use `ApiResponse` envelope (`ApiSuccess<T> | ApiError`)
- AppError hierarchy: `NotFoundError`, `ValidationError`, `PipelineError`

## YAML Prompt Loading

```typescript
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
const prompts = parseYaml(readFileSync(promptsPath, 'utf-8'));
```
Load at module level (not per-call) for performance.

## ESM Imports

Always use `.js` extensions in relative imports:
```typescript
import { identifyUnitConcepts } from './stages/identify-concepts.js';
```

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
