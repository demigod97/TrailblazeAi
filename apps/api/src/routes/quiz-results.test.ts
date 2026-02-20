import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { bearerAuth } from '../plugins/auth.js';
import { pgBossPlugin } from '../plugins/pg-boss.js';

// Mock config
vi.mock('../config.js', () => ({
  config: {
    port: 3001,
    bearerToken: 'test-bearer-token-that-is-at-least-32-characters-long-xxx',
    supabaseUrl: 'https://test.supabase.co',
    supabaseServiceKey: 'test-key',
    anthropicApiKey: 'test-key',
    openaiApiKey: 'test-key',
    databaseUrl: 'postgresql://test',
    nodeEnv: 'test',
  },
}));

// Mock Supabase with realistic quiz_results data
const mockQuizResult = {
  id: 'result-1',
  quiz_item_id: 'item-1',
  unit_id: 'unit-1',
  selected_answer: 'The answer is B',
  confidence_score: 0.92,
  reasoning: 'Based on the documentation, option B is correct because...',
  attempt_number: 1,
  is_approved: null,
  user_note: null,
  quiz_items: {
    id: 'item-1',
    question_text: 'What is Apex?',
    options: ['A', 'B', 'C', 'D'],
    display_order: 1,
    units: {
      id: 'unit-1',
      title: 'Apex Fundamentals',
      modules: {
        id: 'module-1',
        name: 'Apex Training',
      },
    },
  },
};

vi.mock('@trailblaze/db', () => ({
  createClient: vi.fn(() => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [mockQuizResult],
      error: null,
    });

    const eqMock = vi.fn().mockReturnValue({
      order: orderMock,
    });

    return {
      from: vi.fn((table: string) => {
        if (table === 'quiz_results') {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: orderMock,
                eq: eqMock,
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    };
  }),
}));

// Mock pg-boss
vi.mock('pg-boss', () => ({
  default: class {
    on = vi.fn();
    start = vi.fn().mockResolvedValue(undefined);
    createQueue = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    getQueueSize = vi.fn().mockResolvedValue(0);
    send = vi.fn().mockResolvedValue(undefined);
  },
}));

// Import after mocks
import quizResultsRoutes from './quiz-results.js';

const AUTH_HEADER = 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx';

// Helper to build a test app
async function buildTestApp() {
  const app = Fastify({ logger: false });
  await app.register(bearerAuth);
  await app.register(pgBossPlugin);
  await app.register(quizResultsRoutes);
  return app;
}

describe('GET /api/quiz-results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with empty array when no results', async () => {
    const { createClient } = await import('@trailblaze/db');
    vi.mocked(createClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })),
    } as unknown as ReturnType<typeof createClient>);

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/quiz-results',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toEqual([]);
    expect(body.error).toBe(null);
  });

  it('returns 200 filtering by module_id', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/quiz-results?module_id=module-1',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.error).toBe(null);
  });

  it('returns 401 without bearer auth', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/quiz-results',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 500 on Supabase error', async () => {
    const { createClient } = await import('@trailblaze/db');
    vi.mocked(createClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Supabase connection failed' },
            }),
          }),
        }),
      })),
    } as unknown as ReturnType<typeof createClient>);

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/quiz-results',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('PIPELINE_ERROR');
  });
});
