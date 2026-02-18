import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { bearerAuth } from './auth.js';
import { config } from '../config.js';

describe('Bearer Auth Plugin', () => {
  it('should allow /health endpoint without auth', async () => {
    const app = Fastify({ logger: false });
    await app.register(bearerAuth);

    app.get('/health', async () => {
      return { status: 'ok' };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
  });

  it('should allow /health endpoint with query string without auth', async () => {
    const app = Fastify({ logger: false });
    await app.register(bearerAuth);

    app.get('/health', async () => {
      return { status: 'ok' };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health?v=1',
    });

    expect(response.statusCode).toBe(200);
  });

  it('should accept valid bearer token for protected endpoints', async () => {
    const app = Fastify({ logger: false });
    await app.register(bearerAuth);

    app.get('/api/test', async () => {
      return { data: 'test' };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/test',
      headers: {
        authorization: `Bearer ${config.bearerToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ data: 'test' });
  });

  it('should reject protected endpoints without auth header', async () => {
    const app = Fastify({ logger: false });
    await app.register(bearerAuth);

    app.get('/api/test', async () => {
      return { data: 'test' };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/test',
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload) as { data: null; error: { code: string; message: string } };
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject protected endpoints with invalid bearer token', async () => {
    const app = Fastify({ logger: false });
    await app.register(bearerAuth);

    app.get('/api/test', async () => {
      return { data: 'test' };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/test',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload) as { data: null; error: { code: string; message: string } };
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
