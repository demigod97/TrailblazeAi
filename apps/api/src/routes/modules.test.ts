import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { bearerAuth } from '../plugins/auth.js';
import { pgBossPlugin } from '../plugins/pg-boss.js';
import type { Module, Unit } from '@trailblaze/shared';

// Mock config to provide required env vars
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

// Mock @trailblaze/db to avoid real Supabase calls
vi.mock('@trailblaze/db', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'modules') {
        // Create a chainable mock that handles all query patterns
        const createChainableQuery = (): any => {
          const query = {
            select: vi.fn(function (this: unknown) {
              return createChainableQuery();
            }),
            order: vi.fn(function (_col: string, _opts: unknown) {
              return createChainableQuery();
            }),
            range: vi.fn(function (_offset: number, _end: number) {
              return createChainableQuery();
            }),
            eq: vi.fn(function (_col: string, _val: string) {
              return createChainableQuery();
            }),
            maybeSingle: vi.fn(function () {
              return Promise.resolve({
                data: null,
                error: null,
              });
            }),
          };
          return query;
        };
        return createChainableQuery();
      }
      return {};
    }),
  })),
}));

// Mock pg-boss to avoid real DB connection
vi.mock('pg-boss', () => ({
  default: class {
    on = vi.fn();
    start = vi.fn().mockResolvedValue(undefined);
    createQueue = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    getQueueSize = vi.fn().mockResolvedValue(0);
    send = vi.fn().mockResolvedValue(undefined);
    resume = vi.fn().mockResolvedValue(undefined);
  },
}));

// Import after mocks
import { modulesRoutes } from './modules.js';

describe('Module Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/modules', () => {
    it('returns 401 without authorization', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'GET',
        url: '/api/modules',
        // no Authorization header
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns modules list with count, offset, and limit', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'GET',
        url: '/api/modules',
        headers: {
          authorization: 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data.modules');
      expect(body).toHaveProperty('data.count');
      expect(body).toHaveProperty('data.offset');
      expect(body).toHaveProperty('data.limit');
      expect(Array.isArray(body.data.modules)).toBe(true);
      expect(typeof body.data.count).toBe('number');
      expect(typeof body.data.offset).toBe('number');
      expect(typeof body.data.limit).toBe('number');
    });

    it('calls eq with status value when status filter is provided', async () => {
      const eqSpy = vi.fn();
      const thenable = Promise.resolve({ data: [], error: null, count: 0 });
      const chain: Record<string, unknown> = {
        select: vi.fn(function () { return chain; }),
        order: vi.fn(function () { return chain; }),
        range: vi.fn(function () { return chain; }),
        eq: eqSpy,
        then: thenable.then.bind(thenable),
        catch: thenable.catch.bind(thenable),
        finally: thenable.finally.bind(thenable),
      };
      eqSpy.mockReturnValue(chain);

      const { createClient } = await import('@trailblaze/db');
      vi.mocked(createClient).mockReturnValueOnce({
        from: vi.fn(() => chain),
      } as never);

      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'GET',
        url: '/api/modules?status=completed',
        headers: {
          authorization: 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(eqSpy).toHaveBeenCalledWith('status', 'completed');
    });

    it('supports pagination with offset and limit', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'GET',
        url: '/api/modules?offset=10&limit=25',
        headers: {
          authorization: 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.offset).toBe(10);
      expect(body.data.limit).toBe(25);
    });

    it('returns 400 for invalid status value', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'GET',
        url: '/api/modules?status=invalid_status',
        headers: {
          authorization: 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid offset', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'GET',
        url: '/api/modules?offset=-1',
        headers: {
          authorization: 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('defaults to offset=0 and limit=50', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'GET',
        url: '/api/modules',
        headers: {
          authorization: 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.offset).toBe(0);
      expect(body.data.limit).toBe(50);
    });
  });

  describe('GET /api/modules/:id', () => {
    it('returns 401 without authorization', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/test-module-id',
        // no Authorization header
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns module and units when found', async () => {
      // Override mock to return a module with units
      const { createClient } = await import('@trailblaze/db');
      const mockModule: Module = {
        id: 'test-id',
        trailmix_id: 'test-trailmix',
        name: 'Test Module',
        url: 'https://test.com',
        status: 'pending',
        priority: 0,
        badge_url: null,
        badge_earned: false,
        retry_count: 0,
        failure_reason: null,
        type: null,
        track: null,
        estimated_minutes: null,
        unit_count: null,
        user_id: null,
        created_at: '2026-02-19T00:00:00Z',
        updated_at: '2026-02-19T00:00:00Z',
      };

      const mockUnit: Unit = {
        id: 'unit-1',
        module_id: 'test-id',
        title: 'Test Unit',
        url: 'https://test.com/unit',
        unit_index: 0,
        raw_html: null,
        content_markdown: null,
        user_id: null,
        created_at: '2026-02-19T00:00:00Z',
      };

      vi.mocked(createClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({
                  data: { ...mockModule, units: [mockUnit] },
                  error: null,
                }),
              ),
            })),
          })),
        })),
      } as any);

      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/test-id',
        headers: {
          authorization: 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data.module');
      expect(body).toHaveProperty('data.units');
      expect(Array.isArray(body.data.units)).toBe(true);
      expect(body.data.module.id).toBe('test-id');
    });

    it('returns 404 when module not found', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/nonexistent-id',
        headers: {
          authorization: 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/modules/:id/retry', () => {
    it('returns 401 without authorization', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/modules/test-id/retry',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 when module not found', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/modules/nonexistent-id/retry',
        headers: {
          authorization: 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 when module is not in failed status', async () => {
      const { createClient } = await import('@trailblaze/db');
      const mockModule: Module = {
        id: 'test-id',
        trailmix_id: 'test-trailmix',
        name: 'Test Module',
        url: 'https://test.com',
        status: 'pending',
        priority: 0,
        badge_url: null,
        badge_earned: false,
        retry_count: 0,
        failure_reason: null,
        type: null,
        track: null,
        estimated_minutes: null,
        unit_count: null,
        user_id: null,
        created_at: '2026-02-19T00:00:00Z',
        updated_at: '2026-02-19T00:00:00Z',
      };

      vi.mocked(createClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({
                  data: mockModule,
                  error: null,
                }),
              ),
            })),
          })),
          update: vi.fn(),
        })),
      } as any);

      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/modules/test-id/retry',
        headers: {
          authorization: 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 200 and resets retry_count when module is failed', async () => {
      const { createClient } = await import('@trailblaze/db');
      const mockModule: Module = {
        id: 'test-id',
        trailmix_id: 'test-trailmix',
        name: 'Test Module',
        url: 'https://test.com',
        status: 'failed',
        priority: 0,
        badge_url: null,
        badge_earned: false,
        retry_count: 3,
        failure_reason: null,
        type: null,
        track: null,
        estimated_minutes: null,
        unit_count: null,
        user_id: null,
        created_at: '2026-02-19T00:00:00Z',
        updated_at: '2026-02-19T00:00:00Z',
      };

      const mockUpdateChain = {
        eq: vi.fn(() => Promise.resolve({ error: null })),
      };

      const mockModulesChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: mockModule,
                error: null,
              }),
            ),
          })),
        })),
        update: vi.fn(() => mockUpdateChain),
      };

      vi.mocked(createClient).mockReturnValueOnce({
        from: vi.fn((table: string) => {
          if (table === 'modules') {
            return mockModulesChain;
          }
          return {};
        }),
      } as any);

      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(modulesRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/modules/test-id/retry',
        headers: {
          authorization: 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.module_id).toBe('test-id');

      // Verify DB update reset retry_count, status, and cleared failure_reason
      expect(mockModulesChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', retry_count: 0, failure_reason: null }),
      );

      // Verify the queue was resumed before re-enqueueing (fixes paused-queue AC3)
      expect((app.boss as unknown as { resume: ReturnType<typeof vi.fn> }).resume).toHaveBeenCalledWith('scrape-module');

      // Verify the module was re-enqueued to scrape-module queue
      expect(app.boss.send).toHaveBeenCalledWith('scrape-module', { module_id: 'test-id', run_id: null });
    });
  });
});
