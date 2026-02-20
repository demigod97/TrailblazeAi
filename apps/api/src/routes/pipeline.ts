import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createClient } from '@trailblaze/db';
import { config } from '../config.js';
import { success, error } from '../lib/response.js';
import type { ApiResponse } from '../types/api.js';
import { ValidationError } from '../lib/errors.js';

// All 8 pipeline queues (from pg-boss.ts)
const PIPELINE_QUEUES = [
  'scrape-module',
  'extract-content',
  'identify-concepts',
  'chunk-content',
  'generate-embeddings',
  'build-relationships',
  'answer-quiz',
  'submit-quiz',
] as const;

// Structural type for pipeline config DB operations (GET and PATCH)
type PipelineConfigClient = {
  from(table: string): {
    select(cols: string): {
      eq?(col: string, val: unknown): Promise<{ data: Array<unknown> | null; error: { message: string } | null }>;
    } & Promise<{ data: Array<unknown> | null; error: { message: string } | null }>;
    update(data: Record<string, unknown>): {
      eq(col: string, val: unknown): Promise<{ data: Array<unknown> | null; error: { message: string } | null }>;
    };
  };
};

// Structural type for boss pause/resume
type BossWithPauseResume = {
  pause(name: string): Promise<void>;
  resume(name: string): Promise<void>;
};

// Structural type for updateModulePriorities — bulk UPDATE with eq/neq/not filters
type ModulePriorityClient = {
  from(table: string): {
    update(data: Record<string, unknown>): {
      eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>;
      neq(col: string, val: unknown): Promise<{ error: { message: string } | null }>;
      not(col: string, op: string, val: unknown): Promise<{ error: { message: string } | null }>;
    };
  };
};

// Structural type for updateRunStatus — supports both .eq() and .in() for run lookups
type RunStatusClient = {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: unknown): Promise<{
        data: Array<{ id: string }> | null;
        error: { message: string } | null;
      }>;
      in(col: string, vals: unknown[]): Promise<{
        data: Array<{ id: string }> | null;
        error: { message: string } | null;
      }>;
    };
    update(data: Record<string, unknown>): {
      eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>;
    };
  };
};

// Zod schemas
const patchConfigSchema = z.object({
  quiz_only_mode: z.boolean().optional(),
  skip_completed: z.boolean().optional(),
  priority_track: z.string().nullable().optional(),
});

type PipelineConfig = z.infer<typeof patchConfigSchema>;

const CONFIG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Helper: Update module priorities based on priority_track using two bulk UPDATE queries.
 * If track is set: matching modules → priority 1, non-matching → priority 5.
 * If track is null: all modules → priority 5 (reset).
 */
async function updateModulePriorities(track: string | null): Promise<void> {
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey) as unknown as ModulePriorityClient;

  if (track !== null) {
    // Bulk UPDATE: matching track → priority 1
    const { error: err1 } = await supabase.from('modules').update({ priority: 1 }).eq('track', track);
    if (err1) throw new Error(`Failed to set priority 1: ${err1.message}`);

    // Bulk UPDATE: non-matching track → priority 5
    const { error: err2 } = await supabase.from('modules').update({ priority: 5 }).neq('track', track);
    if (err2) throw new Error(`Failed to set priority 5: ${err2.message}`);
  } else {
    // Bulk UPDATE: reset all modules to priority 5 (no priority track selected)
    const { error } = await supabase.from('modules').update({ priority: 5 }).not('id', 'is', null);
    if (error) throw new Error(`Failed to reset module priorities: ${error.message}`);
  }
}

/**
 * Helper: Update run status for pause/resume/cancel operations.
 * @param newStatus - The new status to set on the matching run
 * @param fromStatuses - Which run statuses to search (default: ['active'] for pause)
 *   - pause: ['active'] — only pause active runs
 *   - resume/cancel: ['active', 'paused'] — also catches runs already in paused state
 */
async function updateRunStatus(
  newStatus: 'active' | 'paused' | 'cancelled',
  fromStatuses: ('active' | 'paused')[] = ['active'],
): Promise<void> {
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey) as unknown as RunStatusClient;

  // Find matching run using .in() when multiple statuses, .eq() for single status
  const selectQuery = supabase.from('runs').select('id');
  const { data: runs, error: selectError } =
    fromStatuses.length === 1
      ? await selectQuery.eq('status', fromStatuses[0])
      : await selectQuery.in('status', fromStatuses);

  if (selectError) throw new Error(`Failed to fetch run: ${selectError.message}`);

  const runId = (runs as Array<{ id: string }> | null)?.[0]?.id;
  if (runId) {
    const { error: updateError } = await supabase.from('runs').update({ status: newStatus }).eq('id', runId);
    if (updateError) throw new Error(`Failed to update run status: ${updateError.message}`);
  }

  // Sync pipeline_config.pipeline_paused with the new status
  const { error: configError } = await supabase
    .from('pipeline_config')
    .update({ pipeline_paused: newStatus === 'paused' })
    .eq('id', CONFIG_ID);
  if (configError) throw new Error(`Failed to update pipeline_config: ${configError.message}`);
}

export const pipelineRoutes: FastifyPluginAsync = fp(async (app) => {
  // GET /api/pipeline/config
  app.get<{ Reply: ApiResponse<Record<string, unknown>> }>(
    '/api/pipeline/config',
    async (_req, reply) => {
      try {
        const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
        const db = supabase as unknown as PipelineConfigClient;

        const { data, error: err } = await db.from('pipeline_config').select('*');
        if (err) throw new Error(err.message);

        // Single-row config pattern — return first row
        const row = data?.[0];
        return reply.send(success(row ?? null) as unknown as ApiResponse<Record<string, unknown>>);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'GET /api/pipeline/config error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );

  // PATCH /api/pipeline/config
  app.patch<{ Body: PipelineConfig; Reply: ApiResponse<Record<string, unknown>> }>(
    '/api/pipeline/config',
    async (req, reply) => {
      try {
        const parsed = patchConfigSchema.safeParse(req.body);
        if (!parsed.success) {
          throw new ValidationError(parsed.error.message);
        }

        const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
        const db = supabase as unknown as PipelineConfigClient;

        const updateData = {
          ...parsed.data,
          updated_at: new Date().toISOString(),
        };

        // Supabase UPDATE does not return row data without .select() — apply update then re-fetch
        const { error: updateErr } = await db.from('pipeline_config').update(updateData).eq('id', CONFIG_ID);
        if (updateErr) throw new Error(updateErr.message);

        // Re-fetch to return the actual updated config
        const { data, error: fetchErr } = await db.from('pipeline_config').select('*');
        if (fetchErr) throw new Error(fetchErr.message);

        // If priority_track changed, update module priorities in bulk
        if ('priority_track' in parsed.data && parsed.data.priority_track !== undefined) {
          await updateModulePriorities(parsed.data.priority_track ?? null);
        }

        return reply.send(success(data?.[0] ?? null) as unknown as ApiResponse<Record<string, unknown>>);
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.code(400).send(error('VALIDATION_ERROR', err.message));
        }
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'PATCH /api/pipeline/config error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );

  // POST /api/pipeline/pause
  app.post<{ Reply: ApiResponse<{ paused: boolean }> }>(
    '/api/pipeline/pause',
    async (_req, reply) => {
      try {
        const boss = (app as unknown as { boss: BossWithPauseResume }).boss;

        for (const queueName of PIPELINE_QUEUES) {
          await boss.pause(queueName);
        }

        // Only pause active runs (not already-paused runs)
        await updateRunStatus('paused', ['active']);

        return reply.send(success({ paused: true }));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'POST /api/pipeline/pause error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );

  // POST /api/pipeline/resume
  app.post<{ Reply: ApiResponse<{ resumed: boolean }> }>(
    '/api/pipeline/resume',
    async (_req, reply) => {
      try {
        const boss = (app as unknown as { boss: BossWithPauseResume }).boss;

        for (const queueName of PIPELINE_QUEUES) {
          await boss.resume(queueName);
        }

        // Resume from active OR paused state (idempotent)
        await updateRunStatus('active', ['active', 'paused']);

        return reply.send(success({ resumed: true }));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'POST /api/pipeline/resume error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );

  // POST /api/pipeline/cancel
  app.post<{ Reply: ApiResponse<{ cancelled: boolean }> }>(
    '/api/pipeline/cancel',
    async (_req, reply) => {
      try {
        const boss = (app as unknown as { boss: BossWithPauseResume }).boss;

        for (const queueName of PIPELINE_QUEUES) {
          await boss.pause(queueName);
        }

        // Cancel from active OR paused state — modules stay at their current status
        await updateRunStatus('cancelled', ['active', 'paused']);

        return reply.send(success({ cancelled: true }));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'POST /api/pipeline/cancel error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );
});
