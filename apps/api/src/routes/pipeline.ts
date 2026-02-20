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

// Structural type for pipeline config DB operations
type PipelineConfigClient = {
  from(table: string): {
    select(cols: string): {
      eq?(col: string, val: unknown): Promise<{ data: Array<unknown> | null; error: { message: string } | null }>;
      order?(col: string, opts: { ascending: boolean }): {
        limit?(n: number): Promise<{ data: Array<unknown> | null; error: { message: string } | null }>;
      };
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

// Zod schemas
const patchConfigSchema = z.object({
  quiz_only_mode: z.boolean().optional(),
  skip_completed: z.boolean().optional(),
  priority_track: z.string().nullable().optional(),
});

type PipelineConfig = z.infer<typeof patchConfigSchema>;

const CONFIG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Helper: Update module priorities based on priority_track
 * If track is set: modules matching track get priority=1, others get priority=5
 * If track is null: all modules get priority=5 (reset)
 */
async function updateModulePriorities(track: string | null): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey) as any;

  if (track !== null) {
    // Update matching track to priority 1
    await supabase.from('modules').update({ priority: 1 }).eq('track', track);
  }

  // Update all other modules to priority 5 (via select and individual updates)
  const selectResult = await supabase.from('modules').select('id,track');
  const allModules = selectResult.data as unknown as Array<{ id: string; track: string | null }> | null;

  if (allModules && allModules.length > 0) {
    for (const module of allModules) {
      if (track === null || module.track !== track) {
        await supabase.from('modules').update({ priority: 5 }).eq('id', module.id);
      }
    }
  }
}

/**
 * Helper: Update run status (for pause/resume/cancel)
 */
async function updateRunStatus(status: 'active' | 'paused' | 'cancelled'): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey) as any;

  // Find active run
  const { data: runs, error: selectError } = await supabase
    .from('runs')
    .select('id')
    .eq('status', 'active');

  if (selectError) throw new Error(`Failed to fetch active run: ${selectError.message}`);

  const runList = runs as unknown as Array<{ id: string }> | null;
  if (runList && runList.length > 0) {
    const activeRunId = runList[0]?.id;
    if (activeRunId) {
      const { error: updateError } = await supabase.from('runs').update({ status }).eq('id', activeRunId);
      if (updateError) throw new Error(`Failed to update run status: ${updateError.message}`);
    }
  }

  // Update pipeline_config status
  const { error: configError } = await supabase
    .from('pipeline_config')
    .update({ pipeline_paused: status === 'paused' })
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

        // Return first row (single-row config pattern)
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

        // Prepare update data
        const updateData = {
          ...parsed.data,
          updated_at: new Date().toISOString(),
        };

        const { data, error: err } = await db.from('pipeline_config').update(updateData).eq('id', CONFIG_ID);
        if (err) throw new Error(err.message);

        // If priority_track changed, update module priorities
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

        // Pause all queues
        for (const queueName of PIPELINE_QUEUES) {
          await boss.pause(queueName);
        }

        // Update run status and pipeline_config
        await updateRunStatus('paused');

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

        // Resume all queues
        for (const queueName of PIPELINE_QUEUES) {
          await boss.resume(queueName);
        }

        // Update run status and pipeline_config
        await updateRunStatus('active');

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

        // Pause all queues
        for (const queueName of PIPELINE_QUEUES) {
          await boss.pause(queueName);
        }

        // Update run status to cancelled (modules stay at current status)
        await updateRunStatus('cancelled');

        return reply.send(success({ cancelled: true }));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'POST /api/pipeline/cancel error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );
});
