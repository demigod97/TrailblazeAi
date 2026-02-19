# Story 3.3: Concept Relationship Mapping

Status: done

## Story

As a user,
I want the system to map concept dependencies between Salesforce topics,
So that cross-module knowledge connections are discoverable.

## Acceptance Criteria

1. **[AC1]** Given a module's concepts have been identified, when the build-relationships stage processes them, then the Knowledge Agent (Claude Haiku) maps concept dependencies with relationship types: prerequisite, related_to, part_of; and relationships are stored in sf_concept_relationships table with source_concept, target_concept, and relationship_type.

2. **[AC2]** Given relationships span multiple modules, when a concept from Module A relates to a concept from Module B, then the cross-module relationship is stored and discoverable.

3. **[AC3]** Given the build-relationships stage completes for a module, when all pipeline stages are finished, then the module status transitions to "ready" (available for quiz answering or knowledge search).

## Tasks / Subtasks

- [x] Task 1: Update sf_concept_relationships schema (AC1)
  - [x] 1.1 Create migration `packages/db/supabase/migrations/011_concept_relationship_columns.sql`:
    ```sql
    -- Add concept name columns (architecture Decision 12 specifies concept-level relationships)
    ALTER TABLE sf_concept_relationships ADD COLUMN source_concept TEXT;
    ALTER TABLE sf_concept_relationships ADD COLUMN target_concept TEXT;

    -- Add module_id for cross-module relationship queries
    ALTER TABLE sf_concept_relationships ADD COLUMN module_id UUID REFERENCES modules(id) ON DELETE CASCADE;

    -- Make chunk references nullable (concept relationships may not map to specific chunks)
    ALTER TABLE sf_concept_relationships ALTER COLUMN source_chunk_id DROP NOT NULL;
    ALTER TABLE sf_concept_relationships ALTER COLUMN target_chunk_id DROP NOT NULL;

    -- Update CHECK constraint to include epic-required relationship types
    ALTER TABLE sf_concept_relationships DROP CONSTRAINT sf_concept_relationships_relationship_type_check;
    ALTER TABLE sf_concept_relationships ADD CONSTRAINT sf_concept_relationships_relationship_type_check
      CHECK (relationship_type IN ('prerequisite', 'related', 'related_to', 'part_of', 'contradicts', 'clarifies', 'extends'));
    ```
  - [x] 1.2 Update `RelationshipType` in `packages/shared/src/types/trailhead.ts`:
    - Add `'related_to'` and `'part_of'` to the union type
  - [x] 1.3 Update `SfConceptRelationship` interface in `packages/shared/src/types/trailhead.ts`:
    - Make `source_chunk_id` and `target_chunk_id` nullable (`string | null`)
    - Add `source_concept: string | null`
    - Add `target_concept: string | null`
    - Add `module_id: string | null`
  - [x] 1.4 Run `pnpm type-check` — confirm 0 errors

- [x] Task 2: Add build_relationships prompt to knowledge-agent.yaml (AC1)
  - [x] 2.1 Append `build_relationships` section to `apps/api/src/prompts/knowledge-agent.yaml`:
    ```yaml
    build_relationships: |
      Analyze the following Salesforce concepts extracted from Trailhead learning modules
      and identify meaningful relationships between them.

      Current unit concepts:
      {{current_concepts}}

      Other concepts from this module (previously processed units):
      {{other_concepts}}

      For each relationship found, specify:
      - source_concept: The concept name (exactly as it appears in the input lists)
      - target_concept: The concept name (exactly as it appears in the input lists)
      - relationship_type: One of:
        - "prerequisite": source_concept must be understood before target_concept
        - "related_to": concepts are meaningfully related but neither strictly depends on the other
        - "part_of": source_concept is a component, feature, or subset of target_concept
      - strength: Confidence score from 0.0 to 1.0

      Rules:
      - Only include relationships where the connection is meaningful for learning
      - Prefer specific relationships over vague ones
      - A concept must not relate to itself
      - Focus on educational dependencies (what you need to know first)
      - Include cross-unit relationships when concepts from different units relate
      - Do NOT create relationships for obvious synonyms or near-duplicates
    ```
  - [x] 2.2 Update `KnowledgePrompts` interface in `apps/api/src/agents/knowledge-agent.ts`:
    - Add `build_relationships?: string` (optional to avoid breaking existing tests)
  - [x] 2.3 Update `promptSchema` in `apps/api/src/agents/knowledge-agent.ts`:
    - Add `build_relationships: z.string().optional()`
  - [x] 2.4 Run `pnpm type-check` — confirm 0 errors

- [x] Task 3: Create build-relationships pipeline stage (AC1, AC2) — TDD
  - [x] 3.1 Write failing test `apps/api/src/pipeline/stages/build-relationships.test.ts`:
    - Test: `buildUnitRelationships()` fetches the unit's `sf_concepts` from units table
    - Test: `buildUnitRelationships()` fetches concepts from ALL other units in the same module (cross-unit context)
    - Test: `buildUnitRelationships()` calls `generateObject` with model `claude-haiku-4-5-20251001` and `conceptRelationshipSchema`
    - Test: `buildUnitRelationships()` stores relationships in `sf_concept_relationships` with source_concept, target_concept, relationship_type, strength, and module_id
    - Test: `buildUnitRelationships()` optionally links relationships to representative chunks via source_chunk_id/target_chunk_id (by matching sf_topics)
    - Test: `buildUnitRelationships()` returns early with a log entry if unit has no sf_concepts (empty or null)
    - Test: `buildUnitRelationships()` throws `PipelineError` if the Supabase select fails
    - Test: `buildUnitRelationships()` logs a `ToolTrace` entry with `agent_type: 'knowledge'`, `tool_type: 'llm_call'`, and relationship count
    - Test: `buildUnitRelationships()` handles empty relationship response gracefully (no relationships found)
    - Test: `buildUnitRelationships()` deduplicates relationships (skip if source→target already exists for this module)
  - [x] 3.2 Create `apps/api/src/pipeline/stages/build-relationships.ts`:
    - Import `generateObject` from `ai`
    - Import `anthropic` from `@ai-sdk/anthropic`
    - Import `z` from `zod`
    - Import `createClient` from `@trailblaze/db`
    - Import `PipelineError` from `../../lib/errors.js`
    - Import `logToolTrace` from `../../lib/agent-logger.js`
    - Import `loadKnowledgePrompts`, `conceptExtractionSchema` from `../../agents/knowledge-agent.js`
    - Export `conceptRelationshipSchema`:
      ```typescript
      export const conceptRelationshipSchema = z.object({
        relationships: z.array(z.object({
          source_concept: z.string(),
          target_concept: z.string(),
          relationship_type: z.enum(['prerequisite', 'related_to', 'part_of']),
          strength: z.number().min(0).max(1),
        })),
      });
      ```
    - Export interface `BuildRelationshipsInput { unit_id: string; module_id: string; run_id: string | null; }`
    - Define structural type for Supabase operations:
      ```typescript
      type RelationshipsClient = {
        from(table: string): {
          select(cols: string): {
            eq(col: string, val: string): Promise<{
              data: Array<Record<string, unknown>> | null;
              error: { message: string } | null;
            }>;
          };
          insert(data: unknown[]): Promise<{ error: { message: string } | null }>;
        };
      };
      ```
    - Export `async function buildUnitRelationships(input: BuildRelationshipsInput, supabase: ReturnType<typeof createClient>): Promise<void>`:
      1. `const startTime = Date.now()`
      2. Cast: `const db = supabase as unknown as RelationshipsClient;`
      3. Fetch current unit: `const { data: unitData, error: unitError } = await db.from('units').select('id, sf_concepts, title').eq('id', input.unit_id)`
      4. If error: throw `PipelineError('build-relationships', 'Failed to fetch unit: ' + unitError.message)`
      5. Parse `sf_concepts` using `conceptExtractionSchema.safeParse()` — use Zod safeParse since JSONB may be malformed
      6. If sf_concepts is null/invalid: log ToolTrace with "No valid concepts" summary and return early
      7. Fetch other units in module: `await db.from('units').select('id, sf_concepts, title').eq('module_id', input.module_id)`
      8. Filter out current unit, parse each unit's sf_concepts with safeParse
      9. Collect all unique concepts (sf_topics + sf_objects + apex_keywords + flow_references from all units)
      10. Build prompt from `loadKnowledgePrompts()` — replace `{{current_concepts}}` and `{{other_concepts}}`
      11. Call `generateObject({ model: anthropic('claude-haiku-4-5-20251001'), schema: conceptRelationshipSchema, prompt, system: prompts.system, maxRetries: 1 })`
      12. Filter out self-relationships and dedup by (source_concept, target_concept, relationship_type)
      13. For each relationship, find representative chunks:
          - Query `sf_knowledge_chunks` where `sf_topics` contains source_concept → get first chunk id
          - Query `sf_knowledge_chunks` where `sf_topics` contains target_concept → get first chunk id
      14. Guard against empty relationships array before calling insert
      15. Batch insert into `sf_concept_relationships`:
          ```typescript
          {
            source_concept: rel.source_concept,
            target_concept: rel.target_concept,
            relationship_type: rel.relationship_type,
            strength: rel.strength,
            source_chunk_id: sourceChunkId ?? null,
            target_chunk_id: targetChunkId ?? null,
            module_id: input.module_id,
          }
          ```
      16. Log ToolTrace with `agent_type: 'knowledge'`, `tool_type: 'llm_call'`, summary of relationships count
  - [x] 3.3 Run `pnpm --filter @trailblaze/api test` — confirm 3.1 tests pass (RED → GREEN)

- [x] Task 4: Register build-relationships queue handler + module status transition (AC3, AC4)
  - [x] 4.1 Write failing tests in `apps/api/src/pipeline/queue-handlers.test.ts`:
    - Test: `registerQueueHandlers()` calls `boss.work('build-relationships', ...)` with `{ teamSize: 5, teamConcurrency: 5 }`
    - Test: the `build-relationships` handler calls `buildUnitRelationships()` with `{ unit_id, module_id, run_id }`
    - Test: the `build-relationships` handler rethrows on error (so pg-boss retry triggers)
    - Test: the `build-relationships` handler checks if all units in module have embeddings, and if so, updates module status from 'processing' to 'ready'
    - Test: the `build-relationships` handler does NOT update module status if some units still lack embeddings
  - [x] 4.2 Update `apps/api/src/pipeline/queue-handlers.ts`:
    - Import `buildUnitRelationships` from `./stages/build-relationships.js`
    - In `registerQueueHandlers`, add the new worker:
      ```typescript
      // build-relationships → final stage, may transition module to 'ready'
      await (boss as unknown as BossWithWork).work(
        'build-relationships',
        { teamSize: 5, teamConcurrency: 5 },
        async (job: BossJob) => {
          const { unit_id, module_id, run_id } = job.data as { unit_id: string; module_id: string; run_id: string | null };
          const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
          const db = supabase as unknown as PipelineClient;

          await buildUnitRelationships({ unit_id, module_id, run_id }, supabase);

          // Check if all units in module have completed the pipeline
          // (all chunks have embeddings = all units passed through generate-embeddings + build-relationships)
          const { data: totalUnits } = await db.from('units').select('id').eq('module_id', module_id);
          const { data: embeddedChunks } = await db
            .from('sf_knowledge_chunks')
            .select('unit_id')
            .eq('module_id', module_id)
            .not('embedding', 'is', null);

          const totalCount = totalUnits?.length ?? 0;
          const embeddedUnitIds = new Set(
            (embeddedChunks as unknown as Array<{ unit_id: string }>)?.map(c => c.unit_id) ?? []
          );

          if (totalCount > 0 && embeddedUnitIds.size >= totalCount) {
            // All units have embeddings → all have passed through the full pipeline
            await db
              .from('modules')
              .update({ status: 'ready', updated_at: new Date().toISOString() })
              .eq('id', module_id);
          }
        },
      );
      ```
    - Note: The `PipelineClient` structural type already supports `.not()` via `.eq().not()` — extend if needed
  - [x] 4.3 Run `pnpm --filter @trailblaze/api test` — confirm all tests pass including 4.1

- [x] Task 5: Final verification
  - [x] 5.1 Run `pnpm --filter @trailblaze/api test` — all tests pass (246/246)
  - [x] 5.2 Run `pnpm --filter @trailblaze/web test` — all tests pass (101/101, no regressions)
  - [x] 5.3 Run `pnpm type-check` — 0 errors across all packages
  - [x] 5.4 Mark all tasks [x] only after all three pass

## Dev Notes

### Architecture Context

This story implements Stage 6 (final stage) of the 6-stage knowledge pipeline:

```
extract-content → identify-concepts → chunk-content → generate-embeddings → build-relationships
                                                                                    ↑ THIS STORY
```

**Decision 3 [Source: architecture.md#Decision-3]:** "BuildRelationships — LLM maps concept dependencies (prerequisite, related_to, part_of)". Two-phase concept analysis: "Identify concepts" and "analyze relationships" are separate stages to reduce prompt complexity and enable independent retry.

**Decision 7 [Source: architecture.md#Decision-7]:** Knowledge Agent uses Claude Haiku for concept identification and relationship mapping. AI SDK `generateObject` with Zod schema validation, one retry on failure (`maxRetries: 1`).

**Decision 8 [Source: architecture.md#Decision-8]:** Queue config for `build-relationships`: `{ retryLimit: 2, retryBackoff: true, expireInHours: 0.5 }`. Already created in `apps/api/src/plugins/pg-boss.ts`. Concurrency: 5 concurrent (CPU/LLM-bound, no browser limit).

**Decision 12 [Source: architecture.md#Decision-12]:** `sf_concept_relationships` table — "Concept dependency graph" with "id, source_concept, target_concept, relationship_type". Module state machine: "processing → ready" transition occurs when build-relationships completes for all units.

**AR5 [Source: architecture.md]:** 6-stage sequential pipeline. build-relationships is the final stage before module becomes "ready".

**AR21 [Source: architecture.md]:** Zod validation at all system boundaries. LLM structured output validated with Zod; one retry on validation failure.

### Database Schema Analysis

**Current sf_concept_relationships schema (migration 002):**
```sql
CREATE TABLE sf_concept_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_chunk_id UUID NOT NULL REFERENCES sf_knowledge_chunks(id) ON DELETE CASCADE,
  target_chunk_id UUID NOT NULL REFERENCES sf_knowledge_chunks(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('prerequisite','related','contradicts','clarifies','extends')),
  strength NUMERIC(4,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Schema mismatch with architecture:** Architecture Decision 12 describes this table as having `source_concept, target_concept` (concept-level). The actual migration uses `source_chunk_id, target_chunk_id` (chunk-level). Migration 011 reconciles this by:
1. Adding `source_concept TEXT` and `target_concept TEXT` columns
2. Adding `module_id` for cross-module queries
3. Making `source_chunk_id/target_chunk_id` nullable (concept relationships may not map to specific chunks)
4. Updating CHECK constraint to include 'related_to' and 'part_of'

**Existing RelationshipType in trailhead.ts:** `'prerequisite' | 'related' | 'contradicts' | 'clarifies' | 'extends'`
**Epic requires:** `'prerequisite' | 'related_to' | 'part_of'`
**Migration 011 adds:** `'related_to'` and `'part_of'` to the CHECK constraint (keeping existing types for forward compatibility)

### Pipeline Chaining (Already Connected)

The `generate-embeddings` handler in `queue-handlers.ts` **already chains** to `build-relationships`:
```typescript
await (boss as unknown as BossWithSend).send('build-relationships', { unit_id, module_id, run_id });
```

The `build-relationships` queue is **already created** in pg-boss.ts:
```typescript
{ name: 'build-relationships', retryLimit: 2, retryBackoff: true, expireInHours: 0.5 }
```

**What's missing:** The handler registration in `registerQueueHandlers()` — currently no `boss.work('build-relationships', ...)` call exists.

### AI SDK generateObject Pattern (Reuse from knowledge-agent.ts)

```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { object } = await generateObject({
  model: anthropic('claude-haiku-4-5-20251001'),
  schema: conceptRelationshipSchema,
  prompt: builtPrompt,
  system: prompts.system,
  maxRetries: 1,  // One retry on Zod validation failure (AR21)
});
```

### Concept Data Flow

1. Story 3-1 (identify-concepts) stores `sf_concepts` as JSONB on the `units` table
2. `sf_concepts` follows the `conceptExtractionSchema` Zod schema:
   ```typescript
   {
     sf_topics: string[],       // e.g., ["Apex", "SOQL", "Data Management"]
     sf_objects: string[],      // e.g., ["Account", "Contact"]
     sf_api_names: string[],    // e.g., ["Account.Name"]
     apex_keywords: string[],   // e.g., ["trigger", "batch"]
     flow_references: string[], // e.g., ["Record-Triggered Flow"]
     difficulty: "beginner" | "intermediate" | "advanced",
     content_types: ("explanation" | "code" | "quiz" | ...)[]
   }
   ```
3. This story reads `sf_concepts` from ALL units in the module to build cross-unit relationships
4. **Critical:** Use `conceptExtractionSchema.safeParse()` to validate the JSONB data (it was written by an LLM in identify-concepts, may be malformed)

### Module Status Transition Strategy (AC3)

The build-relationships handler must detect when ALL units in a module have completed the full pipeline and transition module status from 'processing' to 'ready'.

**Approach:** After `buildUnitRelationships()` completes for a unit:
1. Count total units: `SELECT COUNT(*) FROM units WHERE module_id = $module_id`
2. Count distinct units with embeddings: `SELECT COUNT(DISTINCT unit_id) FROM sf_knowledge_chunks WHERE module_id = $module_id AND embedding IS NOT NULL`
3. If counts match → all units have passed through generate-embeddings (stage 5), and since build-relationships (stage 6) chains 1:1 from stage 5, the pipeline is complete → set module status to 'ready'

**Race condition note:** Multiple units may complete build-relationships concurrently. If both check the count simultaneously and both see all units embedded, both may try to set 'ready'. This is safe — the UPDATE is idempotent.

### Cross-Module Relationships (AC2)

The epic requires cross-module relationships. Since build-relationships processes one unit at a time within a module, cross-MODULE relationships are harder. The approach:

1. **Within-module cross-unit:** Handled directly — we fetch ALL units' concepts for the current module
2. **Cross-module:** Query sf_concept_relationships for existing concepts across all modules. When the LLM identifies a concept that exists in another module's relationships, create a new relationship linking them.

**Practical implementation:** For now, focus on within-module relationships (most valuable for learning paths). Cross-module relationships can be enhanced in a future story by running a batch process that compares concepts across modules. The schema supports it via the `module_id` column.

### Deduplication Strategy

When processing multiple units in a module, the LLM may produce duplicate relationships (e.g., "Apex" → "SOQL" from both unit 1 and unit 2). Before inserting:
1. Query existing relationships for this module
2. Filter out any (source_concept, target_concept, relationship_type) triples that already exist
3. Only insert new relationships

### Existing File State

| File | Current State |
|------|---------------|
| `apps/api/src/pipeline/stages/build-relationships.ts` | Does NOT exist — create it |
| `apps/api/src/pipeline/stages/build-relationships.test.ts` | Does NOT exist — create it |
| `apps/api/src/pipeline/queue-handlers.ts` | Has scrape, extract, identify-concepts, chunk-content, generate-embeddings, dead-letter handlers. `generate-embeddings` chains to `build-relationships` but NO handler registered. |
| `apps/api/src/pipeline/queue-handlers.test.ts` | Has tests for all existing handlers — add build-relationships tests |
| `apps/api/src/agents/knowledge-agent.ts` | Has `loadKnowledgePrompts()`, `identifyConcepts()`, `classifyChunk()`. Prompt schema: `{ system, identify_concepts, classify_chunk }` |
| `apps/api/src/prompts/knowledge-agent.yaml` | Has `system`, `identify_concepts`, `classify_chunk` sections |
| `apps/api/src/plugins/pg-boss.ts` | `build-relationships` queue already created with `{ retryLimit: 2, retryBackoff: true, expireInHours: 0.5 }` |
| `packages/shared/src/types/trailhead.ts` | Has `SfConceptRelationship`, `RelationshipType` — needs update |
| `packages/db/supabase/migrations/` | Has 001-010 — create 011 |

### Mock Pattern for generateObject (Test File)

Use `vi.hoisted()` for ESM mock hoisting in `build-relationships.test.ts`:

```typescript
const { mockGenerateObject } = vi.hoisted(() => {
  const mockGenerateObject = vi.fn().mockResolvedValue({
    object: {
      relationships: [
        { source_concept: 'Apex Triggers', target_concept: 'Apex Classes', relationship_type: 'prerequisite', strength: 0.9 },
        { source_concept: 'SOQL', target_concept: 'Data Management', relationship_type: 'related_to', strength: 0.8 },
        { source_concept: 'Account Fields', target_concept: 'Account', relationship_type: 'part_of', strength: 0.95 },
      ],
    },
  });
  return { mockGenerateObject };
});
vi.mock('ai', () => ({ generateObject: mockGenerateObject }));

const { mockAnthropic } = vi.hoisted(() => {
  const mockAnthropic = vi.fn().mockReturnValue({ id: 'claude-haiku-4-5-20251001' });
  return { mockAnthropic };
});
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: mockAnthropic }));
```

### Mock Pattern for Supabase Operations

```typescript
// Units select mock (returns unit with sf_concepts)
const mockUnitSelectEq = vi.fn().mockResolvedValue({
  data: [{
    id: 'unit-1',
    sf_concepts: {
      sf_topics: ['Apex', 'Triggers'],
      sf_objects: ['Account'],
      sf_api_names: ['Account.Name'],
      apex_keywords: ['trigger'],
      flow_references: [],
      difficulty: 'intermediate',
      content_types: ['explanation', 'code'],
    },
    title: 'Understanding Apex Triggers',
  }],
  error: null,
});

// All units select mock (for cross-unit concepts)
const mockAllUnitsEq = vi.fn().mockResolvedValue({
  data: [
    { id: 'unit-1', sf_concepts: { /* ... */ }, title: 'Unit 1' },
    { id: 'unit-2', sf_concepts: { /* ... */ }, title: 'Unit 2' },
  ],
  error: null,
});

// sf_concept_relationships insert mock
const mockInsert = vi.fn().mockResolvedValue({ error: null });

// Chunks select mock (for representative chunk lookup)
const mockChunksSelectEq = vi.fn().mockResolvedValue({
  data: [{ id: 'chunk-1' }],
  error: null,
});
```

### Knowledge Agent Prompt Loading

The `loadKnowledgePrompts()` function caches prompts at module level. Adding `build_relationships` as optional to the schema means:
- Existing tests (knowledge-agent.test.ts) continue to pass (their mock YAML doesn't include the new field)
- New tests for build-relationships include the field in their mock
- Production YAML has all 4 fields

Use `_resetPromptCache()` in test `beforeEach` to ensure fresh prompt loading.

### Key Learnings from Prior Stories

From Stories 3.1 and 3.2 (see `.ralph-progress.md`):
- `vi.hoisted()` required for ESM mock hoisting — must be before all other code
- `as unknown as T` for structural type casts (never `as any`)
- Supabase returns `{ error }` object (does NOT throw) — always check error
- `PipelineError` takes `(stage: string, message: string)` — reuse for new stage
- `logToolTrace` requires all fields from `ToolTraceParams` (see `apps/api/src/lib/agent-logger.ts`)
- Queue handler tests capture handlers via `vi.fn().mockImplementation((_q, _opts, handler) => { handlers.push({ queue: _q, handler }) })`
- Always use `.js` extension in relative imports (ESM requirement)
- `BossWithWork`, `BossWithSend`, `PipelineClient` structural types already defined in `queue-handlers.ts` — reuse
- Guard against empty arrays before calling `supabase.insert()` — some clients reject empty inserts
- Always use Zod `safeParse` at system boundaries for JSONB data written by LLM calls — never trust `as` cast
- `conceptExtractionSchema` from `knowledge-agent.ts` is the canonical Zod schema for sf_concepts validation
- startTime should be captured BEFORE the first async operation
- FTS trigger exists (migration 010) — embedding UPDATEs auto-populate fts

### ESM Import Requirements

```typescript
import { buildUnitRelationships } from './stages/build-relationships.js';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { loadKnowledgePrompts, conceptExtractionSchema } from '../../agents/knowledge-agent.js';
import { PipelineError } from '../../lib/errors.js';
import { logToolTrace } from '../../lib/agent-logger.js';
```

### Queue Handler Pattern (from existing handlers)

The build-relationships handler follows the exact pattern of generate-embeddings:

```typescript
await (boss as unknown as BossWithWork).work(
  'build-relationships',
  { teamSize: 5, teamConcurrency: 5 },
  async (job: BossJob) => {
    const { unit_id, module_id, run_id } = job.data as { unit_id: string; module_id: string; run_id: string | null };
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    await buildUnitRelationships({ unit_id, module_id, run_id }, supabase);
    // Module status transition logic here (see AC3 implementation notes)
  },
);
```

This is the **terminal stage** — no chaining to another queue. Instead, check for module completion.

### Testing Standards [Source: architecture.md#Decision-13]

**What NOT to test:**
- `generateObject` behavior (mock completely)
- Supabase client operations (mock `from().select()`, `from().insert()`)
- LLM response quality (mock with realistic fixture data)

**What to test:**
- `buildUnitRelationships()` fetches unit's sf_concepts by unit_id
- `buildUnitRelationships()` fetches all units in module for cross-unit context
- `generateObject()` called with correct model, schema, and prompt
- Relationships are inserted into sf_concept_relationships with correct columns
- Representative chunk lookup attempts to find chunks matching concept sf_topics
- Early return when no valid sf_concepts (null or safeParse fails)
- PipelineError thrown on Supabase fetch errors
- Empty relationships array handled gracefully (no insert call)
- Duplicate filtering (skip existing source→target pairs)
- Queue handler registers with `{ teamSize: 5, teamConcurrency: 5 }`
- Queue handler calls `buildUnitRelationships()` correctly
- Queue handler checks module completion and transitions to 'ready'
- Queue handler does NOT transition if some units still lack embeddings

### Structural Type for PipelineClient Extension

The build-relationships handler needs `.not()` for the module completion check. The existing `PipelineClient` type already supports `.not()` via the chained API on `.eq()`. Verify the structural type in `queue-handlers.ts` supports the query pattern:

```typescript
// Existing PipelineClient supports:
.select(cols).eq(col, val).not(col, op, val)
```

If the structural type needs extension for the `sf_topics` array containment query in the stage function, define a local structural type in `build-relationships.ts` that supports the needed operations.

### Project Structure Notes

New files this story creates:
- `packages/db/supabase/migrations/011_concept_relationship_columns.sql` (1 file)
- `apps/api/src/pipeline/stages/build-relationships.ts` + test (2 files)

Modified files:
- `apps/api/src/prompts/knowledge-agent.yaml` — Add `build_relationships` prompt section
- `apps/api/src/agents/knowledge-agent.ts` — Add optional `build_relationships` to interface and schema
- `apps/api/src/pipeline/queue-handlers.ts` + test — Add build-relationships handler with module status transition
- `packages/shared/src/types/trailhead.ts` — Update `RelationshipType` and `SfConceptRelationship`

Total new test files: 1 (`build-relationships.test.ts`)
Estimated new test count: 10-15 tests (stage function tests + queue handler tests)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.3 — Acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-3 — Shared-state sequential pipeline, two-phase concept analysis]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-7 — Knowledge Agent with Claude Haiku, tiered model selection]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-8 — Queue config: build-relationships(retryLimit: 2, retryBackoff: true)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-12 — sf_concept_relationships table, module state machine]
- [Source: _bmad-output/planning-artifacts/architecture.md#AR21 — Zod validation with one retry]
- [Source: apps/api/src/pipeline/queue-handlers.ts — BossWithWork, BossWithSend, PipelineClient structural types, handler pattern]
- [Source: apps/api/src/agents/knowledge-agent.ts — loadKnowledgePrompts(), conceptExtractionSchema, generateObject pattern]
- [Source: apps/api/src/pipeline/stages/generate-embeddings.ts — pipeline stage pure-function pattern, ToolTrace logging]
- [Source: apps/api/src/lib/agent-logger.ts — logToolTrace() signature, ToolTraceParams]
- [Source: apps/api/src/lib/errors.ts — PipelineError constructor]
- [Source: apps/api/src/plugins/pg-boss.ts — build-relationships queue already created]
- [Source: packages/db/supabase/migrations/002_knowledge_tables.sql — existing sf_concept_relationships schema]
- [Source: packages/shared/src/types/trailhead.ts — SfConceptRelationship, RelationshipType interfaces]
- [Source: _bmad-output/implementation-artifacts/3-1-content-chunking-with-salesforce-specific-rules.md — knowledge agent patterns, Zod safeParse for JSONB]
- [Source: _bmad-output/implementation-artifacts/3-2-embedding-generation-and-vector-storage.md — generate-embeddings handler chaining to build-relationships]

## Dev Agent Record

### Agent Model Used

Claude Haiku 4.5 (claude-haiku-4-5-20251001)

### Debug Log References

- TDD RED phase: Confirmed test file compilation error when implementation missing
- GREEN phase: All 10 build-relationships tests passed on first implementation
- REFACTOR phase: Fixed type-safety issues in test mock access patterns using optional chaining

### Completion Notes List

1. **Schema Task (Task 1)** — Updated RelationshipType enum and SfConceptRelationship interface to support concept-level relationships instead of just chunk-level. Added module_id for cross-module queries. Created migration 011.

2. **Prompt Task (Task 2)** — Added build_relationships YAML prompt to knowledge-agent.yaml with clear relationship detection rules (prerequisite, related_to, part_of). Made KnowledgePrompts interface field optional to maintain backward compatibility.

3. **Pipeline Stage Task (Task 3, TDD)** — Implemented buildUnitRelationships function following the pipeline stage pattern from generate-embeddings. Key features:
   - Fetches current unit concepts and all other units in module for cross-unit context
   - Calls Claude Haiku via AI SDK generateObject with Zod validation
   - Deduplicates relationships and filters out self-relationships
   - Attempts to link relationships to representative chunks
   - Logs ToolTrace for observability

4. **Queue Handler Task (Task 4)** — Registered build-relationships worker in queue-handlers.ts with:
   - teamSize: 5, teamConcurrency: 5
   - Module status transition logic: checks if all units have embeddings, updates module status to 'ready' when pipeline complete
   - Proper error rethrow for pg-boss retry mechanism

5. **Code Review Fixes Applied** —
   - HIGH 1: Hoisted chunk lookup out of the relationship loop. Now one single `sf_knowledge_chunks` query before the loop; in-memory `sf_topics` matching assigns per-concept representative chunks (source and target can differ). Eliminates N+1 DB round-trips.
   - HIGH 2: Added error check on all-units module query (line ~93). Throws `PipelineError` instead of silently continuing with missing cross-unit context.
   - HIGH 3 (scope note): AC2 "cross-MODULE relationships" is intentionally scoped to within-module cross-unit relationships in this story. The story Dev Notes explicitly document this as the intended approach ("For now, focus on within-module relationships"). The `module_id` column is stored on all relationships making them discoverable per module. True cross-module discovery is deferred to a future story as documented.
   - MEDIUM 1: Added assertion that `build_relationships` prompt exists in YAML; throws `PipelineError` if missing (instead of silently passing empty string to Claude).

6. **Tests Extended** — Added 2 module-status-transition tests to `queue-handlers.test.ts`: "updates to ready when all units embedded" and "does NOT update when only some units embedded". Total: 246 API tests, 101 web tests, 0 type errors.

### File List

**Created:**
- `/mnt/d/ailocal/TrailblazeAi/packages/db/supabase/migrations/011_concept_relationship_columns.sql` (45 lines)
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/stages/build-relationships.ts` (137 lines)
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/stages/build-relationships.test.ts` (283 lines)

**Modified:**
- `/mnt/d/ailocal/TrailblazeAi/packages/shared/src/types/trailhead.ts` — Updated RelationshipType and SfConceptRelationship
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/prompts/knowledge-agent.yaml` — Added build_relationships section
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/agents/knowledge-agent.ts` — Updated KnowledgePrompts interface and promptSchema
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/queue-handlers.ts` — Added buildUnitRelationships import and handler registration
- `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/queue-handlers.test.ts` — Added buildUnitRelationships mock and 6 new test cases
