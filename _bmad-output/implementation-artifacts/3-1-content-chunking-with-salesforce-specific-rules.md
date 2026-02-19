# Story 3.1: Content Chunking with Salesforce-Specific Rules

Status: ready-for-dev

## Story

As a user,
I want extracted content chunked into structure-aware segments with Salesforce-specific tagging,
So that knowledge is organized for accurate retrieval.

## Acceptance Criteria

1. **[AC1]** Given a unit has extracted content in markdown format, when the identify-concepts stage processes it, then the Knowledge Agent (Claude Haiku) extracts Salesforce-specific concepts: object names, API names, Apex keywords, Flow references; and the output is validated with a Zod schema (one retry on validation failure); and prompts are loaded from `apps/api/src/prompts/knowledge-agent.yaml`.

2. **[AC2]** Given structured content is ready for chunking, when the chunk-content stage processes it, then ChonkieJS splits content into 400-512 token segments with 50-100 token overlap; and code blocks are kept intact as separate chunks (never split mid-block); and quiz questions are atomic: one question + all options = one chunk with content_type "quiz"; and hands-on steps are grouped together (~800 tokens) with content_type "hands_on".

3. **[AC3]** Given chunks are created, when they are stored in sf_knowledge_chunks, then each chunk includes: content, content_type (explanation, code, quiz, hands_on, reference, definition), difficulty level, sf_topics array, unit_id foreign key, and section header metadata.

4. **[AC4]** Given the pipeline processes a unit, when identify-concepts and chunk-content stages complete, then pg-boss chains to the next stage (generate-embeddings).

## Tasks / Subtasks

- [x] Task 1: Add missing columns to sf_knowledge_chunks and units tables (AC3)
  - [x] 1.1 Create migration `packages/db/supabase/migrations/009_knowledge_chunk_columns.sql`:
    ```sql
    -- Add unit-level reference and metadata to sf_knowledge_chunks
    ALTER TABLE sf_knowledge_chunks ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE CASCADE;
    ALTER TABLE sf_knowledge_chunks ADD COLUMN content_type TEXT CHECK (content_type IN ('explanation','code','quiz','hands_on','reference','definition'));
    ALTER TABLE sf_knowledge_chunks ADD COLUMN difficulty TEXT CHECK (difficulty IN ('beginner','intermediate','advanced'));
    ALTER TABLE sf_knowledge_chunks ADD COLUMN sf_topics TEXT[] DEFAULT '{}';
    ALTER TABLE sf_knowledge_chunks ADD COLUMN section_header TEXT;

    -- Add concept extraction cache to units (intermediate stage data)
    ALTER TABLE units ADD COLUMN sf_concepts JSONB;
    ```
  - [x] 1.2 Update `SfKnowledgeChunk` interface in `packages/shared/src/types/trailhead.ts`:
    - Add `unit_id: string | null`
    - Add `content_type: 'explanation' | 'code' | 'quiz' | 'hands_on' | 'reference' | 'definition' | null`
    - Add `difficulty: 'beginner' | 'intermediate' | 'advanced' | null`
    - Add `sf_topics: string[]`
    - Add `section_header: string | null`
  - [x] 1.3 Update `Unit` interface in `packages/shared/src/types/trailhead.ts`:
    - Add `sf_concepts: unknown | null` (JSONB maps to unknown in TS)
  - [x] 1.4 Run `pnpm type-check` — confirm 0 errors

- [x] Task 2: Install ChonkieJS and create knowledge-agent.yaml (AC1, AC2)
  - [x] 2.1 Add `"@chonkiejs/core": "^0"` to `dependencies` in `apps/api/package.json`
  - [x] 2.2 Run `pnpm install --filter @trailblaze/api` to update lockfile
  - [x] 2.3 Create `apps/api/src/prompts/knowledge-agent.yaml`:
    ```yaml
    system: |
      You are a Salesforce knowledge extraction specialist. Your task is to analyze
      Trailhead learning content and extract Salesforce-specific concepts, terminology,
      and technical references. Be exhaustive — capture every Salesforce object name,
      API name, Apex keyword, Flow reference, Lightning component, and platform feature
      mentioned in the content.

    identify_concepts: |
      Analyze the following Trailhead unit content and extract all Salesforce-specific
      concepts and metadata.

      Content:
      {{content}}

      Extract the following:
      1. sf_topics: Array of Salesforce topic tags (e.g., "Apex", "SOQL", "Flow Builder",
         "Lightning Web Components", "Security", "Data Management")
      2. sf_objects: Array of Salesforce standard/custom object names mentioned
         (e.g., "Account", "Contact", "Opportunity", "Custom_Object__c")
      3. sf_api_names: Array of API names, field names, or developer names
         (e.g., "Account.Name", "Schema.SObjectType", "ApexPages.StandardController")
      4. apex_keywords: Array of Apex-specific keywords and constructs
         (e.g., "trigger", "batch", "queueable", "future", "SOQL", "DML")
      5. flow_references: Array of Flow-related terms
         (e.g., "Record-Triggered Flow", "Screen Flow", "Flow Builder", "Process Builder")
      6. difficulty: Assessment of content difficulty ("beginner", "intermediate", or "advanced")
         based on concept complexity and prerequisite knowledge implied
      7. content_types: Array of content type classifications present in this unit,
         from: "explanation", "code", "quiz", "hands_on", "reference", "definition"

    classify_chunk: |
      Given the following text chunk from a Trailhead unit, classify its content type.

      Chunk:
      {{chunk}}

      Available types: explanation, code, quiz, hands_on, reference, definition

      Rules:
      - "code" if the chunk is primarily a code block or code example
      - "quiz" if it contains a quiz question with answer options
      - "hands_on" if it contains step-by-step instructions or challenge steps
      - "reference" if it lists API references, field lists, or configuration tables
      - "definition" if it primarily defines a term or concept
      - "explanation" for general explanatory text (default)
    ```
  - [x] 2.4 Run `pnpm type-check` — confirm 0 errors

- [x] Task 3: Create Knowledge Agent (AC1)
  - [x] 3.1 Write failing test `apps/api/src/agents/knowledge-agent.test.ts`:
    - Test: `loadKnowledgePrompts()` returns an object with `system`, `identify_concepts`, and `classify_chunk` string fields parsed from YAML
    - Test: `identifyConcepts()` calls `generateObject` with model `claude-haiku-4-5-20251001` and the `conceptExtractionSchema`
    - Test: `identifyConcepts()` returns a validated `ConceptExtraction` result with sf_topics, sf_objects, sf_api_names, apex_keywords, flow_references, difficulty, content_types
    - Test: `identifyConcepts()` retries once on Zod validation failure (maxRetries: 1)
    - Test: `identifyConcepts()` throws `PipelineError` if content is empty
    - Test: `classifyChunk()` calls `generateObject` with the chunk text and returns a content_type string
  - [x] 3.2 Create `apps/api/src/agents/knowledge-agent.ts`:
    - Import `generateObject` from `ai`, `anthropic` from `@ai-sdk/anthropic`
    - Import `parse` from `yaml`, `readFile` from `fs/promises`, `fileURLToPath` from `url`, `dirname`/`join` from `path`
    - Import `z` from `zod`, `PipelineError` from `../lib/errors.js`
    - ESM path resolution: `const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);`
    - Export interface `KnowledgePrompts { system: string; identify_concepts: string; classify_chunk: string; }`
    - Export `async function loadKnowledgePrompts(): Promise<KnowledgePrompts>` — reads `../prompts/knowledge-agent.yaml`
    - Export `conceptExtractionSchema`:
      ```typescript
      export const conceptExtractionSchema = z.object({
        sf_topics: z.array(z.string()),
        sf_objects: z.array(z.string()),
        sf_api_names: z.array(z.string()),
        apex_keywords: z.array(z.string()),
        flow_references: z.array(z.string()),
        difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
        content_types: z.array(z.enum(['explanation', 'code', 'quiz', 'hands_on', 'reference', 'definition'])),
      });
      export type ConceptExtraction = z.infer<typeof conceptExtractionSchema>;
      ```
    - Export `async function identifyConcepts(content: string): Promise<ConceptExtraction>`:
      1. If content is empty or whitespace-only, throw `new PipelineError('identify-concepts', 'Content is empty')`
      2. `const prompts = await loadKnowledgePrompts()`
      3. Call `generateObject({ model: anthropic('claude-haiku-4-5-20251001'), schema: conceptExtractionSchema, prompt: prompts.identify_concepts.replace('{{content}}', content), system: prompts.system, maxRetries: 1 })`
      4. Return `result.object`
    - Export `chunkClassificationSchema`:
      ```typescript
      export const chunkClassificationSchema = z.object({
        content_type: z.enum(['explanation', 'code', 'quiz', 'hands_on', 'reference', 'definition']),
      });
      ```
    - Export `async function classifyChunk(chunkText: string): Promise<string>`:
      1. `const prompts = await loadKnowledgePrompts()`
      2. Call `generateObject({ model: anthropic('claude-haiku-4-5-20251001'), schema: chunkClassificationSchema, prompt: prompts.classify_chunk.replace('{{chunk}}', chunkText), system: prompts.system, maxRetries: 1 })`
      3. Return `result.object.content_type`
  - [x] 3.3 Run `pnpm --filter @trailblaze/api test` — confirm 3.1 tests pass

- [x] Task 4: Create identify-concepts pipeline stage (AC1)
  - [x] 4.1 Write failing test `apps/api/src/pipeline/stages/identify-concepts.test.ts`:
    - Test: `identifyUnitConcepts()` reads unit from Supabase by `unit_id`
    - Test: `identifyUnitConcepts()` throws `PipelineError` if unit has no `content_markdown`
    - Test: `identifyUnitConcepts()` calls `identifyConcepts()` with the unit's `content_markdown`
    - Test: `identifyUnitConcepts()` stores the result in `units.sf_concepts` column as JSONB
    - Test: `identifyUnitConcepts()` logs a `ToolTrace` entry via `logToolTrace` with `agent_type: 'knowledge'` and `tool_type: 'llm_call'`
    - Test: `identifyUnitConcepts()` throws if unit not found
  - [x] 4.2 Create `apps/api/src/pipeline/stages/identify-concepts.ts`:
    - Import `createClient` from `@trailblaze/db`
    - Import `PipelineError` from `../../lib/errors.js`
    - Import `identifyConcepts` from `../../agents/knowledge-agent.js`
    - Import `logToolTrace` from `../../lib/agent-logger.js`
    - Export interface `IdentifyConceptsInput { unit_id: string; run_id: string | null; }`
    - Export `async function identifyUnitConcepts(input: IdentifyConceptsInput, supabase: ReturnType<typeof createClient>): Promise<void>`:
      1. Fetch unit from `units` table by `input.unit_id` (select `id, content_markdown, title`)
      2. If no unit found, throw `new PipelineError('identify-concepts', 'Unit not found: ' + input.unit_id)`
      3. If `content_markdown` is null/empty, throw `new PipelineError('identify-concepts', 'Unit has no content_markdown: ' + input.unit_id)`
      4. `const startTime = Date.now()`
      5. `const concepts = await identifyConcepts(unit.content_markdown)`
      6. Update `units` table: set `sf_concepts = JSON.stringify(concepts)` where `id = input.unit_id`
      7. Call `logToolTrace(supabase, { run_id: input.run_id, agent_type: 'knowledge', tool_type: 'llm_call', query: 'identify-concepts for unit: ' + (unit.title ?? input.unit_id), raw_output: JSON.stringify(concepts), summary: 'Identified ' + concepts.sf_topics.length + ' topics, ' + concepts.sf_objects.length + ' objects', raw_output_truncated: false, input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0, duration_ms: Date.now() - startTime, confidence_score: null, related_chunk_ids: null })`
  - [x] 4.3 Run `pnpm --filter @trailblaze/api test` — confirm 4.1 tests pass

- [x] Task 5: Create chunk-content pipeline stage (AC2, AC3)
  - [x] 5.1 Write failing test `apps/api/src/pipeline/stages/chunk-content.test.ts`:
    - Test: `chunkUnitContent()` reads unit from Supabase by `unit_id` (needs `content_markdown` and `sf_concepts`)
    - Test: `chunkUnitContent()` throws `PipelineError` if unit has no `content_markdown`
    - Test: `extractCodeBlocks()` pulls out fenced code blocks (```...```) and replaces them with placeholders
    - Test: `extractCodeBlocks()` preserves code block content exactly as-is
    - Test: `detectQuizChunks()` identifies quiz-formatted content and returns atomic quiz chunks
    - Test: `detectHandsOnSteps()` identifies sequential numbered steps and groups them
    - Test: `chunkUnitContent()` stores chunks in `sf_knowledge_chunks` with correct `unit_id`, `module_id`, `content_type`, `sf_topics`, `difficulty`, `section_header`, and `chunk_index`
    - Test: code block chunks get `content_type: 'code'` and are never split
    - Test: quiz chunks get `content_type: 'quiz'` and are atomic (one question per chunk)
    - Test: hands-on step chunks get `content_type: 'hands_on'`
    - Test: regular content chunks get content_type from classification or default to 'explanation'
    - Test: `chunkUnitContent()` uses RecursiveChunker with `chunkSize: 512`
    - Test: chunk_index is assigned sequentially starting from 0
  - [x] 5.2 Create `apps/api/src/pipeline/stages/chunk-content.ts`:
    - Import `RecursiveChunker` from `@chonkiejs/core`
    - Import `createClient` from `@trailblaze/db`
    - Import `PipelineError` from `../../lib/errors.js`
    - Import `logToolTrace` from `../../lib/agent-logger.js`
    - Export `const CHUNK_SIZE = 512;` (matches architecture's 400-512 range upper bound)
    - Export `const CHUNK_OVERLAP = 50;`
    - Export `const HANDS_ON_MAX_TOKENS = 800;`
    - Export interface `ChunkContentInput { unit_id: string; module_id: string; run_id: string | null; }`
    - Export interface `PreparedChunk { text: string; content_type: string; section_header: string | null; }`
    - Export `function extractCodeBlocks(markdown: string): { cleaned: string; codeChunks: PreparedChunk[] }`:
      - Use regex to find all fenced code blocks (``` ```...``` ```)
      - Replace each with `__CODE_BLOCK_{index}__` placeholder
      - Return cleaned text and array of code chunks with `content_type: 'code'`
      - Capture the section header preceding each code block (last `#` heading before the block)
    - Export `function detectQuizChunks(markdown: string): PreparedChunk[]`:
      - Detect quiz patterns: content with `**Question**` or numbered choices like `A.`, `B.`, `C.`, `D.` or radio-style `[ ]` options
      - Each question + all its options = one atomic chunk with `content_type: 'quiz'`
      - Return empty array if no quizzes found
    - Export `function detectHandsOnSteps(markdown: string): PreparedChunk[]`:
      - Detect hands-on patterns: sequential numbered steps (`Step 1:`, `1.`, etc.) with imperative verbs
      - Group consecutive steps up to ~HANDS_ON_MAX_TOKENS
      - Tag with `content_type: 'hands_on'`
      - Return empty array if no hands-on content
    - Export `async function chunkUnitContent(input: ChunkContentInput, supabase: ReturnType<typeof createClient>): Promise<void>`:
      1. Fetch unit from `units` table by `input.unit_id` (select `id, content_markdown, sf_concepts, module_id, title`)
      2. If `content_markdown` is null/empty, throw `new PipelineError('chunk-content', 'Unit has no content_markdown: ' + input.unit_id)`
      3. Parse `sf_concepts` from unit (JSONB → ConceptExtraction type, with fallback defaults if null)
      4. Extract code blocks: `const { cleaned, codeChunks } = extractCodeBlocks(content_markdown)`
      5. Extract quiz chunks: `const quizChunks = detectQuizChunks(cleaned)`
      6. Extract hands-on chunks: `const handsOnChunks = detectHandsOnSteps(cleaned)`
      7. Remove quiz and hands-on content from cleaned text
      8. Use `RecursiveChunker.create({ chunkSize: CHUNK_SIZE })` to chunk remaining text
      9. Map RecursiveChunker output to PreparedChunk with `content_type: 'explanation'` (default)
      10. Combine all chunks: [...codeChunks, ...quizChunks, ...handsOnChunks, ...regularChunks]
      11. For each chunk, insert into `sf_knowledge_chunks`:
          ```
          {
            unit_id: input.unit_id,
            module_id: input.module_id,
            chunk_text: chunk.text,
            content_type: chunk.content_type,
            difficulty: sf_concepts?.difficulty ?? null,
            sf_topics: sf_concepts?.sf_topics ?? [],
            section_header: chunk.section_header,
            chunk_index: index,
            fts: null (populated by trigger or separate update),
          }
          ```
      12. Log ToolTrace with `agent_type: 'knowledge'`, `tool_type: 'llm_call'`, summary of chunks created
  - [x] 5.3 Run `pnpm --filter @trailblaze/api test` — confirm 5.1 tests pass

- [x] Task 6: Register queue handlers for identify-concepts and chunk-content (AC4)
  - [x] 6.1 Write failing tests in `apps/api/src/pipeline/queue-handlers.test.ts`:
    - Test: `registerQueueHandlers()` calls `boss.work('identify-concepts', ...)` with `{ teamSize: 5, teamConcurrency: 5 }`
    - Test: `registerQueueHandlers()` calls `boss.work('chunk-content', ...)` with `{ teamSize: 5, teamConcurrency: 5 }`
    - Test: the `identify-concepts` handler calls `identifyUnitConcepts()` and then chains to `chunk-content` via `boss.send('chunk-content', { unit_id, module_id, run_id })`
    - Test: the `chunk-content` handler calls `chunkUnitContent()` and then chains to `generate-embeddings` via `boss.send('generate-embeddings', { unit_id, module_id, run_id })`
    - Test: the `identify-concepts` handler rethrows on error (so pg-boss retry triggers)
    - Test: the `chunk-content` handler rethrows on error
  - [x] 6.2 Update `apps/api/src/pipeline/queue-handlers.ts`:
    - Import `identifyUnitConcepts` from `./stages/identify-concepts.js`
    - Import `chunkUnitContent` from `./stages/chunk-content.js`
    - In `registerQueueHandlers`, add two new workers:
      ```typescript
      // identify-concepts → chains to chunk-content
      await (boss as unknown as BossWithWork).work(
        'identify-concepts',
        { teamSize: 5, teamConcurrency: 5 },
        async (job: BossJob) => {
          const { unit_id, module_id, run_id } = job.data as { unit_id: string; module_id: string; run_id: string | null };
          const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
          await identifyUnitConcepts({ unit_id, run_id }, supabase);
          await (boss as unknown as BossWithSend).send('chunk-content', { unit_id, module_id, run_id });
        },
      );

      // chunk-content → chains to generate-embeddings
      await (boss as unknown as BossWithWork).work(
        'chunk-content',
        { teamSize: 5, teamConcurrency: 5 },
        async (job: BossJob) => {
          const { unit_id, module_id, run_id } = job.data as { unit_id: string; module_id: string; run_id: string | null };
          const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
          await chunkUnitContent({ unit_id, module_id, run_id }, supabase);
          await (boss as unknown as BossWithSend).send('generate-embeddings', { unit_id, module_id, run_id });
        },
      );
      ```
  - [x] 6.3 Update `extract-content` handler to chain to `identify-concepts` instead of stopping:
    - The current `extract-content` handler calls `extractUnitContent()` and returns.
    - Add chaining: after `extractUnitContent()`, send `boss.send('identify-concepts', { unit_id, module_id, run_id })` (the module_id needs to be passed through from the job data or looked up from the unit)
  - [x] 6.4 Run `pnpm --filter @trailblaze/api test` — confirm all tests pass

- [x] Task 7: Update module status transition for processing state (AC4)
  - [x] 7.1 The extract-content handler currently does NOT update module status to 'processing'. Per the architecture's module state machine (pending → scraping → scraped → processing → ready), the transition to 'processing' should happen when knowledge processing begins.
    - Add in identify-concepts handler: check if this is the first unit being processed for the module, and if so, update module status to 'processing'
    - Add in chunk-content handler: after all units for a module are chunked, update module status to 'ready' (this will be handled by Story 3-2 or 3-3 which is the final pipeline stage)
  - [x] 7.2 Write test: when identify-concepts handler processes first unit of a module, module status transitions to 'processing'
  - [x] 7.3 Run tests — confirm pass

- [x] Task 8: Final verification
  - [x] 8.1 Run `pnpm --filter @trailblaze/api test` — all tests pass (0 failures)
  - [x] 8.2 Run `pnpm --filter @trailblaze/web test` — all tests pass (0 failures, no web changes but verify no regressions)
  - [x] 8.3 Run `pnpm type-check` — 0 errors across all packages
  - [x] 8.4 Mark all tasks [x] only after all three pass

## Dev Notes

### Architecture Context

This story builds the middle of the 6-stage pipeline on top of content extraction (Story 2.2):

**Stage 3: `identify-concepts` queue** — Knowledge Agent (Claude Haiku) analyzes unit content_markdown and extracts Salesforce-specific concepts, storing them as JSONB on the unit.

**Stage 4: `chunk-content` queue** — ChonkieJS + custom rules split content into structure-aware chunks, each tagged with metadata from the concept analysis.

**Decision 3 [Source: architecture.md#Decision-3]:** Shared-state sequential pipeline. Each stage reads from and writes to Supabase. identify-concepts writes to `units.sf_concepts`, chunk-content reads from it and writes to `sf_knowledge_chunks`.

**Decision 4 [Source: architecture.md#Decision-4]:** ChonkieJS (TypeScript) as base chunking library with custom Trailhead rules. Token chunking with 400-512 token chunks and 50-100 token overlap. Code blocks intact, quiz atomic, hands-on grouped.

**Decision 7 [Source: architecture.md#Decision-7]:** Knowledge Agent uses Claude Haiku for concept identification. AI SDK `generateObject` with Zod schema validation, one retry on failure (`maxRetries: 1`).

**Decision 8 [Source: architecture.md#Decision-8]:** Queue concurrency for both identify-concepts and chunk-content: `teamSize: 5, teamConcurrency: 5` (CPU/LLM-bound, no browser limit).

**AR20 [Source: architecture.md]:** YAML-driven prompt configuration. Knowledge agent prompts at `apps/api/src/prompts/knowledge-agent.yaml`.

**AR21 [Source: architecture.md]:** Zod validation at all system boundaries. LLM structured output validated with Zod; one retry on validation failure.

### AI SDK v6 generateObject API (Critical)

The `ai` package is v6 (not v5 as architecture doc states — `"ai": "^6"` in package.json). Use `generateObject` for structured LLM output:

```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { object } = await generateObject({
  model: anthropic('claude-haiku-4-5-20251001'),
  schema: conceptExtractionSchema,  // Zod schema
  prompt: builtPrompt,
  system: systemPrompt,
  maxRetries: 1,  // One retry on validation failure (AR21)
});
// object is already typed as z.infer<typeof conceptExtractionSchema>
```

### ChonkieJS API (`@chonkiejs/core`)

```typescript
import { RecursiveChunker } from '@chonkiejs/core';

// Create chunker instance (async factory)
const chunker = await RecursiveChunker.create({
  chunkSize: 512,   // Target token count per chunk
});

// Chunk text
const chunks = await chunker.chunk(text);

for (const chunk of chunks) {
  chunk.text;        // The chunk content (string)
  chunk.tokenCount;  // Token count for this chunk
}
```

**Important:** ChonkieJS does NOT handle code blocks, quiz atomicity, or hands-on grouping — these are custom Trailhead rules that must be implemented as pre-processing BEFORE calling the chunker. Extract special content types first, then chunk the remaining text.

### YAML Prompt Loading Pattern (ESM)

Follow the established pattern from `scraper-agent.ts`:

```typescript
import { parse } from 'yaml';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadKnowledgePrompts(): Promise<KnowledgePrompts> {
  const yamlPath = join(__dirname, '../prompts/knowledge-agent.yaml');
  const content = await readFile(yamlPath, 'utf-8');
  const parsed = parse(content) as unknown;
  const schema = z.object({
    system: z.string(),
    identify_concepts: z.string(),
    classify_chunk: z.string(),
  });
  return schema.parse(parsed);
}
```

### Schema Delta: sf_knowledge_chunks

**Current schema (migration 002):**
```
id, module_id, chunk_text, embedding, confidence_score, source_url, chunk_index, fts, created_at, updated_at
```

**Needed (migration 009 adds):**
```
unit_id, content_type, difficulty, sf_topics[], section_header
```

The existing `chunk_text` column maps to the content field. No rename needed — use `chunk_text` directly.

The `module_id` is kept (useful for filtering all chunks in a module). `unit_id` is added for granular tracing.

### Pipeline Chaining Flow After This Story

```
extract-content → identify-concepts → chunk-content → generate-embeddings (Story 3-2)
```

The `extract-content` handler currently stops after processing. This story adds chaining:
1. `extract-content` → sends `identify-concepts` job
2. `identify-concepts` → sends `chunk-content` job
3. `chunk-content` → sends `generate-embeddings` job (handler stub — actual embedding is Story 3-2)

### Content Type Detection Strategy

Instead of calling the LLM to classify EVERY chunk (expensive), use a hybrid approach:

1. **Pre-extraction (deterministic, free):**
   - Code blocks → `content_type: 'code'` (regex detection of ``` fences)
   - Quiz questions → `content_type: 'quiz'` (pattern: numbered options A/B/C/D or radio buttons)
   - Hands-on steps → `content_type: 'hands_on'` (pattern: sequential numbered steps with imperative verbs)

2. **Post-chunking (LLM, only for ambiguous chunks):**
   - Regular text chunks where type isn't obvious → call `classifyChunk()` with Haiku
   - BUT: for Story 3-1, use default `content_type: 'explanation'` for regular chunks to avoid excessive LLM calls
   - LLM classification can be added as a refinement in a later story if needed

This keeps LLM costs minimal — only the `identifyConcepts()` call per unit uses Claude.

### Code Block Extraction Pattern

```typescript
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;

export function extractCodeBlocks(markdown: string): { cleaned: string; codeChunks: PreparedChunk[] } {
  const codeChunks: PreparedChunk[] = [];
  let lastHeaderMatch: string | null = null;

  // Track section headers for attribution
  const lines = markdown.split('\n');
  let currentHeader: string | null = null;

  const cleaned = markdown.replace(CODE_BLOCK_REGEX, (match) => {
    // Find the most recent heading before this code block
    const position = markdown.indexOf(match);
    const textBefore = markdown.substring(0, position);
    const headerMatch = textBefore.match(/^(#{1,4}\s+.+)$/gm);
    if (headerMatch) {
      currentHeader = headerMatch[headerMatch.length - 1]?.replace(/^#+\s+/, '') ?? null;
    }

    codeChunks.push({
      text: match,
      content_type: 'code',
      section_header: currentHeader,
    });

    return `__CODE_BLOCK_${codeChunks.length - 1}__`;
  });

  return { cleaned, codeChunks };
}
```

### Quiz Detection Pattern

Trailhead quiz patterns in markdown (from extract-content stage):
- Questions followed by lettered options: `A. answer`, `B. answer`, `C. answer`
- Questions in fieldsets with radio inputs (already extracted by extract-content into quiz_items table)
- For chunking: detect `**Question**` or numbered question patterns with options

Since quiz questions are already stored in `quiz_items` by the extract-content stage, the chunk-content stage should:
1. Fetch quiz items for this unit from the `quiz_items` table
2. Create one chunk per quiz item: `question_text + options.join('\n')`
3. Tag as `content_type: 'quiz'`
4. Remove quiz-like content from the markdown before chunking (to avoid duplication)

### Existing File State

| File | Current State |
|------|---------------|
| `apps/api/src/agents/` | Has `scraper-agent.ts` + `.gitkeep` — create `knowledge-agent.ts` here |
| `apps/api/src/pipeline/stages/` | Has `scrape-unit.ts`, `extract-content.ts` — create `identify-concepts.ts`, `chunk-content.ts` |
| `apps/api/src/prompts/` | Has `scraper-agent.yaml` — create `knowledge-agent.yaml` |
| `apps/api/src/pipeline/queue-handlers.ts` | Has `scrape-module`, `extract-content`, `dead-letter-scrape-module` handlers — add `identify-concepts`, `chunk-content` handlers, modify `extract-content` chaining |
| `apps/api/package.json` | Has `ai: ^6`, `yaml: ^2`, `node-html-parser: ^7` — add `@chonkiejs/core: ^0` |
| `apps/api/src/lib/agent-logger.ts` | Has `logToolTrace()` ✓ |
| `apps/api/src/lib/errors.ts` | Has `PipelineError`, `SessionExpiredError` ✓ |
| `packages/shared/src/types/trailhead.ts` | Has `SfKnowledgeChunk`, `Unit` — update both |
| `packages/db/supabase/migrations/` | Has 001-008 — create 009 |
| `apps/api/src/plugins/pg-boss.ts` | All 7 queues already created ✓ (including identify-concepts and chunk-content) |

### Testing Standards

**What NOT to test** [Source: architecture.md#Decision-13]:
- `generateObject` behavior (mocked completely)
- ChonkieJS internal chunking logic (trusted library)
- Supabase client operations (mock `from().select()`, `from().update()`, `from().insert()`)

**What to test:**
- Knowledge Agent calls `generateObject` with correct model and schema
- `identifyConcepts()` returns valid ConceptExtraction
- `identifyUnitConcepts()` stores concepts to units.sf_concepts
- `extractCodeBlocks()` correctly extracts and replaces code blocks
- `detectQuizChunks()` finds quiz patterns
- `detectHandsOnSteps()` groups sequential steps
- `chunkUnitContent()` creates chunks with correct metadata
- Queue handlers register with correct concurrency options
- Queue handlers chain to next stage

**Mock patterns for knowledge-agent.test.ts** (vi.hoisted required for ESM):
```typescript
const { mockGenerateObject } = vi.hoisted(() => {
  const mockGenerateObject = vi.fn().mockResolvedValue({
    object: {
      sf_topics: ['Apex', 'SOQL'],
      sf_objects: ['Account', 'Contact'],
      sf_api_names: ['Account.Name'],
      apex_keywords: ['trigger', 'batch'],
      flow_references: [],
      difficulty: 'intermediate',
      content_types: ['explanation', 'code'],
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

const { mockReadFile } = vi.hoisted(() => {
  const mockReadFile = vi.fn().mockResolvedValue(`
system: "You are a knowledge specialist"
identify_concepts: "Analyze: {{content}}"
classify_chunk: "Classify: {{chunk}}"
`);
  return { mockReadFile };
});
vi.mock('fs/promises', () => ({ readFile: mockReadFile }));
```

**Mock pattern for ChonkieJS in chunk-content.test.ts:**
```typescript
const { MockRecursiveChunker } = vi.hoisted(() => {
  const mockChunk = vi.fn().mockResolvedValue([
    { text: 'chunk 1 content', tokenCount: 200 },
    { text: 'chunk 2 content', tokenCount: 180 },
  ]);
  const MockRecursiveChunker = {
    create: vi.fn().mockResolvedValue({ chunk: mockChunk }),
  };
  return { MockRecursiveChunker, mockChunk };
});
vi.mock('@chonkiejs/core', () => ({ RecursiveChunker: MockRecursiveChunker }));
```

### ESM Import Requirements

All relative imports use `.js` extension:
```typescript
import { identifyConcepts } from '../../agents/knowledge-agent.js';
import { identifyUnitConcepts } from './stages/identify-concepts.js';
import { chunkUnitContent } from './stages/chunk-content.js';
```

### Supabase Structural Types

Use the established `PipelineClient` structural type pattern for Supabase operations. Since `sf_concepts` is JSONB and `sf_topics` is `TEXT[]`, the structural type needs to accommodate these:

```typescript
// For units table update with JSONB
const { error } = await (supabase as unknown as PipelineClient)
  .from('units')
  .update({ sf_concepts: JSON.stringify(concepts) })
  .eq('id', unit_id);

// For sf_knowledge_chunks insert
const { error } = await (supabase as unknown as PipelineClient)
  .from('sf_knowledge_chunks')
  .insert(chunks.map((chunk, index) => ({
    unit_id: input.unit_id,
    module_id: input.module_id,
    chunk_text: chunk.text,
    content_type: chunk.content_type,
    difficulty: concepts?.difficulty ?? null,
    sf_topics: concepts?.sf_topics ?? [],
    section_header: chunk.section_header,
    chunk_index: index,
  })));
```

### Key Learnings from Prior Stories

From Stories 2.1-2.4 (see `.ralph-progress.md`):
- `vi.hoisted()` required for ESM mock hoisting
- `as unknown as T` for structural type casts (never `as any`)
- Supabase returns `{ error }` object (does NOT throw) — always check
- `PipelineError` takes `(stage, message)` — reuse for new stages
- `logToolTrace` requires all fields from `ToolTraceParams`
- Queue handler tests capture the handler function via `vi.fn().mockImplementation((_q, _opts, handler) => {...})`

### Project Structure Notes

New files this story creates:
- `packages/db/supabase/migrations/009_knowledge_chunk_columns.sql` (1 file)
- `apps/api/src/agents/knowledge-agent.ts` + test (2 files)
- `apps/api/src/pipeline/stages/identify-concepts.ts` + test (2 files)
- `apps/api/src/pipeline/stages/chunk-content.ts` + test (2 files)
- `apps/api/src/prompts/knowledge-agent.yaml` (1 file)

Modified files:
- `apps/api/package.json` — Add `@chonkiejs/core`
- `apps/api/src/pipeline/queue-handlers.ts` + test — Add 2 handlers, modify extract-content chaining
- `packages/shared/src/types/trailhead.ts` — Update `SfKnowledgeChunk`, `Unit`

Total new test files: 3 (knowledge-agent, identify-concepts, chunk-content)
Estimated new test count: 25-30 tests

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.1 — Acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-3 — Shared-state sequential pipeline]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-4 — ChonkieJS + custom Trailhead rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-7 — Knowledge Agent with Claude Haiku, tiered model selection]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-8 — Queue concurrency: identify-concepts(5), chunk-content(5)]
- [Source: _bmad-output/planning-artifacts/architecture.md#AR20 — YAML prompt configuration at apps/api/src/prompts/]
- [Source: _bmad-output/planning-artifacts/architecture.md#AR21 — Zod validation with one retry]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-13 — What NOT to test]
- [Source: _bmad-output/implementation-artifacts/2-2-unit-content-extraction-pipeline.md — YAML loading pattern, agent mock patterns]
- [Source: _bmad-output/implementation-artifacts/2-4-session-expiry-detection-and-recovery.md — Queue handler modification patterns]
- [Source: apps/api/src/pipeline/queue-handlers.ts — BossWithWork structural type, handler registration pattern]
- [Source: apps/api/src/agents/scraper-agent.ts — loadScraperPrompts() YAML loading pattern to replicate]
- [Source: apps/api/src/lib/agent-logger.ts — logToolTrace() signature]
- [Source: apps/api/src/lib/errors.ts — PipelineError constructor]
- [Source: apps/api/src/plugins/pg-boss.ts — identify-concepts and chunk-content queues already created]
- [Source: packages/shared/src/types/trailhead.ts — SfKnowledgeChunk and Unit interfaces]
- [Source: packages/db/supabase/migrations/002_knowledge_tables.sql — Existing sf_knowledge_chunks schema]
- [Source: @chonkiejs/core — RecursiveChunker.create({ chunkSize }), chunk.text, chunk.tokenCount]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
