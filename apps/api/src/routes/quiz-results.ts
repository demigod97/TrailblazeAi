import type { FastifyPluginAsync } from 'fastify';
import { createClient } from '@trailblaze/db';
import { config } from '../config.js';
import { success, error } from '../lib/response.js';
import type { ApiResponse } from '../types/api.js';
import { AppError } from '../lib/errors.js';
import { z } from 'zod';

// Structural type for quiz_results query
type QuizResultsClient = {
  from(table: string): {
    select(cols: string): {
      is(col: string, val: null): {
        order(col: string, opts: { ascending: boolean }): Promise<{
          data: Array<Record<string, unknown>> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

const querystringSchema = z.object({
  module_id: z.string().min(1).optional(),
});

const quizResultsRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/quiz-results?module_id=
  app.get<{
    Querystring: {
      module_id?: string;
    };
    Reply: ApiResponse<Array<Record<string, unknown>>>;
  }>(
    '/api/quiz-results',
    async (request, reply) => {
      try {
        const parseResult = querystringSchema.safeParse(request.query);
        if (!parseResult.success) {
          return reply.code(400).send(error('VALIDATION_ERROR', 'Invalid query parameters'));
        }
        const { module_id } = parseResult.data;

        const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
        const db = supabase as unknown as QuizResultsClient;

        const selectStr = `
          id,
          quiz_item_id,
          unit_id,
          selected_answer,
          confidence_score,
          reasoning,
          attempt_number,
          is_approved,
          user_note,
          quiz_items (
            id,
            question_text,
            options,
            display_order,
            units (
              id,
              title,
              modules (
                id,
                name
              )
            )
          )
        `;

        // Always filter to pending reviews (is_approved IS NULL)
        const { data: allData, error: err } = await db
          .from('quiz_results')
          .select(selectStr)
          .is('is_approved', null)
          .order('created_at', { ascending: true });

        if (err) {
          app.log.error({ error: err.message }, 'quiz_results query failed');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Failed to fetch quiz results'));
        }

        // Post-filter by module_id via nested quiz_items.units.modules.id
        const data = module_id
          ? (allData ?? []).filter((r) => {
              const qi = r['quiz_items'] as { units?: { modules?: { id?: string } } } | undefined;
              return qi?.units?.modules?.id === module_id;
            })
          : (allData ?? []);

        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.status_code).send(error(err.code, err.message, err.details));
        }
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'GET /api/quiz-results error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );
};

export default quizResultsRoutes;
