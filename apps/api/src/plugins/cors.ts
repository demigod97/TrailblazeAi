import corsPlugin from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

export async function cors(app: FastifyInstance): Promise<void> {
  await app.register(corsPlugin, {
    // In production, API is called server-to-server from Vercel Edge Functions — no CORS needed.
    // In development, allow all origins for local testing.
    origin: config.nodeEnv !== 'production',
  });
}
