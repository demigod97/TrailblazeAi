import type { FastifyPluginAsync } from 'fastify';
import { createClient } from '@trailblaze/db';
import { config } from '../config.js';
import { success, error } from '../lib/response.js';
import type { ApiResponse } from '../types/api.js';
import { AppError, ValidationError } from '../lib/errors.js';
import { z } from 'zod';
import type PgBoss from 'pg-boss';

type QueryResult = { data: Array<Record<string, unknown>> | null; error: { message: string } | null };

// Structural type for quiz_results query — supports both pending (is_approved IS NULL) and submitted paths
type QuizResultsQueryChain = {
  is(col: string, val: null): { order(col: string, opts: { ascending: boolean }): Promise<QueryResult> };
  order(col: string, opts: { ascending: boolean }): Promise<QueryResult>;
};

type QuizResultsClient = {
  from(table: string): {
    select(cols: string): QuizResultsQueryChain;
  };
};

const querystringSchema = z.object({
  module_id: z.string().min(1).optional(),
  correct: z.enum(['true', 'false']).optional(),
});

const submitBodySchema = z.object({
  module_id: z.string().min(1),
});

const quizResultsRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/quiz-results?module_id=&correct=
  app.get<{
    Querystring: {
      module_id?: string;
      correct?: string;
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
        const { module_id, correct } = parseResult.data;

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
          is_correct,
          correct_answer,
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

        // When filtering by correct/incorrect, query submitted records (no is_approved restriction)
        // Otherwise, filter to pending reviews (is_approved IS NULL) for the review UI
        const baseQuery = db.from('quiz_results').select(selectStr);
        const { data: allData, error: err } = await (
          correct !== undefined
            ? baseQuery.order('created_at', { ascending: true })
            : baseQuery.is('is_approved', null).order('created_at', { ascending: true })
        );

        if (err) {
          app.log.error({ error: err.message }, 'quiz_results query failed');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Failed to fetch quiz results'));
        }

        let data = allData ?? [];

        // Post-filter by module_id via nested quiz_items.units.modules.id
        if (module_id) {
          data = data.filter((r) => {
            const qi = r['quiz_items'] as { units?: { modules?: { id?: string } } } | undefined;
            return qi?.units?.modules?.id === module_id;
          });
        }

        // Post-filter by correct/incorrect (AC5)
        if (correct !== undefined) {
          const correctBool = correct === 'true';
          data = data.filter((r) => (r as Record<string, unknown>)['is_correct'] === correctBool);
        }

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

  // POST /api/quiz-results/submit — enqueue submit-quiz job (AC1)
  app.post<{
    Body: { module_id?: string };
    Reply: ApiResponse<{ queued: boolean }>;
  }>(
    '/api/quiz-results/submit',
    async (request, reply) => {
      try {
        const parseResult = submitBodySchema.safeParse(request.body);
        if (!parseResult.success) {
          throw new ValidationError(parseResult.error.message);
        }
        const { module_id } = parseResult.data;

        const boss = (app as unknown as { boss: PgBoss }).boss;
        await boss.send('submit-quiz', { module_id, run_id: null });

        return reply.send(success({ queued: true }));
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.status_code).send(error(err.code, err.message, err.details));
        }
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'POST /api/quiz-results/submit error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );
};

export default quizResultsRoutes;
