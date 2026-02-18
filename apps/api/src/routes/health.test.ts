import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { healthRoute } from './health.js';
import { pgBossPlugin } from '../plugins/pg-boss.js';

// Mock @trailblaze/db to avoid real Supabase calls
vi.mock('@trailblaze/db', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
      })),
    })),
  })),
}));

// Mock pg-boss to avoid real DB connection in queue tests
vi.mock('pg-boss', () => ({
  default: class {
    on = vi.fn();
    start = vi.fn().mockResolvedValue(undefined);
    createQueue = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    getQueueSize = vi.fn().mockResolvedValue(0);
  },
}));

describe('Health Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with healthy status when everything is ok', async () => {
    const app = Fastify({ logger: false });
    await app.register(healthRoute);

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as { data: { status: string }; error: null };
    expect(body.data).toBeDefined();
    expect(body.data.status).toBeDefined();
    expect(body.error).toBeNull();
  });

  it('should return correct response shape with ApiSuccess envelope', async () => {
    const app = Fastify({ logger: false });
    await app.register(healthRoute);

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as { data: unknown; error: null };
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('error');
    expect(body.error).toBeNull();
  });

  it('should include database status in response', async () => {
    const app = Fastify({ logger: false });
    await app.register(healthRoute);

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.payload) as { data: { database: string } };
    expect(body.data).toHaveProperty('database');
    expect(['connected', 'disconnected']).toContain(body.data.database);
  });

  it('should include queue status in response', async () => {
    const app = Fastify({ logger: false });
    await app.register(healthRoute);

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.payload) as { data: { queue: string } };
    expect(body.data).toHaveProperty('queue');
    expect(['ready', 'not_ready']).toContain(body.data.queue);
  });

  it('should include timestamp as valid ISO 8601 string', async () => {
    const app = Fastify({ logger: false });
    await app.register(healthRoute);

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.payload) as { data: { timestamp: string } };
    expect(body.data).toHaveProperty('timestamp');
    expect(typeof body.data.timestamp).toBe('string');
    expect(new Date(body.data.timestamp).toISOString()).toBe(body.data.timestamp);
  });

  it('should include status field (healthy or degraded)', async () => {
    const app = Fastify({ logger: false });
    await app.register(healthRoute);

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.payload) as { data: { status: string } };
    expect(body.data).toHaveProperty('status');
    expect(['healthy', 'degraded']).toContain(body.data.status);
  });

  it('should report database disconnected when Supabase ping fails', async () => {
    // Override mock before registration — client is created at registration time
    const { createClient } = await import('@trailblaze/db');
    vi.mocked(createClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection refused', code: 'PGRST001' },
          }),
        })),
      })),
    } as unknown as ReturnType<typeof createClient>);

    const app = Fastify({ logger: false });
    await app.register(healthRoute);

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as { data: { database: string; status: string }; error: null };
    expect(body.data.database).toBe('disconnected');
    expect(body.data.status).toBe('degraded');
    expect(body.error).toBeNull();
  });

  it('should report queue ready when pg-boss getQueueSize succeeds', async () => {
    const app = Fastify({ logger: false });
    // Register pg-boss plugin first so app.boss is decorated
    await app.register(pgBossPlugin);
    await app.register(healthRoute);

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as { data: { queue: string; status: string; database: string } };
    expect(body.data.queue).toBe('ready');
    // With DB connected (mock returns error: null) and queue ready → healthy
    expect(body.data.status).toBe('healthy');
  });
});
