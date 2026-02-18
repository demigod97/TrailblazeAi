// Set up environment variables BEFORE any imports
process.env.API_BEARER_TOKEN = 'test-token-32-chars-minimum-length';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.DATABASE_URL = 'postgres://test';
process.env.NODE_ENV = 'test';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { trailmixRoutes } from './trailmix.js';
import { pgBossPlugin } from '../plugins/pg-boss.js';
import { bearerAuth } from '../plugins/auth.js';
import { config } from '../config.js';

// Mock @trailblaze/db to avoid real Supabase calls
vi.mock('@trailblaze/db', () => ({
  createClient: vi.fn(() => {
    const createBuilder = (table: string) => ({
      insert: vi.fn(function (this: unknown) {
        return createBuilder(table);
      }),
      select: vi.fn(function (this: unknown) {
        return createBuilder(table);
      }),
      single: vi.fn(async function (this: unknown) {
        if (table === 'runs') {
          return {
            data: {
              id: 'test-run-id',
              trailmix_id: 'test-trailmix-id',
              status: 'active',
              started_at: new Date().toISOString(),
              completed_at: null,
              total_cost: null,
              user_id: null,
            },
            error: null,
          };
        }
        if (table === 'modules') {
          return {
            data: {
              id: 'test-module-id',
              trailmix_id: 'test-trailmix-id',
              name: 'Test Module',
              url: 'https://trailhead.salesforce.com/modules/test',
              status: 'pending',
              priority: 0,
              badge_url: null,
              badge_earned: false,
              retry_count: 0,
              type: null,
              track: null,
              estimated_minutes: null,
              unit_count: null,
              user_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          };
        }
        return { data: {}, error: null };
      }),
    });

    return {
      from: vi.fn((table: string) => createBuilder(table)),
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

// Mock fetch for discoverModules
globalThis.fetch = vi.fn();

describe('Trailmix Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/trailmix/import', () => {
    it('should return 401 without Bearer token', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(trailmixRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailmix/import',
        payload: { url: 'https://trailhead.salesforce.com/trails/get-started' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when url is missing in body', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(trailmixRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailmix/import',
        headers: { authorization: `Bearer ${config.bearerToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when URL is not a valid Trailhead URL', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(trailmixRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailmix/import',
        headers: { authorization: `Bearer ${config.bearerToken}` },
        payload: { url: 'https://google.com' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload) as { error: { message: string } };
      expect(body.error.message).toContain('valid Trailhead');
    });

    it('should return 400 when URL is not a valid URL format', async () => {
      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(trailmixRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailmix/import',
        headers: { authorization: `Bearer ${config.bearerToken}` },
        payload: { url: 'not-a-url' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 201 with run and modules on valid Trailhead URL', async () => {
      // Mock fetch to return HTML with module links
      const mockHtml = `
        <html>
          <body>
            <a href="/modules/test-module">Test Module</a>
            <a href="/trails/test-trail">Test Trail</a>
          </body>
        </html>
      `;
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(trailmixRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailmix/import',
        headers: { authorization: `Bearer ${config.bearerToken}` },
        payload: { url: 'https://trailhead.salesforce.com/trails/get-started' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload) as {
        data: { run: { id: string }; modules: unknown[] };
        error: null;
      };
      expect(body.data).toBeDefined();
      expect(body.data.run).toBeDefined();
      expect(body.data.modules).toBeDefined();
      expect(body.error).toBeNull();
    });

    it('should return 201 with empty modules when discovery returns no modules', async () => {
      // Mock fetch to return HTML without module links
      const mockHtml = '<html><body><h1>Page</h1></body></html>';
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(trailmixRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailmix/import',
        headers: { authorization: `Bearer ${config.bearerToken}` },
        payload: { url: 'https://trailhead.salesforce.com/trails/empty' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload) as {
        data: { run: { id: string }; modules: unknown[] };
        error: null;
      };
      expect(body.data.modules).toStrictEqual([]);
    });

    it('should enqueue scrape-module job for each discovered module', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="/modules/module1">Module 1</a>
            <a href="/modules/module2">Module 2</a>
          </body>
        </html>
      `;
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(trailmixRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailmix/import',
        headers: { authorization: `Bearer ${config.bearerToken}` },
        payload: { url: 'https://trailhead.salesforce.com/trails/test' },
      });

      expect(response.statusCode).toBe(201);
      // Verify that boss.send was called for each module
      expect(vi.mocked(app.boss.send)).toHaveBeenCalledWith('scrape-module', expect.any(Object));
    });

    it('should return ApiSuccess envelope with correct shape', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="/modules/test">Test</a>
          </body>
        </html>
      `;
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const app = Fastify({ logger: false });
      await app.register(bearerAuth);
      await app.register(pgBossPlugin);
      await app.register(trailmixRoutes);

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailmix/import',
        headers: { authorization: `Bearer ${config.bearerToken}` },
        payload: { url: 'https://trailhead.salesforce.com/trails/test' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error');
      expect(body.error).toBeNull();
      expect(body.data.run).toBeDefined();
      expect(body.data.modules).toBeDefined();
    });
  });

  describe('discoverModules function', () => {
    it('should extract module links from HTML', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="/modules/test-module">Test Module</a>
            <a href="https://trailhead.salesforce.com/modules/another">Another</a>
          </body>
        </html>
      `;
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const { discoverModules } = await import('./trailmix.js');
      const modules = await discoverModules('https://trailhead.salesforce.com/test');

      expect(modules).toHaveLength(2);
      expect(modules[0]).toHaveProperty('name');
      expect(modules[0]).toHaveProperty('url');
    });

    it('should return empty array on fetch failure', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'));

      const { discoverModules } = await import('./trailmix.js');
      const modules = await discoverModules('https://trailhead.salesforce.com/test');

      expect(modules).toStrictEqual([]);
    });

    it('should return empty array on non-ok response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        text: async () => '',
      } as Response);

      const { discoverModules } = await import('./trailmix.js');
      const modules = await discoverModules('https://trailhead.salesforce.com/test');

      expect(modules).toStrictEqual([]);
    });

    it('should deduplicate module URLs', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="/modules/test">Test</a>
            <a href="/modules/test">Test</a>
          </body>
        </html>
      `;
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const { discoverModules } = await import('./trailmix.js');
      const modules = await discoverModules('https://trailhead.salesforce.com/test');

      expect(modules).toHaveLength(1);
    });

    it('should set null for missing optional fields', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="/modules/test">Test Module</a>
          </body>
        </html>
      `;
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const { discoverModules } = await import('./trailmix.js');
      const modules = await discoverModules('https://trailhead.salesforce.com/test');

      expect(modules[0]).toEqual({
        name: expect.any(String),
        url: expect.any(String),
        type: null,
        track: null,
        estimated_minutes: null,
        unit_count: null,
      });
    });
  });
});
