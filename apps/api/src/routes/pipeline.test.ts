import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { bearerAuth } from '../plugins/auth.js';
import { pgBossPlugin } from '../plugins/pg-boss.js';

// Hoisted: tracked mocks so tests can assert on DB calls from within the createClient factory
const { mockRunsUpdate, mockModulesUpdate } = vi.hoisted(() => {
  const mockRunsUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  const mockModulesUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
    neq: vi.fn().mockResolvedValue({ error: null }),
    not: vi.fn().mockResolvedValue({ error: null }),
  });
  return { mockRunsUpdate, mockModulesUpdate };
});

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

// Default mock pipeline config
const mockPipelineConfig = {
  id: '00000000-0000-0000-0000-000000000001',
  quiz_only_mode: false,
  skip_completed: false,
  priority_track: null,
  pipeline_paused: false,
  created_at: '2026-02-20T00:00:00Z',
  updated_at: '2026-02-20T00:00:00Z',
};

const mockActiveRun = {
  id: 'run-1',
  trailmix_id: 'trailmix-1',
  status: 'active',
  started_at: '2026-02-20T00:00:00Z',
  completed_at: null,
  total_cost: null,
  user_id: 'user-1',
};

// Mock Supabase client
vi.mock('@trailblaze/db', () => ({
  createClient: vi.fn(() => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [mockPipelineConfig],
        error: null,
      }),
    });

    return {
      from: vi.fn((table: string) => {
        if (table === 'pipeline_config') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [mockPipelineConfig],
              error: null,
            }),
            update: updateMock,
          };
        }
        if (table === 'runs') {
          return {
            // Implementation uses .eq() for single-status lookups, .in() for multi-status
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [mockActiveRun], error: null }),
              in: vi.fn().mockResolvedValue({ data: [mockActiveRun], error: null }),
            }),
            update: mockRunsUpdate,
          };
        }
        if (table === 'modules') {
          return {
            // Implementation now uses bulk eq/neq/not — no select needed
            update: mockModulesUpdate,
          };
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          update: updateMock,
        };
      }),
    };
  }),
}));

// Mock pg-boss
const mockBoss = {
  on: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  getQueueSize: vi.fn().mockResolvedValue(0),
  send: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
};

vi.mock('pg-boss', () => ({
  default: class {
    on = mockBoss.on;
    start = mockBoss.start;
    createQueue = mockBoss.createQueue;
    stop = mockBoss.stop;
    getQueueSize = mockBoss.getQueueSize;
    send = mockBoss.send;
    pause = mockBoss.pause;
    resume = mockBoss.resume;
  },
}));

// Import after mocks
import { pipelineRoutes } from './pipeline.js';

const AUTH_HEADER = 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx';

// Helper to build a test app
async function buildTestApp() {
  const app = Fastify({ logger: false });
  await app.register(bearerAuth);
  await app.register(pgBossPlugin);
  await app.register(pipelineRoutes);
  return app;
}

describe('Pipeline routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/pipeline/config', () => {
    it('returns 200 with pipeline config object', async () => {
      const app = await buildTestApp();
      const response = await app.inject({
        method: 'GET',
        url: '/api/pipeline/config',
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe('00000000-0000-0000-0000-000000000001');
      expect(body.data.quiz_only_mode).toBe(false);
      expect(body.error).toBe(null);

      await app.close();
    });
  });

  describe('PATCH /api/pipeline/config', () => {
    it('returns 200 with updated config when updating quiz_only_mode', async () => {
      const app = await buildTestApp();
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/pipeline/config',
        headers: { authorization: AUTH_HEADER, 'content-type': 'application/json' },
        payload: { quiz_only_mode: true },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.error).toBe(null);

      await app.close();
    });

    it('returns 400 ValidationError when body is invalid', async () => {
      const app = await buildTestApp();
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/pipeline/config',
        headers: { authorization: AUTH_HEADER, 'content-type': 'application/json' },
        payload: { quiz_only_mode: 'not-a-boolean' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('VALIDATION_ERROR');

      await app.close();
    });

    it('updates module priorities when priority_track is changed', async () => {
      const app = await buildTestApp();
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/pipeline/config',
        headers: { authorization: AUTH_HEADER, 'content-type': 'application/json' },
        payload: { priority_track: 'Admin' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.error).toBe(null);

      // Verify bulk module priority updates: priority=1 for matching track, priority=5 for non-matching
      expect(mockModulesUpdate).toHaveBeenCalledWith({ priority: 1 });
      expect(mockModulesUpdate).toHaveBeenCalledWith({ priority: 5 });

      await app.close();
    });
  });

  describe('POST /api/pipeline/pause', () => {
    it('returns 200 with paused: true and calls boss.pause for each queue', async () => {
      const app = await buildTestApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/pipeline/pause',
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.paused).toBe(true);
      expect(body.error).toBe(null);

      // Verify boss.pause was called for all 8 queues
      expect(mockBoss.pause).toHaveBeenCalledTimes(8);
      expect(mockBoss.pause).toHaveBeenCalledWith('scrape-module');
      expect(mockBoss.pause).toHaveBeenCalledWith('extract-content');
      expect(mockBoss.pause).toHaveBeenCalledWith('identify-concepts');
      expect(mockBoss.pause).toHaveBeenCalledWith('chunk-content');
      expect(mockBoss.pause).toHaveBeenCalledWith('generate-embeddings');
      expect(mockBoss.pause).toHaveBeenCalledWith('build-relationships');
      expect(mockBoss.pause).toHaveBeenCalledWith('answer-quiz');
      expect(mockBoss.pause).toHaveBeenCalledWith('submit-quiz');

      // Verify active run status was updated to 'paused'
      expect(mockRunsUpdate).toHaveBeenCalledWith({ status: 'paused' });

      await app.close();
    });
  });

  describe('POST /api/pipeline/resume', () => {
    it('returns 200 with resumed: true and calls boss.resume for each queue', async () => {
      const app = await buildTestApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/pipeline/resume',
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.resumed).toBe(true);
      expect(body.error).toBe(null);

      // Verify boss.resume was called for all 8 queues
      expect(mockBoss.resume).toHaveBeenCalledTimes(8);
      expect(mockBoss.resume).toHaveBeenCalledWith('scrape-module');
      expect(mockBoss.resume).toHaveBeenCalledWith('extract-content');
      expect(mockBoss.resume).toHaveBeenCalledWith('identify-concepts');
      expect(mockBoss.resume).toHaveBeenCalledWith('chunk-content');
      expect(mockBoss.resume).toHaveBeenCalledWith('generate-embeddings');
      expect(mockBoss.resume).toHaveBeenCalledWith('build-relationships');
      expect(mockBoss.resume).toHaveBeenCalledWith('answer-quiz');
      expect(mockBoss.resume).toHaveBeenCalledWith('submit-quiz');

      // Verify active run status was updated to 'active'
      expect(mockRunsUpdate).toHaveBeenCalledWith({ status: 'active' });

      await app.close();
    });
  });

  describe('POST /api/pipeline/cancel', () => {
    it('returns 200 with cancelled: true and calls boss.pause for each queue', async () => {
      const app = await buildTestApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/pipeline/cancel',
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.cancelled).toBe(true);
      expect(body.error).toBe(null);

      // Verify boss.pause was called for all 8 queues
      expect(mockBoss.pause).toHaveBeenCalledTimes(8);

      // Verify active run status was updated to 'cancelled'
      expect(mockRunsUpdate).toHaveBeenCalledWith({ status: 'cancelled' });

      await app.close();
    });
  });
});
