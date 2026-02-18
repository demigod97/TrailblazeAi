import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { errorHandlerSetup } from './error-handler.js';
import { AppError, NotFoundError, ValidationError, PipelineError } from '../lib/errors.js';

describe('Error Handler Plugin', () => {
  it('should map AppError to correct status code', async () => {
    const app = Fastify({ logger: false });
    errorHandlerSetup(app);

    app.get('/test', async () => {
      throw new AppError('TEST_ERROR', 'test error', 503);
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('TEST_ERROR');
    expect(body.error.message).toBe('test error');
  });

  it('should map NotFoundError to 404', async () => {
    const app = Fastify({ logger: false });
    errorHandlerSetup(app);

    app.get('/test', async () => {
      throw new NotFoundError('User', 'user-123');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('User');
  });

  it('should map ValidationError to 400', async () => {
    const app = Fastify({ logger: false });
    errorHandlerSetup(app);

    app.get('/test', async () => {
      throw new ValidationError('Invalid input', { field: 'email' });
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual({ field: 'email' });
  });

  it('should map PipelineError to 500', async () => {
    const app = Fastify({ logger: false });
    errorHandlerSetup(app);

    app.get('/test', async () => {
      throw new PipelineError('scraping', 'Failed to scrape');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('PIPELINE_ERROR');
    expect(body.error.message).toContain('scraping');
  });

  it('should handle non-AppError errors with 500', async () => {
    const app = Fastify({ logger: false });
    errorHandlerSetup(app);

    app.get('/test', async () => {
      throw new Error('Generic error');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should include error details in response', async () => {
    const app = Fastify({ logger: false });
    errorHandlerSetup(app);

    const details = { field: 'test', issue: 'invalid' };
    app.get('/test', async () => {
      throw new AppError('CUSTOM_ERROR', 'test', 400, details);
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    const body = JSON.parse(response.payload);
    expect(body.error.details).toEqual(details);
  });
});
