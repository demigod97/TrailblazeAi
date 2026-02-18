import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createClient } from '@trailblaze/db';
import { config } from '../config.js';
import { success, error } from '../lib/response.js';
import type { ApiResponse } from '../types/api.js';
import { AppError, NotFoundError } from '../lib/errors.js';
import type { Module, Unit } from '@trailblaze/shared';

const validStatuses = ['pending', 'scraping', 'scraped', 'processing', 'ready', 'quizzing', 'completed', 'failed'] as const;

// Structural type for update operations (stale Supabase generated types don't include new columns)
type ModuleUpdateClient = {
  from(table: string): {
    update(data: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
  };
};

// Structural type for pg-boss queue resume (not in Fastify plugin typed interface)
type BossWithResume = {
  resume(name: string): Promise<void>;
};

const querySchema = z.object({
  status: z.enum(validStatuses).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Zod schemas for Supabase response validation (no `as T` casts)
const moduleSchema = z.object({
  id: z.string(),
  trailmix_id: z.string(),
  name: z.string(),
  url: z.string(),
  status: z.enum(validStatuses),
  priority: z.number().int(),
  badge_url: z.string().nullable(),
  badge_earned: z.boolean(),
  retry_count: z.number().int(),
  failure_reason: z.string().nullable().optional().default(null),
  type: z.string().nullable(),
  track: z.string().nullable(),
  estimated_minutes: z.number().nullable(),
  unit_count: z.number().int().nullable(),
  user_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const unitSchema = z.object({
  id: z.string(),
  module_id: z.string(),
  title: z.string(),
  url: z.string(),
  unit_index: z.number().int(),
  raw_html: z.string().nullable(),
  content_markdown: z.string().nullable(),
  user_id: z.string().nullable(),
  created_at: z.string(),
});

interface GetModulesResponse {
  modules: Module[];
  count: number;
  offset: number;
  limit: number;
}

interface GetModuleResponse {
  module: Module;
  units: Unit[];
}

interface RetryResponse {
  module_id: string;
}

export const modulesRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/modules - List modules with optional filtering and pagination
  app.get<{ Querystring: z.infer<typeof querySchema>; Reply: ApiResponse<GetModulesResponse> }>(
    '/api/modules',
    async (request, reply) => {
      try {
        const parsed = querySchema.safeParse(request.query);
        if (!parsed.success) {
          return reply.code(400).send(error('VALIDATION_ERROR', 'Invalid query params', parsed.error.flatten()));
        }

        const { status, offset, limit } = parsed.data;

        // Create Supabase client
        const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

        // Build query
        let query = supabase
          .from('modules')
          .select('*', { count: 'exact' })
          .order('priority', { ascending: true })
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error: dbError, count } = await query;

        if (dbError) {
          app.log.error({ dbError }, 'Failed to fetch modules');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Failed to fetch modules'));
        }

        const modulesResult = z.array(moduleSchema).safeParse(data ?? []);
        if (!modulesResult.success) {
          app.log.error({ validationError: modulesResult.error.flatten() }, 'Module list data failed validation');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Module data invalid'));
        }

        return reply.send(success({ modules: modulesResult.data, count: count ?? 0, offset, limit }));
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.status_code).send(error(err.code, err.message, err.details));
        }
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'GET /api/modules error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );

  // GET /api/modules/:id - Get single module with units
  app.get<{ Params: { id: string }; Reply: ApiResponse<GetModuleResponse> }>(
    '/api/modules/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Create Supabase client
        const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

        // Fetch module with units
        const { data, error: dbError } = await supabase
          .from('modules')
          .select('*, units(*)')
          .eq('id', id)
          .maybeSingle();

        if (dbError) {
          app.log.error({ dbError }, 'Failed to fetch module');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Failed to fetch module'));
        }

        if (!data) {
          throw new NotFoundError('Module', id);
        }

        // Extract nested units before module validation
        const rawData = data as Record<string, unknown>;
        const rawUnits = Array.isArray(rawData['units']) ? rawData['units'] : [];

        const moduleResult = moduleSchema.safeParse(rawData);
        if (!moduleResult.success) {
          app.log.error({ validationError: moduleResult.error.flatten() }, 'Module data failed validation');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Module data invalid'));
        }

        const unitsResult = z.array(unitSchema).safeParse(rawUnits);
        const units = unitsResult.success ? unitsResult.data : [];

        return reply.send(success({ module: moduleResult.data, units }));
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.status_code).send(error(err.code, err.message, err.details));
        }
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'GET /api/modules/:id error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );

  // POST /api/modules/:id/retry - Retry a failed module
  app.post<{ Params: { id: string }; Reply: ApiResponse<RetryResponse> }>(
    '/api/modules/:id/retry',
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Create Supabase client
        const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

        // Fetch module to check if it's in failed status
        const { data, error: dbError } = await supabase
          .from('modules')
          .select('id, status, failure_reason')
          .eq('id', id)
          .maybeSingle();

        if (dbError) {
          app.log.error({ dbError }, 'Failed to fetch module for retry');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Failed to fetch module'));
        }

        if (!data) {
          throw new NotFoundError('Module', id);
        }

        const moduleData = data as { id: string; status: string };
        if (moduleData.status !== 'failed') {
          return reply.code(400).send(error('VALIDATION_ERROR', 'Module is not in failed state'));
        }

        // Reset retry_count and status to pending, clear failure_reason
        const updateData: Record<string, unknown> = {
          status: 'pending',
          retry_count: 0,
          failure_reason: null,
          updated_at: new Date().toISOString(),
        };
        const updateClient = supabase as unknown as ModuleUpdateClient;
        const { error: updateError } = await updateClient
          .from('modules')
          .update(updateData)
          .eq('id', id);

        if (updateError) {
          app.log.error({ updateError }, 'Failed to update module');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Failed to update module'));
        }

        // Resume the queue (may have been paused on session expiry) then re-enqueue
        await (app.boss as unknown as BossWithResume).resume('scrape-module');
        await app.boss.send('scrape-module', { module_id: id, run_id: null });

        return reply.send(success({ module_id: id }));
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.status_code).send(error(err.code, err.message, err.details));
        }
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'POST /api/modules/:id/retry error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );
};
