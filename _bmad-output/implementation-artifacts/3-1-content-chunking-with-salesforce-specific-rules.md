# Story 3-1: Content Chunking with Salesforce-Specific Rules

**Status:** ready-for-dev
**Epic:** Epic 3 — Knowledge Processing & Search
**Sprint:** Sprint 3
**Story Key:** `3-1-content-chunking-with-salesforce-specific-rules`
**Model:** haiku
**Dependencies:** Story 2-2 complete (unit.content_markdown populated after extract-content stage)
**Created:** 2026-02-19

---

## User Story

As a user,
I want extracted content chunked into structure-aware segments with Salesforce-specific tagging,
So that knowledge is organized for accurate retrieval.

---

## Acceptance Criteria

### AC1 — identify-concepts stage: Salesforce concept extraction
**Given** a unit has extracted content in `content_markdown` format
**When** the `identify-concepts` stage processes it
**Then** the Knowledge Agent (Claude Haiku) extracts Salesforce-specific concepts: object names, API names, Apex keywords, Flow references
**And** the output is validated with a Zod schema (one retry on validation failure)
**And** prompts are loaded from `apps/api/src/prompts/knowledge-agent.yaml`

### AC2 — chunk-content stage: structure-aware chunking with Trailhead rules
**Given** structured content is ready for chunking
**When** the `chunk-content` stage processes it
**Then** content is split into 400-512 token segments with 50-100 token overlap (for regular text)
**And** code blocks are kept intact as separate chunks (never split mid-block)
**And** quiz questions are atomic: one question + all options = one chunk with `content_type: 'quiz'`
**And** hands-on steps are grouped together (~800 tokens) with `content_type: 'hands_on'`

### AC3 — Knowledge chunk storage with enriched schema
**Given** chunks are created
**When** they are stored in `sf_knowledge_chunks`
**Then** each chunk includes: `chunk_text`, `content_type` (explanation|code|quiz|hands_on|reference|definition), `difficulty`, `sf_topics` array, `unit_id` foreign key, `section_header` metadata, and `chunk_index`

### AC4 — Pipeline stage chaining
**Given** the pipeline processes a unit
**When** `identify-concepts` and `chunk-content` stages complete
**Then** pg-boss chains: `extract-content` → `identify-concepts` → `chunk-content` → `generate-embeddings`

---

## Architecture Compliance Notes

### Pattern: Pipeline Stage Function
All pipeline stages follow the same pure-function pattern (established in extract-content.ts):
```typescript
// Stage function signature
export async function identifyUnitConcepts(
  input: IdentifyConceptsInput,
  supabase: ReturnType<typeof createClient>,
): Promise<void>

// Structural type for Supabase operations (generated types lag schema)
type PipelineClient = {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    };
    update(data: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
  };
};
// Usage: const db = supabase as unknown as PipelineClient;
```

### Pattern: Queue Handler Registration
From `queue-handlers.ts` — use existing `BossWithWork` structural type:
```typescript
await (boss as unknown as BossWithWork).work(
  'identify-concepts',
  { teamSize: 5, teamConcurrency: 5 },
  async (job: BossJob) => {
    const { unit_id, run_id } = job.data as { unit_id: string; run_id: string | null };
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    await identifyUnitConcepts({ unit_id, run_id }, supabase);
    await boss.send('chunk-content', { unit_id, run_id });
  },
);
```

### Pattern: AI SDK generateObject with Zod validation
From scraper-agent.ts — use `generateObject()` for structured LLM output:
```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { object } = await generateObject({
  model: anthropic('claude-haiku-4-5-20251001'),
  schema: conceptsSchema,          // Zod schema
  prompt: buildPrompt(markdown),
  maxRetries: 1,                   // One retry on schema validation failure
});
```

### Pattern: YAML prompt loading
From scraper-agent.ts (`apps/api/src/pipeline/stages/scraper-agent.ts`):
```typescript
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsPath = path.join(__dirname, '../../prompts/knowledge-agent.yaml');
const prompts = parseYaml(readFileSync(promptsPath, 'utf-8')) as KnowledgeAgentPrompts;
```

### Pattern: No `any` types
Use `unknown` + type narrowing or Zod parsing:
```typescript
// DO NOT: as any
// DO: as unknown as TargetType (for structural types)
const db = supabase as unknown as PipelineClient;
const unit = rows[0] as unknown as { content_markdown: string | null; sf_concepts: unknown };
```

### Pattern: Error handling
Always throw `PipelineError` from pipeline stages:
```typescript
import { PipelineError } from '../../lib/errors.js';

if (!unit.content_markdown) {
  throw new PipelineError('identify-concepts', `Unit has no content_markdown: ${input.unit_id}`);
}
```

### Pattern: ESM imports (`.js` extensions required)
```typescript
import { identifyUnitConcepts } from './stages/identify-concepts.js';
import { chunkUnitContent } from './stages/chunk-content.js';
```

---

## Database Schema Changes

### Current `sf_knowledge_chunks` schema (migration 002)
```sql
CREATE TABLE sf_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),
  confidence_score NUMERIC(4,3),
  source_url TEXT,
  chunk_index INTEGER,
  fts tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Required additions (migration 009)
```sql
-- Enhance sf_knowledge_chunks for Story 3.1 requirements
ALTER TABLE sf_knowledge_chunks
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'explanation'
    CHECK (content_type IN ('explanation', 'code', 'quiz', 'hands_on', 'reference', 'definition')),
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'beginner'
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS sf_topics TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS section_header TEXT;

-- Add sf_concepts column to units for identify-concepts output
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS sf_concepts JSONB DEFAULT '{}';
```

Migration filename: `009_enhance_knowledge_chunks.sql`
Next available sequence number (008 was the failure_reason migration from Story 2.4).

---

## Key Implementation Details

### Token Counting Strategy
The architecture specifies ChonkieJS but this is a Python library with no direct npm equivalent. Use **`js-tiktoken`** for token counting:

```typescript
// Install: pnpm --filter @trailblaze/api add js-tiktoken
import { encoding_for_model } from 'js-tiktoken';

const enc = encoding_for_model('gpt-4');
function countTokens(text: string): number {
  const tokens = enc.encode(text);
  return tokens.length;
}
```

**Chunking algorithm (implement directly — no ChonkieJS dependency needed):**
```typescript
// For regular text blocks: split by paragraphs, then merge until ~450 token target
function chunkTextContent(text: string, sfTopics: string[], sectionHeader: string | null): ChunkCandidate[] {
  const TARGET_TOKENS = 450; // middle of 400-512 range
  const OVERLAP_TOKENS = 75; // middle of 50-100 range
  const paragraphs = text.split(/\n{2,}/);

  const chunks: ChunkCandidate[] = [];
  let current = '';
  let currentTokens = 0;

  for (const para of paragraphs) {
    const paraTokens = countTokens(para);
    if (currentTokens + paraTokens > 512 && current) {
      // Emit current chunk
      chunks.push({ text: current.trim(), tokens: currentTokens });
      // Start next chunk with overlap
      const words = current.split(' ');
      const overlapText = words.slice(-Math.floor(words.length * 0.15)).join(' ');
      current = overlapText + '\n\n' + para;
      currentTokens = countTokens(current);
    } else {
      current = current ? current + '\n\n' + para : para;
      currentTokens += paraTokens;
    }
  }
  if (current.trim()) chunks.push({ text: current.trim(), tokens: currentTokens });
  return chunks;
}
```

### Markdown Section Detection
The chunk-content stage must parse content_markdown to detect structural sections. The markdown from `parseHtmlToMarkdown()` produces:
- `# Heading` / `## Heading` / `### Heading` — section boundaries
- ` ```\n...\n``` ` — code blocks (keep intact)
- `- item` / `1. item` — list items
- Regular paragraphs

**Detection logic:**
```typescript
type MarkdownSection =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'code'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list_item'; text: string; ordered: boolean };

function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split('\n');
  const sections: MarkdownSection[] = [];
  let inCodeBlock = false;
  let codeContent = '';

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        sections.push({ type: 'code', text: codeContent });
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }
    // Headings, paragraphs, list items...
  }
  return sections;
}
```

### Quiz Detection in Markdown
Quiz questions extracted by `extractQuizQuestions()` (Story 2.2) are stored as `quiz_items` rows. For chunking, detect them from content_markdown by looking for patterns like:
- Questions ending in `?`
- Followed by bullet list options (A., B., C., D. pattern or similar)

Alternatively, fetch `quiz_items` for the unit from the database and create atomic quiz chunks from those records. **Preferred approach: read quiz_items from DB** (more reliable than markdown parsing).

```typescript
// Fetch quiz items for this unit to create atomic quiz chunks
const { data: quizItems } = await db.from('quiz_items')
  .select('question_text, options')
  .eq('unit_id', unit_id);

for (const item of quizItems ?? []) {
  const quizText = `${item.question_text}\n${(item.options as string[]).map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`;
  chunks.push({
    chunk_text: quizText,
    content_type: 'quiz',
    difficulty: extractedDifficulty,
    sf_topics: sfTopics,
    section_header: null,
    chunk_index: chunkIndex++,
    unit_id,
    module_id,
  });
}
```

### Hands-on Step Detection
Detect by ordered list items that start with action verbs (Click, Navigate, Enter, Open, Select, Go to, etc.) grouped in runs:
```typescript
function isHandsOnStep(text: string): boolean {
  return /^(click|navigate|enter|type|open|select|go to|drag|create|configure|enable|disable|set|save|submit)\b/i.test(text.trim());
}
```

Group consecutive hands-on list items until ~800 tokens threshold.

### Concepts Schema for identify-concepts
```typescript
const ConceptsSchema = z.object({
  object_names: z.array(z.string()).describe('Salesforce standard/custom object names (e.g., Account, Opportunity, Case)'),
  api_names: z.array(z.string()).describe('Salesforce API field names (e.g., FirstName, AccountId, IsActive__c)'),
  apex_keywords: z.array(z.string()).describe('Apex keywords and methods (e.g., trigger, SOQL, governor limits)'),
  flow_references: z.array(z.string()).describe('Flow/Process Builder/Workflow references'),
  sf_topics: z.array(z.string()).describe('High-level Salesforce topic tags (e.g., Sales Cloud, Service Cloud, Lightning)'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('Content difficulty level'),
});
```

### YAML Prompt Structure
```yaml
# apps/api/src/prompts/knowledge-agent.yaml
identify_concepts:
  system: |
    You are a Salesforce knowledge extraction expert. Extract structured information
    from Salesforce Trailhead educational content. Return ONLY the JSON object requested.

  user_template: |
    Extract Salesforce-specific concepts from this Trailhead content:

    <content>
    {{content}}
    </content>

    Extract:
    - object_names: Standard/custom Salesforce objects mentioned (Account, Contact, etc.)
    - api_names: API names and field names mentioned (e.g., IsActive__c, AccountId)
    - apex_keywords: Apex code keywords, methods, governor limits concepts
    - flow_references: Flow, Process Builder, Workflow Rule references
    - sf_topics: High-level topic tags (Sales Cloud, Service Cloud, Admin, Developer, etc.)
    - difficulty: beginner | intermediate | advanced based on content complexity
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `packages/db/supabase/migrations/009_enhance_knowledge_chunks.sql` | Add unit_id, content_type, difficulty, sf_topics, section_header to sf_knowledge_chunks; add sf_concepts to units |
| `apps/api/src/prompts/knowledge-agent.yaml` | YAML prompts for Knowledge Agent |
| `apps/api/src/pipeline/stages/identify-concepts.ts` | identify-concepts stage implementation |
| `apps/api/src/pipeline/stages/identify-concepts.test.ts` | Unit tests for identify-concepts |
| `apps/api/src/pipeline/stages/chunk-content.ts` | chunk-content stage implementation |
| `apps/api/src/pipeline/stages/chunk-content.test.ts` | Unit tests for chunk-content |

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/pipeline/queue-handlers.ts` | Register identify-concepts + chunk-content workers; update extract-content to chain to identify-concepts |
| `apps/api/src/index.ts` | Create new queues at startup (identify-concepts, chunk-content) |
| `packages/shared/src/types/trailhead.ts` | Update `SfKnowledgeChunk` to include new fields |

---

## Tasks

### Task 1: Database migration — enhance sf_knowledge_chunks schema
- [ ] 1.1 Write test verifying migration SQL is syntactically valid and adds correct columns
  - (Use a simple string-contains check on the SQL file content — no DB needed)
- [ ] 1.2 Create `packages/db/supabase/migrations/009_enhance_knowledge_chunks.sql`
  - `unit_id UUID REFERENCES units(id) ON DELETE CASCADE` — nullable (for backwards compat)
  - `content_type TEXT NOT NULL DEFAULT 'explanation' CHECK (content_type IN ('explanation', 'code', 'quiz', 'hands_on', 'reference', 'definition'))`
  - `difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced'))`
  - `sf_topics TEXT[] NOT NULL DEFAULT '{}'`
  - `section_header TEXT` — nullable
  - ALTER TABLE `units` ADD COLUMN `sf_concepts JSONB DEFAULT '{}'`
- [ ] 1.3 Update `SfKnowledgeChunk` interface in `packages/shared/src/types/trailhead.ts`
  - Add: `unit_id: string | null`, `content_type: ContentType`, `difficulty: string | null`, `sf_topics: string[]`, `section_header: string | null`
  - Add: `export type ContentType = 'explanation' | 'code' | 'quiz' | 'hands_on' | 'reference' | 'definition'`
  - Rename: keep `chunk_text` (do NOT rename to `content` — matches actual DB column name)
- [ ] 1.4 Update `Unit` interface in `packages/shared/src/types/trailhead.ts`
  - Add: `sf_concepts: Record<string, unknown> | null`

### Task 2: Knowledge Agent YAML prompt
- [ ] 2.1 Write test: knowledge-agent.yaml file exists and has expected keys
  - `test('knowledge-agent.yaml has identify_concepts section')`
  - Test that the file parses and has `identify_concepts.system` and `identify_concepts.user_template`
- [ ] 2.2 Create `apps/api/src/prompts/knowledge-agent.yaml`
  - `identify_concepts.system`: expert concept extractor system prompt
  - `identify_concepts.user_template`: template with `{{content}}` placeholder

### Task 3: identify-concepts stage implementation
- [ ] 3.1 Write failing tests for `identifyUnitConcepts()` (RED phase)
  - Test: throws PipelineError when unit not found
  - Test: throws PipelineError when unit has no content_markdown
  - Test: calls generateObject() with correct schema and Haiku model
  - Test: stores concepts result in units.sf_concepts via Supabase update
  - Test: retries once on generateObject validation failure (maxRetries: 1)
- [ ] 3.2 Create `apps/api/src/pipeline/stages/identify-concepts.ts`
  - Import: `generateObject` from `ai`, `anthropic` from `@ai-sdk/anthropic`
  - Import: `readFileSync`, `parseYaml`, path utils for YAML loading
  - Define `IdentifyConceptsInput` interface: `{ unit_id: string; run_id: string | null }`
  - Define `ConceptsSchema` (Zod) with: object_names, api_names, apex_keywords, flow_references, sf_topics, difficulty
  - Define `PipelineClient` structural type (matching pattern from extract-content.ts)
  - Export `identifyUnitConcepts(input, supabase)`:
    1. Load YAML prompts at module level (not per-call — performance)
    2. Fetch unit: `db.from('units').select('content_markdown').eq('id', unit_id)`
    3. Throw PipelineError if not found or no content_markdown
    4. Build prompt from YAML template with content_markdown
    5. Call `generateObject({ model: anthropic('claude-haiku-4-5-20251001'), schema: ConceptsSchema, prompt, maxRetries: 1 })`
    6. Update `units.sf_concepts` with the extracted concepts object
    7. Throw PipelineError on any DB error
- [ ] 3.3 Run tests: all identify-concepts tests pass (GREEN phase)
- [ ] 3.4 Refactor: ensure no `any` types, correct `.js` extensions in imports

### Task 4: chunk-content stage implementation
- [ ] 4.1 Write failing tests for `chunkUnitContent()` (RED phase)
  - Test: code block produces single chunk with `content_type: 'code'`, preserved intact
  - Test: quiz items fetched from DB produce atomic chunks with `content_type: 'quiz'`
  - Test: regular text paragraphs produce chunks within 400-512 token range
  - Test: hands-on step paragraphs (ordered lists with action verbs) produce `content_type: 'hands_on'` chunks
  - Test: section headers stored as `section_header` metadata on chunks
  - Test: all chunks get `sf_topics` from unit's `sf_concepts`
  - Test: throws PipelineError when unit not found
  - Test: throws PipelineError on sf_knowledge_chunks insert error
  - Test: chunk_index increments sequentially from 0
- [ ] 4.2 Install `js-tiktoken`: `pnpm --filter @trailblaze/api add js-tiktoken`
- [ ] 4.3 Create `apps/api/src/pipeline/stages/chunk-content.ts`
  - Define `ChunkContentInput` interface: `{ unit_id: string; run_id: string | null }`
  - Define internal `ChunkRow` type for DB insert (matches sf_knowledge_chunks columns)
  - Define `PipelineClient` structural type (extend to cover quiz_items.select)
  - Export `parseMarkdownSections(markdown: string): MarkdownSection[]`
    - Handles: headings (h1-h4), code blocks (``` fenced), paragraphs, ordered/unordered lists
    - Returns typed discriminated union sections
  - Export `isHandsOnStep(text: string): boolean`
    - Returns true if text starts with action verb (click, navigate, etc.)
  - Export `countTokens(text: string): number`
    - Uses js-tiktoken `encoding_for_model('gpt-4')`
    - **Initialize encoder once at module level** (expensive operation)
  - Export `chunkUnitContent(input, supabase)`:
    1. Fetch unit: `select('content_markdown, sf_concepts, module_id')` (need module_id for chunk insert)
    2. Throw PipelineError if not found or no content_markdown
    3. Extract `sfTopics` from `sf_concepts.sf_topics` (default to `[]` if missing)
    4. Extract `difficulty` from `sf_concepts.difficulty` (default to `'beginner'`)
    5. Fetch quiz items for unit from `quiz_items` table
    6. Parse `content_markdown` into `MarkdownSection[]`
    7. Process sections:
       - `code` sections → single chunk, content_type: 'code'
       - Quiz item matches → atomic quiz chunk, content_type: 'quiz'
       - `hands_on` action verb lists → group sections, content_type: 'hands_on'
       - Regular text → merge paragraphs into 400-512 token chunks, content_type: 'explanation'
    8. Track current `section_header` from heading sections
    9. Insert all chunks into `sf_knowledge_chunks` with `chunk_index` 0, 1, 2...
    10. Throw PipelineError on insert error
- [ ] 4.4 Run tests: all chunk-content tests pass (GREEN phase)
- [ ] 4.5 Refactor: clean up any code duplication, ensure token counting is accurate

### Task 5: Queue handler updates and pipeline chaining
- [ ] 5.1 Write failing tests for queue registration (RED phase)
  - Test: `registerQueueHandlers()` registers 'identify-concepts' and 'chunk-content' workers
  - Test: extract-content worker chains to 'identify-concepts' after success
  - Test: identify-concepts worker calls `identifyUnitConcepts()` and chains to 'chunk-content'
  - Test: chunk-content worker calls `chunkUnitContent()` and chains to 'generate-embeddings'
- [ ] 5.2 Create new queues in `apps/api/src/index.ts` (where boss.createQueue calls live)
  - `await boss.createQueue('identify-concepts', { retryLimit: 2, retryBackoff: true, expireInHours: 0.5 });`
  - `await boss.createQueue('chunk-content', { retryLimit: 2, expireInMinutes: 10 });`
  - Note: `generate-embeddings` queue can be created here too (Story 3.2 will add its worker)
- [ ] 5.3 Update `apps/api/src/pipeline/queue-handlers.ts`
  - Add imports for `identifyUnitConcepts` and `chunkUnitContent`
  - Update extract-content worker: after `extractUnitContent()` succeeds, add `await boss.send('identify-concepts', { unit_id, run_id })`
  - Add identify-concepts worker: teamSize: 5, calls `identifyUnitConcepts()`, chains to chunk-content
  - Add chunk-content worker: teamSize: 5, calls `chunkUnitContent()`, chains to `generate-embeddings`
- [ ] 5.4 Run all tests: all queue-handler tests pass (GREEN phase)

### Task 6: Full test suite verification
- [ ] 6.1 Run `pnpm --filter @trailblaze/api test` — all tests pass (including pre-existing 162 tests)
- [ ] 6.2 Run `pnpm type-check` — 0 TypeScript errors

---

## Test Mocking Guide

### Mocking AI SDK `generateObject`
```typescript
// In test file
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));
import { generateObject } from 'ai';
const mockGenerateObject = vi.mocked(generateObject);

// In test
mockGenerateObject.mockResolvedValue({
  object: {
    object_names: ['Account', 'Contact'],
    api_names: ['AccountId', 'FirstName'],
    apex_keywords: ['trigger', 'SOQL'],
    flow_references: [],
    sf_topics: ['Sales Cloud'],
    difficulty: 'beginner',
  },
});
```

### Mocking Supabase for pipeline stages
Follow the same `PipelineClient` structural type mock pattern from extract-content.test.ts:
```typescript
function makeMockClient(overrides: Partial<{ units: unknown; sf_knowledge_chunks: unknown; quiz_items: unknown }> = {}) {
  const defaults = {
    units: { content_markdown: '## Hello\n\nSome content', sf_concepts: {}, module_id: 'mod-1' },
    sf_knowledge_chunks: null,
    quiz_items: [],
  };
  return {
    from: (table: string) => {
      if (table === 'units') return {
        select: () => ({ eq: () => Promise.resolve({ data: [overrides.units ?? defaults.units], error: null }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
      if (table === 'quiz_items') return {
        select: () => ({ eq: () => Promise.resolve({ data: overrides.quiz_items ?? defaults.quiz_items, error: null }) }),
      };
      if (table === 'sf_knowledge_chunks') return {
        insert: () => Promise.resolve({ error: overrides.sf_knowledge_chunks ?? null }),
      };
      return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
    },
  };
}
```

### Mocking YAML file reading (identify-concepts.ts)
The YAML is read at module init time. Mock `fs.readFileSync` or use `vi.mock`:
```typescript
// identify-concepts.ts: load YAML at module level
// In tests: use vi.mock('fs') or provide a real fixture file
// Easiest: mock the yaml module + fs together

vi.mock('../../prompts/knowledge-agent.yaml', () => ({  // if using import
  default: { identify_concepts: { system: 'sys', user_template: '{{content}}' } }
}));
// OR: let the real YAML file load (preferred — tests the integration)
```

**Preferred approach:** Let identify-concepts.ts read the real YAML file. The test will exercise the real prompt loading. Create `knowledge-agent.yaml` before writing the tests.

### Mocking js-tiktoken
```typescript
vi.mock('js-tiktoken', () => ({
  encoding_for_model: () => ({
    encode: (text: string) => new Uint32Array(Math.ceil(text.length / 4)), // approximate
  }),
}));
```

---

## Key Learnings from Previous Stories

### From Story 2.2 (extract-content):
- `PipelineClient` structural type avoids generated-type lag issues — use exact same pattern
- `as unknown as PipelineClient` is the established cast pattern — never use `as any`
- `node-html-parser` is already installed — use it for any additional HTML parsing if needed
- Supabase `insert()` takes an array, not a single object: `db.from('table').insert([rowObject])`

### From Story 2.3 (queue handlers):
- `boss.work()` with `{ teamSize: N, teamConcurrency: N }` is the established concurrency pattern
- Chain jobs by calling `boss.send(nextQueue, payload)` inside the worker after success
- Don't chain inside the stage function itself — chaining belongs in queue-handlers.ts
- `BossWithWork` structural type is already defined in queue-handlers.ts — reuse it

### From Story 2.4 (session expiry):
- pg-boss `send()` is available on the boss instance directly (not a structural type)
- Handle errors BEFORE doing follow-up operations (e.g., update DB before calling boss.send)
- `throw err` at the end of a catch block makes pg-boss retry — use `return` to prevent retries

### From Story 1.1 (API foundation):
- Queues are created at API startup in `apps/api/src/index.ts`
- Queue config: `{ retryLimit: 2, retryBackoff: true, expireInHours: 0.5 }` for identify-concepts
- Queue config: `{ retryLimit: 2, expireInMinutes: 10 }` for chunk-content (no browser wait)
- Check the queue creation block in index.ts — the `scrape-module` and `extract-content` queues are already there

---

## Implementation Notes

### js-tiktoken Usage Warning
`encoding_for_model()` is expensive to initialize. Initialize the encoder at module level (outside function), not inside the chunking function:
```typescript
// CORRECT — module level
const enc = encoding_for_model('gpt-4');
export function countTokens(text: string): number {
  return enc.encode(text).length;
}

// WRONG — inside function (creates new encoder on every call)
export function countTokens(text: string): number {
  const enc = encoding_for_model('gpt-4'); // DON'T DO THIS
  return enc.encode(text).length;
}
```

### Content Type Detection Order
When processing markdown sections, apply rules in this priority order:
1. **Code block** (` ``` ` fenced) → content_type: 'code' — always atomic, never split
2. **Quiz items from DB** → content_type: 'quiz' — always atomic
3. **Ordered list with action verbs** → content_type: 'hands_on' — group up to ~800 tokens
4. **Regular text** → content_type: 'explanation' — split at 400-512 tokens

### Module ID Source
`sf_knowledge_chunks` has `module_id` (not just `unit_id`). When inserting chunks, fetch the unit's `module_id` from the DB alongside `content_markdown`. The PipelineClient type for chunk-content.ts must include `module_id` in the select return type.

### Generate-Embeddings Queue
Story 3.2 will implement the `generate-embeddings` worker. For Story 3.1, just create the queue and chain to it — the queue will accept jobs even without a registered worker (they'll wait in pending state until Story 3.2 registers the handler).

### Supabase client bulk insert
Use a single `insert()` call with an array for efficiency:
```typescript
const chunkRows = chunks.map((c, i) => ({
  unit_id: input.unit_id,
  module_id,
  chunk_text: c.text,
  content_type: c.contentType,
  difficulty,
  sf_topics: sfTopics,
  section_header: c.sectionHeader ?? null,
  chunk_index: i,
}));

const { error: insertError } = await db.from('sf_knowledge_chunks').insert(chunkRows);
if (insertError) {
  throw new PipelineError('chunk-content', `Failed to insert chunks: ${insertError.message}`);
}
```

---

## Definition of Done

- [ ] All tasks marked `[x]` (implementation AND tests passing)
- [ ] `pnpm --filter @trailblaze/api test` passes (all tests including pre-existing 162)
- [ ] `pnpm type-check` reports 0 errors across all packages
- [ ] No `any` types in production files (test files may use `as unknown` casts)
- [ ] YAML prompt file exists at `apps/api/src/prompts/knowledge-agent.yaml`
- [ ] Migration file `009_enhance_knowledge_chunks.sql` creates required columns
- [ ] Queue handlers registered: `identify-concepts`, `chunk-content`
- [ ] Pipeline chain verified: extract-content → identify-concepts → chunk-content → generate-embeddings
