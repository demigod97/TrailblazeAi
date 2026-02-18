import rateLimitPlugin from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

export async function rateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimitPlugin, {
    max: 100,
    timeWindow: '1 minute',
  });
}
