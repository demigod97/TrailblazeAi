# Story 2.2: Unit Content Extraction Pipeline

Status: done

## Story

As a user,
I want the system to automatically navigate to Trailhead unit pages and extract full content,
So that module content is captured for knowledge processing.

## Acceptance Criteria

1. **[AC1]** Given a module has status "pending" and a scrape job is queued, when the Scraper Agent processes the job, then it navigates to each unit page via Playwright MCP and extracts: text content, code blocks, quiz questions with options, and learning objectives; and the module status transitions from "pending" to "scraping" to "scraped".

2. **[AC2]** Given raw HTML is extracted from a unit page, when the extract-content stage processes it, then the HTML is parsed into structured sections: headers, explanatory text, code blocks (preserved intact), and quiz items; and content is stored as markdown in the units table with content_markdown column.

3. **[AC3]** Given a unit contains quiz questions, when the extraction completes, then each question is stored in the quiz_items table with: question text, answer options, and submission control identifiers.

4. **[AC4]** Given a scrape job completes successfully, when all units in the module are scraped, then pg-boss automatically chains to the extract-content queue for the next pipeline stage; and the Scraper Agent prompts are loaded from `apps/api/src/prompts/scraper-agent.yaml`.

5. **[AC5]** Given the system is scraping modules, when human-like delays are applied, then 2-5 seconds elapse between page navigations to maintain account safety.

## Tasks / Subtasks

- [x] Task 1: Add yaml dependency and create scraper prompt file (AC4)
  - [x] 1.1 Add `"yaml": "^2"` to `dependencies` in `apps/api/package.json`
  - [x] 1.2 Run `pnpm install --filter @trailblaze/api` to update lockfile
  - [x] 1.3 Create directory `apps/api/src/prompts/` (new — not in codebase yet)
  - [x] 1.4 Create `apps/api/src/prompts/scraper-agent.yaml` with sections: `system`, `navigate`, `extract` (see Dev Notes for content)
  - [x] 1.5 Confirm TypeScript type-check passes after adding yaml import to verify types are available: `pnpm type-check`

- [x] Task 2: Create Scraper Agent (AC1, AC4, AC5)
  - [x] 2.1 Write failing test `apps/api/src/agents/scraper-agent.test.ts`:
    - Test: `loadScraperPrompts()` returns an object with `system`, `navigate`, and `extract` string fields parsed from YAML
    - Test: `runScraperAgent()` calls `generateText` with `maxSteps: 20` and `tools` from the MCP client
    - Test: `runScraperAgent()` calls `playwrightMCP.callTool('browser_evaluate', ...)` to capture raw HTML after the agent loop
    - Test: `runScraperAgent()` calls `logToolTrace` with `agent_type: 'scraper'` and `tool_type: 'playwright_mcp'`
    - Test: `runScraperAgent()` returns `{ raw_html: string; duration_ms: number }`
    - Test: `runScraperAgent()` throws if `browser_evaluate` returns no content
  - [x] 2.2 Create `apps/api/src/agents/scraper-agent.ts`:
    - Import `generateText` from `ai`, `anthropic` from `@ai-sdk/anthropic`
    - Import `parse` from `yaml`, `readFile` from `fs/promises`, `fileURLToPath` from `url`, `dirname`/`join` from `path`
    - Import `PlaywrightMCPClient` from `../lib/mcp-client.js`
    - Import `logToolTrace` from `../lib/agent-logger.js`
    - Import `createClient` from `@trailblaze/db`
    - Import `Unit` from `@trailblaze/shared`
    - Export interface `ScraperPrompts { system: string; navigate: string; extract: string; }`
    - Export `async function loadScraperPrompts(): Promise<ScraperPrompts>` — reads `../prompts/scraper-agent.yaml` relative to this file using `__dirname`, parses with `yaml.parse()`
    - Export interface `ScraperAgentParams { unit: Unit; playwrightMCP: PlaywrightMCPClient; supabase: ReturnType<typeof createClient>; run_id: string | null; }`
    - Export `async function runScraperAgent(params: ScraperAgentParams): Promise<{ raw_html: string; duration_ms: number }>`:
      1. `const startTime = Date.now()`
      2. `const prompts = await loadScraperPrompts()`
      3. `const tools = await params.playwrightMCP.tools()`
      4. Call `generateText({ model: anthropic('claude-haiku-4-5-20251001'), tools, maxSteps: 20, system: prompts.system, messages: [{ role: 'user', content: prompts.navigate.replace('{{url}}', params.unit.url) }] })` — this runs the ReAct navigation loop
      5. Call `params.playwrightMCP.callTool('browser_evaluate', { expression: 'document.documentElement.outerHTML' })` to capture raw HTML
      6. Extract HTML text from tool result: result is `{ content: Array<{ type: string; text?: string }> }` — join all text fields
      7. Throw `PipelineError` if HTML is empty or extraction failed
      8. Call `logToolTrace(params.supabase, { run_id: params.run_id, agent_type: 'scraper', tool_type: 'playwright_mcp', query: params.unit.url, raw_output: rawHtml.substring(0, 50000), summary: `Scraped unit: ${params.unit.title}`, raw_output_truncated: rawHtml.length > 50000, input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0, duration_ms: Date.now() - startTime, confidence_score: null, related_chunk_ids: null })`
      9. Return `{ raw_html: rawHtml, duration_ms: Date.now() - startTime }`
  - [x] 2.3 Run `pnpm --filter @trailblaze/api test`; confirm 2.1 tests pass

- [x] Task 3: Create scrape-unit pipeline stage (AC1, AC5)
  - [x] 3.1 Write failing test `apps/api/src/pipeline/stages/scrape-unit.test.ts`:
    - Test: `scrapeModule()` fetches all units for the module from Supabase
    - Test: `scrapeModule()` updates module status to `'scraping'` before processing units
    - Test: `scrapeModule()` calls `runScraperAgent()` for each unit
    - Test: `scrapeModule()` stores returned `raw_html` in the `units` table (`content` → `raw_html`)
    - Test: `scrapeModule()` applies delay between units (mocked — verify `setTimeout` or delay function called at least `unitCount - 1` times)
    - Test: `scrapeModule()` updates module status to `'scraped'` after all units complete
    - Test: `scrapeModule()` throws `PipelineError` if module not found in Supabase
    - Test: `scrapeModule()` propagates errors and does NOT silently swallow them
  - [x] 3.2 Create `apps/api/src/pipeline/stages/scrape-unit.ts`:
    - Import `createClient` from `@trailblaze/db`
    - Import `PipelineError` from `../../lib/errors.js`
    - Import `runScraperAgent` from `../../agents/scraper-agent.js`
    - Import `createPlaywrightMCP` from `../../lib/mcp-client.js`
    - Import `Unit` from `@trailblaze/shared`
    - Export interface `ScrapeModuleInput { module_id: string; run_id: string | null; }`
    - Export `const SCRAPE_DELAY_MS = { min: 2000, max: 5000 };` (exported for testing)
    - Export `async function randomDelay(): Promise<void>` — `await new Promise(resolve => setTimeout(resolve, SCRAPE_DELAY_MS.min + Math.random() * (SCRAPE_DELAY_MS.max - SCRAPE_DELAY_MS.min)))`
    - Export `async function scrapeModule(input: ScrapeModuleInput, supabase: ReturnType<typeof createClient>): Promise<void>`:
      1. Fetch units for `input.module_id` from `units` table ordered by `unit_index`
      2. If no units found, throw `new PipelineError('scrape-module', 'No units found for module ' + input.module_id)`
      3. Update module status to `'scraping'` in `modules` table
      4. Create Playwright MCP client: `const playwrightMCP = await createPlaywrightMCP()`
      5. For each unit (index `i`):
         - Call `const result = await runScraperAgent({ unit, playwrightMCP, supabase, run_id: input.run_id })`
         - Update `units` table: set `raw_html = result.raw_html` where `id = unit.id`
         - If NOT the last unit, call `await randomDelay()` (AC5)
      6. Update module status to `'scraped'` in `modules` table
  - [x] 3.3 Run tests; confirm 3.1 tests pass

- [x] Task 4: Create extract-content pipeline stage (AC2, AC3)
  - [x] 4.1 Write failing test `apps/api/src/pipeline/stages/extract-content.test.ts`:
    - Test: `extractUnitContent()` reads `raw_html` from the `units` table by `unit_id`
    - Test: `extractUnitContent()` converts HTML headings (`<h1>`, `<h2>`, `<h3>`) to markdown `# H1`, `## H2`, `### H3`
    - Test: `extractUnitContent()` converts `<p>` elements to plain text lines
    - Test: `extractUnitContent()` preserves code blocks intact: `<pre><code>` → ` ```code``` ` in output (never split)
    - Test: `extractUnitContent()` stores `content_markdown` in `units` table
    - Test: `extractUnitContent()` detects quiz questions (elements with `data-qa="quiz-question"` or labels inside a fieldset with radio inputs) and inserts them into `quiz_items` table
    - Test: `extractUnitContent()` throws `PipelineError` if unit has no `raw_html` (not yet scraped)
    - Test: `extractUnitContent()` handles units with no quiz questions (stores empty quiz_items list, does not throw)
  - [x] 4.2 Create `apps/api/src/pipeline/stages/extract-content.ts`:
    - Import `parse` from `node-html-parser`
    - Import `createClient` from `@trailblaze/db`
    - Import `PipelineError` from `../../lib/errors.js`
    - Export interface `ExtractContentInput { unit_id: string; run_id: string | null; }`
    - Export interface `ExtractedQuizQuestion { question_text: string; options: string[]; selector_hints: string; }`
    - Export `function parseHtmlToMarkdown(html: string): string` — converts HTML to markdown:
      - Use `node-html-parser.parse(html)` to get DOM
      - Walk elements: h1→`# text`, h2→`## text`, h3→`### text`, h4→`#### text`
      - `<p>` → text content + newline
      - `<pre>` or `<code>` block → ` ```\ncontent\n``` ` (preserve exactly as-is, never split)
      - `<ul><li>` → `- item`
      - `<ol><li>` → `1. item`
      - Join sections with `\n\n`
    - Export `function extractQuizQuestions(html: string): ExtractedQuizQuestion[]` — finds quiz questions:
      - Parse HTML, find `fieldset` elements containing radio inputs (Trailhead quiz pattern)
      - Also check for elements with class containing "quiz" or "question"
      - For each found question: extract legend/label text as `question_text`, all radio option labels as `options[]`, store `name` attribute of inputs as `selector_hints`
      - Return empty array if none found
    - Export `async function extractUnitContent(input: ExtractContentInput, supabase: ReturnType<typeof createClient>): Promise<void>`:
      1. Fetch unit from `units` table by `input.unit_id`
      2. If `unit.raw_html` is null or empty, throw `new PipelineError('extract-content', 'Unit has no raw HTML: ' + input.unit_id)`
      3. Call `const markdown = parseHtmlToMarkdown(unit.raw_html)`
      4. Update `units` table: set `content_markdown = markdown` where `id = input.unit_id`
      5. Call `const questions = extractQuizQuestions(unit.raw_html)`
      6. For each question: insert into `quiz_items` table with `{ unit_id: input.unit_id, question_text, question_type: 'multiple_choice', options: question.options, correct_answer: '', explanation: question.selector_hints, related_chunk_ids: [], display_order: index }`
      7. (No throw for empty questions — quiz pages are optional)
  - [x] 4.3 Run tests; confirm 4.1 tests pass

- [x] Task 5: Create queue handlers and register workers (AC4)
  - [x] 5.1 Write failing test `apps/api/src/pipeline/queue-handlers.test.ts`:
    - Test: `registerQueueHandlers()` calls `boss.work('scrape-module', ...)` with `{ teamSize: 2, teamConcurrency: 2 }` options
    - Test: `registerQueueHandlers()` calls `boss.work('extract-content', ...)` with `{ teamSize: 5, teamConcurrency: 5 }` options
    - Test: the `scrape-module` job handler calls `scrapeModule()` with the job data and then sends `extract-content` jobs to pg-boss for each unit
    - Test: the `extract-content` job handler calls `extractUnitContent()` with the job data
    - Test: the `scrape-module` handler updates module status to `'failed'` and rethrows if `scrapeModule()` throws (so pg-boss retry mechanism works)
  - [x] 5.2 Create `apps/api/src/pipeline/queue-handlers.ts`:
    - Import `PgBoss` from `pg-boss`
    - Import `createClient` from `@trailblaze/db`
    - Import `config` from `../config.js`
    - Import `scrapeModule` from `./stages/scrape-unit.js`
    - Import `extractUnitContent` from `./stages/extract-content.js`
    - Export `async function registerQueueHandlers(boss: PgBoss): Promise<void>`:
      - Register `scrape-module` worker with concurrency `{ teamSize: 2, teamConcurrency: 2 }`:
        ```typescript
        await boss.work('scrape-module', { teamSize: 2, teamConcurrency: 2 }, async (job) => {
          const { module_id, run_id } = job.data as { module_id: string; run_id: string | null };
          const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
          try {
            await scrapeModule({ module_id, run_id }, supabase);
            // Chain to extract-content for each unit
            const { data: units } = await supabase
              .from('units')
              .select('id')
              .eq('module_id', module_id)
              .not('raw_html', 'is', null);
            for (const unit of units ?? []) {
              await boss.send('extract-content', { unit_id: unit.id, run_id });
            }
          } catch (err) {
            // Rethrow so pg-boss retry mechanism triggers
            throw err;
          }
        });
        ```
      - Register `extract-content` worker with concurrency `{ teamSize: 5, teamConcurrency: 5 }`:
        ```typescript
        await boss.work('extract-content', { teamSize: 5, teamConcurrency: 5 }, async (job) => {
          const { unit_id, run_id } = job.data as { unit_id: string; run_id: string | null };
          const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
          await extractUnitContent({ unit_id, run_id }, supabase);
        });
        ```
  - [x] 5.3 Update `apps/api/src/app.ts` to call `registerQueueHandlers(app.boss)` after the pgBossPlugin registration (add import and call inside buildApp, after `app.register(pgBossPlugin)` resolves)
  - [x] 5.4 Run `pnpm --filter @trailblaze/api test`; confirm all tests pass
  - [x] 5.5 Run `pnpm type-check`; confirm 0 errors across all packages

- [x] Task 6: Final verification
  - [x] 6.1 Run `pnpm --filter @trailblaze/api test` — all tests pass (0 failures)
  - [x] 6.2 Run `pnpm type-check` — 0 type errors across all packages
  - [x] 6.3 Mark all tasks [x] only after both pass

## Dev Notes

### Architecture Context

This story builds the first real pipeline stages on top of the browser automation library established in Story 2.1. The two stages are:

**Stage 1: `scrape-module` queue** — Scraper Agent navigates Trailhead pages, captures raw HTML, updates module status.

**Stage 2: `extract-content` queue** — Parses raw HTML into structured markdown, identifies quiz questions.

**Decision 7 [Source: architecture.md#Decision-7]:** Scraper Agent uses AI SDK `generateText` with Playwright MCP tools in a ReAct loop. `maxSteps: 20` is the AI SDK v6 equivalent of the architecture's `stepCountIs(20)` limit. Model: `claude-haiku-4-5-20251001` (high volume, structured task).

**Decision 8 [Source: architecture.md#Decision-8]:** Queue concurrency:
- `scrape-module`: `teamSize: 2, teamConcurrency: 2` (max 2 browser pages on 8GB VPS)
- `extract-content`: `teamSize: 5, teamConcurrency: 5` (CPU-bound, no browser limit)
- Chaining pattern: `scrape-module` handler sends `extract-content` jobs after scraping completes

**Decision 3 [Source: architecture.md#Decision-3]:** Pipeline stage chaining via pg-boss completion handlers. Each stage writes to Supabase, then sends the next stage's job. The module state machine: `pending → scraping → scraped`.

**AR20 [Source: architecture.md]:** All agent prompts stored in `apps/api/src/prompts/` as YAML. Loaded at agent initialization using the `yaml` npm package (to be added to `apps/api/package.json`).

### AI SDK v6 API (Critical)

The `ai` package is at version 6 (not v5 as the architecture doc says — the project uses `"ai": "^6"`). Key API differences:
```typescript
// AI SDK v6 generateText with multi-step tool use
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = await generateText({
  model: anthropic('claude-haiku-4-5-20251001'),
  tools: await playwrightMCP.tools(), // MCPToolSet from Story 2.1
  maxSteps: 20,    // v6 — replaces v5's maxToolRoundtrips
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
});
// result.text — final text after all tool calls
// result.steps — array of step objects
// result.usage — token counts (input_tokens, output_tokens)
```

### YAML Prompt Loading Pattern (ESM)

ESM doesn't have `__dirname`. Use `fileURLToPath` pattern:
```typescript
import { parse } from 'yaml';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Must be at module level (not inside function) for correct resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadScraperPrompts(): Promise<ScraperPrompts> {
  const yamlPath = join(__dirname, '../prompts/scraper-agent.yaml');
  const content = await readFile(yamlPath, 'utf-8');
  const parsed = parse(content) as unknown;
  // Validate the parsed content with Zod
  const schema = z.object({
    system: z.string(),
    navigate: z.string(),
    extract: z.string(),
  });
  return schema.parse(parsed);
}
```

### scraper-agent.yaml Content

Create `apps/api/src/prompts/scraper-agent.yaml` with this content:
```yaml
system: |
  You are a Trailhead content scraper. Your goal is to navigate to Trailhead unit pages
  and ensure the page content is fully loaded. You have access to Playwright browser
  automation tools. Navigate to the specified URL, verify the content has loaded
  (not a login page), and confirm the type of content visible.
  Use accessibility tree snapshots to navigate. Do not use CSS selectors.

navigate: |
  Navigate to the following Trailhead unit page and confirm the content has loaded:
  {{url}}

  Steps:
  1. Navigate to the URL using browser_navigate
  2. Take a snapshot using browser_snapshot to verify the page loaded correctly
  3. Confirm the page shows learning content (not a Salesforce login page)
  4. Report what type of content is visible: text/reading, hands-on challenge, or quiz

extract: |
  Confirm the current page content is fully rendered.
  Report the primary content sections you can see in the accessibility tree.
```

### Browser Evaluate Result Shape

The `PlaywrightMCPClient.callTool('browser_evaluate', { expression: '...' })` returns an object of unknown shape. Extract text safely:
```typescript
function extractTextFromToolResult(result: unknown): string {
  if (
    result !== null &&
    typeof result === 'object' &&
    'content' in result &&
    Array.isArray((result as { content: unknown }).content)
  ) {
    return (result as { content: Array<{ type?: string; text?: string }> }).content
      .filter((item) => item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text ?? '')
      .join('');
  }
  return '';
}
```
This pattern is established in Story 2.1's `session-validator.ts` (all content blocks joined).

### node-html-parser Usage

`node-html-parser` is already in `apps/api/package.json`. Usage pattern:
```typescript
import { parse } from 'node-html-parser';

const root = parse(html);

// Get text content from element
const h1 = root.querySelector('h1');
const text = h1?.text ?? ''; // .text strips HTML tags

// Code blocks — preserve text exactly
const codeBlocks = root.querySelectorAll('pre');
for (const pre of codeBlocks) {
  const code = pre.querySelector('code');
  const content = code?.text ?? pre.text;
  // Wrap in markdown fences
}

// Walk all top-level elements
const body = root.querySelector('body') ?? root;
for (const child of body.childNodes) {
  // child.nodeType === 1 → element, child.nodeType === 3 → text
}
```

### quiz_items Table — correct_answer Handling

The shared `QuizItem` type has `correct_answer: string` (not nullable). At scrape time, we cannot know the correct answer — Trailhead shows it only after submission. Set `correct_answer: ''` (empty string) when inserting quiz items at extraction time. The quiz submission flow (Story 4.3) will update this after browser automation reveals the correct answer.

The `explanation` field is repurposed to store `selector_hints` (the form input `name` attribute used for browser-based answer submission later). This is temporary until a schema migration adds a dedicated `selector_hints` column.

### Supabase Update Pattern (matches existing code in routes/modules.ts)

```typescript
// Correct pattern — check returned error object (Supabase does NOT throw)
const { error: updateError } = await supabase
  .from('modules')
  .update({ status: 'scraping', updated_at: new Date().toISOString() })
  .eq('id', module_id);

if (updateError) {
  throw new PipelineError('scrape-module', `Failed to update module status: ${updateError.message}`);
}
```

### Existing File State

| File | Current State |
|------|--------------|
| `apps/api/src/agents/` | Has `.gitkeep` only — create `scraper-agent.ts` here |
| `apps/api/src/pipeline/` | Does NOT exist — create directory with `stages/` subdirectory |
| `apps/api/src/prompts/` | Does NOT exist — create directory |
| `apps/api/package.json` | Has `node-html-parser` ✓; missing `yaml` ← **must add** |
| `apps/api/src/app.ts` | Has `pgBossPlugin` registered ✓; missing `registerQueueHandlers()` call ← **must add** |
| `apps/api/src/lib/mcp-client.ts` | Has `createPlaywrightMCP()` and `PlaywrightMCPClient` interface with `callTool()` + `tools()` ✓ |
| `apps/api/src/lib/agent-logger.ts` | Has `logToolTrace()` ✓ |
| `apps/api/src/lib/errors.ts` | Has `PipelineError` ✓ |
| `packages/shared/src/types/trailhead.ts` | Has `Unit` and `QuizItem` types ✓ |
| `apps/api/src/plugins/pg-boss.ts` | `boss` decorator registered on Fastify ✓; queues already created ✓ |

### Testing Standards

**What NOT to test** [Source: architecture.md#Decision-13]:
- `generateText` behavior (mocked completely)
- `node-html-parser` internal parsing (trusted library)
- Supabase client operations (mock `from().select()`, `from().update()`, `from().insert()`)
- Playwright MCP actual browser interactions (mock `PlaywrightMCPClient`)

**What to test:**
- Scraper Agent calls `generateText` with correct model and `maxSteps: 20`
- Scraper Agent calls `callTool('browser_evaluate', ...)` to get HTML
- `scrapeModule()` status transitions (pending→scraping, then scraping→scraped)
- `scrapeModule()` applies delays between units
- `parseHtmlToMarkdown()` correctly converts known HTML patterns to markdown
- `extractQuizQuestions()` finds quiz patterns from sample HTML
- `extractUnitContent()` stores markdown and inserts quiz items
- Queue handlers register with correct concurrency options

**Mock patterns for scraper-agent.test.ts** (vi.hoisted required for ESM):
```typescript
const { mockGenerateText } = vi.hoisted(() => {
  const mockGenerateText = vi.fn().mockResolvedValue({
    text: 'Page content loaded',
    steps: [],
    usage: { promptTokens: 100, completionTokens: 50 },
  });
  return { mockGenerateText };
});
vi.mock('ai', () => ({ generateText: mockGenerateText }));

const { mockAnthropic } = vi.hoisted(() => {
  const mockAnthropic = vi.fn().mockReturnValue({ id: 'claude-haiku-4-5-20251001' });
  return { mockAnthropic };
});
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: mockAnthropic }));

// For YAML loading — mock fs/promises
const { mockReadFile } = vi.hoisted(() => {
  const mockReadFile = vi.fn().mockResolvedValue(`
system: "You are a scraper"
navigate: "Navigate to {{url}}"
extract: "Extract content"
`);
  return { mockReadFile };
});
vi.mock('fs/promises', () => ({ readFile: mockReadFile }));
```

**Mock pattern for playwrightMCP.callTool in scraper-agent.test.ts:**
```typescript
const mockCallTool = vi.fn().mockImplementation((name: string) => {
  if (name === 'browser_evaluate') {
    return Promise.resolve({
      content: [{ type: 'text', text: '<html><body><h1>Unit Title</h1></body></html>' }],
    });
  }
  return Promise.resolve({ content: [] });
});

const mockPlaywrightMCP = {
  callTool: mockCallTool,
  tools: vi.fn().mockResolvedValue({}),
};
```

### ESM Import Requirements

All relative imports in `apps/api/src/` must use `.js` extension:
```typescript
import { runScraperAgent } from '../../agents/scraper-agent.js';
import { scrapeModule } from './scrape-unit.js';
import { extractUnitContent } from './extract-content.js';
```

### app.ts Update Pattern

In `apps/api/src/app.ts`, add queue handler registration after `pgBossPlugin`:
```typescript
import { registerQueueHandlers } from './pipeline/queue-handlers.js';

// Inside buildApp, after app.register(pgBossPlugin):
await registerQueueHandlers(app.boss);
```

The `app.boss` is available because `pgBossPlugin` uses `app.decorate('boss', boss)` — Fastify adds the decorator before `buildApp` awaits the register.

### Key Learnings from Story 2.1

- `crypto.randomUUID()` global is not available in vitest — use `import { randomUUID } from 'crypto'`
- Supabase returns `{ error }` object (does NOT throw) — always check `result?.error` after await
- `as unknown as T` instead of `as any` for type cast workarounds (Supabase generated types don't include new tables until schema regeneration)
- `vi.hoisted()` is required for ESM mocking when the mock variable is used in the `vi.mock()` factory
- The `PlaywrightMCPClient` interface has both `callTool()` and `tools()` — both available in this story
- Story 2.1's `stagehand-fallback.ts` uses `context.activePage()?.goto()` (v3 API) — NOT `page.goto()`

### Project Structure Notes

New directories this story creates:
- `apps/api/src/agents/` — Story 2.1 created `.gitkeep`; this story creates `scraper-agent.ts`
- `apps/api/src/pipeline/` — New directory
- `apps/api/src/pipeline/stages/` — New subdirectory
- `apps/api/src/prompts/` — New directory

This story creates:
- `apps/api/src/agents/scraper-agent.ts` + test (2 files)
- `apps/api/src/pipeline/stages/scrape-unit.ts` + test (2 files)
- `apps/api/src/pipeline/stages/extract-content.ts` + test (2 files)
- `apps/api/src/pipeline/queue-handlers.ts` + test (2 files)
- `apps/api/src/prompts/scraper-agent.yaml` (1 file)

This story modifies:
- `apps/api/package.json` — Add `yaml` dependency
- `apps/api/src/app.ts` — Register queue handlers

Total new test files: 4 (scraper-agent, scrape-unit, extract-content, queue-handlers)
Estimated new test count: 25-30 tests

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.2 — Acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-7 — AI SDK Agent with Playwright MCP tools, ReAct loop, maxSteps:20]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-8 — pg-boss queue concurrency: scrape-module(2), extract-content(5)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-3 — Pipeline stage chaining pattern via pg-boss]
- [Source: _bmad-output/planning-artifacts/architecture.md#AR20 — YAML-driven prompt configuration in apps/api/src/prompts/]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-13 — What NOT to test]
- [Source: _bmad-output/implementation-artifacts/2-1-playwright-mcp-integration-and-browser-session-management.md — PlaywrightMCPClient interface, logToolTrace, ESM mock patterns]
- [Source: apps/api/src/lib/mcp-client.ts — PlaywrightMCPClient.callTool() and tools() methods]
- [Source: apps/api/src/lib/agent-logger.ts — logToolTrace() signature and ToolTraceParams]
- [Source: apps/api/src/lib/errors.ts — PipelineError constructor]
- [Source: apps/api/src/plugins/pg-boss.ts — Boss instance and queue configs already created]
- [Source: apps/api/src/app.ts — buildApp pattern for adding new registrations]
- [Source: packages/shared/src/types/trailhead.ts — Unit, QuizItem, AgentType, ToolType]
- [Source: apps/api/package.json — node-html-parser already installed; yaml to be added]

## Dev Agent Record

### Agent Model Used

claude-haiku-4-5-20251001

### Completion Notes

All 6 tasks completed successfully following strict TDD (red-green-refactor) methodology. Implementation includes:

1. **YAML configuration**: Added yaml ^2 dependency and created scraper-agent.yaml with system, navigate, and extract prompts for the Scraper Agent.

2. **Scraper Agent**: Implemented loadScraperPrompts() and runScraperAgent() with full ReAct loop support. Agent uses Playwright MCP tools to navigate Trailhead pages and extract raw HTML via browser_evaluate.

3. **Scrape-Unit Pipeline Stage**: Created scrapeModule() with proper state machine transitions (pending→scraping→scraped). Implements randomDelay() between units (2-5 seconds) to avoid account lockout.

4. **Extract-Content Pipeline Stage**: Implemented parseHtmlToMarkdown() for robust HTML-to-markdown conversion with preserved code blocks. extractQuizQuestions() detects fieldset-based quiz patterns and extracts questions with options.

5. **Queue Handlers**: Registered pg-boss workers for scrape-module (teamSize: 2) and extract-content (teamSize: 5) with proper chaining from scrape-module completion handler.

6. **App Integration**: Updated app.ts to register queue handlers after pgBossPlugin initialization.

All implementations follow architecture.md patterns:
- snake_case for database operations
- ESM with .js extensions
- Zod validation at boundaries
- PipelineError hierarchy for error handling
- Full test coverage with ESM vi.hoisted() mocks
- No `any` types (uses `as unknown as T` or eslint-disable comments where necessary)

Type safety achieved with selective eslint-disable comments for Supabase generated types (quiz_items table doesn't exist yet in schema).

### Test Results

**All 129 tests passing** (increased from 79 baseline):

| Test File | Count | Status |
|-----------|-------|--------|
| src/agents/scraper-agent.test.ts | 10 | ✓ Pass |
| src/pipeline/stages/scrape-unit.test.ts | 11 | ✓ Pass |
| src/pipeline/stages/extract-content.test.ts | 22 | ✓ Pass |
| src/pipeline/queue-handlers.test.ts | 7 | ✓ Pass |
| Baseline tests (79 from previous stories) | 79 | ✓ Pass |
| **TOTAL** | **129** | **✓ Pass** |

**Test Breakdown by Task:**
- Task 1 (YAML): Type-check passing (0 errors)
- Task 2 (Scraper Agent): 10 tests covering loadScraperPrompts, generateText integration, callTool invocation, logToolTrace, error handling
- Task 3 (Scrape-Unit): 11 tests covering unit fetching, status transitions, agent invocation, raw_html storage, delay logic, error propagation
- Task 4 (Extract-Content): 22 tests covering parseHtmlToMarkdown (9 tests), extractQuizQuestions (5 tests), extractUnitContent (8 tests)
- Task 5 (Queue Handlers): 7 tests covering worker registration, concurrency options, job chaining, error re-throwing

**Type Safety:**
- pnpm type-check: 0 errors across all 4 packages (@trailblaze/api, @trailblaze/web, @trailblaze/db, @trailblaze/shared)
- ESLint-compatible eslint-disable comments used only where necessary (Supabase type generation gap)

### File List

**Created Files (9 new files):**

1. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/prompts/scraper-agent.yaml` — YAML-driven prompts for Scraper Agent (system, navigate, extract sections)
2. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/agents/scraper-agent.ts` — Scraper Agent implementation (loadScraperPrompts, runScraperAgent)
3. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/agents/scraper-agent.test.ts` — 10 tests for Scraper Agent (YAML loading, generateText, callTool, logToolTrace)
4. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/stages/scrape-unit.ts` — Scrape-unit pipeline stage (scrapeModule, randomDelay)
5. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/stages/scrape-unit.test.ts` — 11 tests for scrape-unit stage
6. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/stages/extract-content.ts` — Extract-content pipeline stage (parseHtmlToMarkdown, extractQuizQuestions, extractUnitContent)
7. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/stages/extract-content.test.ts` — 22 tests for extract-content stage
8. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/queue-handlers.ts` — Queue handler registration (registerQueueHandlers)
9. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/queue-handlers.test.ts` — 7 tests for queue handlers

**Modified Files (2 files):**

1. `/mnt/d/ailocal/TrailblazeAi/apps/api/package.json` — Added `"yaml": "^2"` to dependencies
2. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/app.ts` — Added import and call to registerQueueHandlers(app.boss) after pgBossPlugin registration

**New Directories Created (2):**

1. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/prompts/` — For YAML-driven prompt configuration
2. `/mnt/d/ailocal/TrailblazeAi/apps/api/src/pipeline/stages/` — For pipeline stage implementations
