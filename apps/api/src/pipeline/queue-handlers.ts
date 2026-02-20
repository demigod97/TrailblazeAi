import PgBoss from 'pg-boss';
import { createClient } from '@trailblaze/db';
import { config } from '../config.js';
import { scrapeModule } from './stages/scrape-unit.js';
import { extractUnitContent } from './stages/extract-content.js';
import { identifyUnitConcepts } from './stages/identify-concepts.js';
import { chunkUnitContent } from './stages/chunk-content.js';
import { generateUnitEmbeddings } from './stages/generate-embeddings.js';
import { buildUnitRelationships } from './stages/build-relationships.js';
import { answerModuleQuiz } from '../agents/quiz-agent.js';
import { submitModuleAnswers } from './stages/submit-answers.js';
import { PipelineError, SessionExpiredError } from '../lib/errors.js';

const SCRAPE_MODULE_RETRY_LIMIT = 3;

// Structural type for job object with retry count
type BossJob = {
  data: unknown;
  retryCount: number;
};

// Structural type for pg-boss worker registration (team-based API not in @types/pg-boss)
type BossWithWork = {
  work(
    queue: string,
    options: { teamSize: number; teamConcurrency: number },
    handler: (job: BossJob) => Promise<void>,
  ): Promise<void>;
};

// Structural type for pg-boss pause operation
type BossWithPause = {
  pause(name: string): Promise<void>;
};

// Structural type for pg-boss send operation
type BossWithSend = {
  send(queue: string, data: unknown): Promise<unknown>;
};

// Structural type for the Supabase client operations used in this handler
type PipelineClient = {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): Promise<{ data: Array<unknown> | null; error: { message: string } | null }> & {
        not(col: string, op: string, val: null): Promise<{ data: Array<{ id: string }> | null; error: { message: string } | null }>;
      };
    };
    update(data: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function registerQueueHandlers(boss: PgBoss): Promise<void> {
  // Register scrape-module worker
  await (boss as unknown as BossWithWork).work(
    'scrape-module',
    { teamSize: 2, teamConcurrency: 2 },
    async (job: BossJob) => {
      const { module_id, run_id } = job.data as { module_id: string; run_id: string | null };
      const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      const db = supabase as unknown as PipelineClient;

      try {
        await scrapeModule({ module_id, run_id }, supabase);

        // Chain to extract-content for each unit that was scraped
        const { data: units, error } = await db
          .from('units')
          .select('id')
          .eq('module_id', module_id)
          .not('raw_html', 'is', null);

        if (error) {
          throw new PipelineError('scrape-module', `Failed to query scraped units: ${error.message}`);
        }

        if (units) {
          for (const unit of units) {
            await boss.send('extract-content', { unit_id: unit.id, module_id, run_id });
          }
        }
      } catch (err) {
        // Handle session expiry: mark module failed first, then pause queue
        // (status update runs first so the module is never stuck in 'scraping' if pause throws)
        if (err instanceof SessionExpiredError) {
          const { error: updateError } = await db
            .from('modules')
            .update({ status: 'failed', failure_reason: 'session_expired', updated_at: new Date().toISOString() })
            .eq('id', module_id);
          if (updateError) {
            console.error('Failed to mark module session_expired:', updateError.message);
          }
          // Pause in its own try-catch: if pause throws, we still return normally
          // so pg-boss does not retry the job (the module is already marked failed above)
          try {
            await (boss as unknown as BossWithPause).pause('scrape-module');
          } catch (pauseErr) {
            console.error(
              'Failed to pause scrape-module queue:',
              pauseErr instanceof Error ? pauseErr.message : String(pauseErr),
            );
          }
          return; // Signal success to pg-boss — don't retry session expiry
        }

        // Track retry count for other errors — dead letter handler owns 'failed' status transition
        const { error: cleanupError } = await db
          .from('modules')
          .update({ retry_count: job.retryCount, updated_at: new Date().toISOString() })
          .eq('id', module_id);
        if (cleanupError) {
          // Don't throw — original error must propagate to pg-boss for retry
          console.error('Failed to update module retry_count:', cleanupError.message);
        }
        throw err;
      }
    },
  );

  // Register extract-content worker → chains to identify-concepts
  await (boss as unknown as BossWithWork).work(
    'extract-content',
    { teamSize: 5, teamConcurrency: 5 },
    async (job: BossJob) => {
      const { unit_id, module_id, run_id } = job.data as { unit_id: string; module_id: string; run_id: string | null };
      const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      await extractUnitContent({ unit_id, run_id }, supabase);
      await (boss as unknown as BossWithSend).send('identify-concepts', { unit_id, module_id, run_id });
    },
  );

  // Register identify-concepts worker → chains to chunk-content
  await (boss as unknown as BossWithWork).work(
    'identify-concepts',
    { teamSize: 5, teamConcurrency: 5 },
    async (job: BossJob) => {
      const { unit_id, module_id, run_id } = job.data as { unit_id: string; module_id: string; run_id: string | null };
      const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      const db = supabase as unknown as PipelineClient;

      // Check if module status is 'scraped' (first unit being processed)
      const moduleQueryResult = await db
        .from('modules')
        .select('status')
        .eq('id', module_id);

      const modules = moduleQueryResult.data as unknown as Array<{ status?: string }> | null;
      const moduleError = moduleQueryResult.error;

      if (!moduleError && modules && modules.length > 0) {
        const moduleStatus = modules[0]?.status;
        if (moduleStatus === 'scraped') {
          // Update module status to 'processing'
          await db
            .from('modules')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', module_id);
        }
      }

      await identifyUnitConcepts({ unit_id, run_id }, supabase);
      await (boss as unknown as BossWithSend).send('chunk-content', { unit_id, module_id, run_id });
    },
  );

  // Register chunk-content worker → chains to generate-embeddings
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

  // Register generate-embeddings worker → chains to build-relationships
  await (boss as unknown as BossWithWork).work(
    'generate-embeddings',
    { teamSize: 5, teamConcurrency: 5 },
    async (job: BossJob) => {
      const { unit_id, module_id, run_id } = job.data as { unit_id: string; module_id: string; run_id: string | null };
      const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      await generateUnitEmbeddings({ unit_id, module_id, run_id }, supabase);
      await (boss as unknown as BossWithSend).send('build-relationships', { unit_id, module_id, run_id });
    },
  );

  // Register build-relationships worker → final stage, may transition module to 'ready'
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
        (embeddedChunks as unknown as Array<{ unit_id: string }>)?.map((c) => c.unit_id) ?? [],
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

  // Register answer-quiz worker — answers quiz items for a module using the knowledge base
  await (boss as unknown as BossWithWork).work(
    'answer-quiz',
    { teamSize: 3, teamConcurrency: 3 },
    async (job: BossJob) => {
      const { module_id, run_id } = job.data as { module_id: string; run_id: string | null };
      const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      await answerModuleQuiz({ module_id, run_id }, supabase);
    },
  );

  // Register submit-quiz worker — submits approved answers to Trailhead via Playwright MCP (AC1, AC4)
  await (boss as unknown as BossWithWork).work(
    'submit-quiz',
    { teamSize: 1, teamConcurrency: 1 },
    async (job: BossJob) => {
      const { module_id, run_id } = job.data as { module_id: string; run_id: string | null };
      const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      await submitModuleAnswers({ module_id, run_id }, supabase);
    },
  );

  // Register dead-letter-submit-quiz handler — fires after all submit-quiz retries exhausted
  await (boss as unknown as BossWithWork).work(
    'dead-letter-submit-quiz',
    { teamSize: 1, teamConcurrency: 1 },
    async (job: BossJob) => {
      const { module_id } = job.data as { module_id: string; run_id: string | null };
      const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      const db = supabase as unknown as PipelineClient;
      const { error: updateError } = await db
        .from('modules')
        .update({ status: 'quizzing', failure_reason: 'submit_exhausted', updated_at: new Date().toISOString() })
        .eq('id', module_id);
      if (updateError) {
        throw new PipelineError('dead-letter-submit-quiz', `Failed to reset module status: ${updateError.message}`);
      }
    },
  );

  // Register dead-letter-scrape-module handler — fires after all retries exhausted
  await (boss as unknown as BossWithWork).work(
    'dead-letter-scrape-module',
    { teamSize: 1, teamConcurrency: 1 },
    async (job: BossJob) => {
      const { module_id } = job.data as { module_id: string; run_id: string | null };
      const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      const db = supabase as unknown as PipelineClient;
      const { error: updateError } = await db
        .from('modules')
        .update({
          status: 'failed',
          retry_count: SCRAPE_MODULE_RETRY_LIMIT,
          updated_at: new Date().toISOString(),
        })
        .eq('id', module_id);
      if (updateError) {
        throw new PipelineError('dead-letter-scrape-module', `Failed to mark module failed: ${updateError.message}`);
      }
    },
  );
}
