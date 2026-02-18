import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { error } from '../lib/response.js';

export const bearerAuth = fp(
  async (app: FastifyInstance) => {
    // Register bearer auth but skip /health
    app.addHook('onRequest', async (request, reply) => {
      // Skip auth for /health endpoint (strip query string for comparison)
      const pathname = request.url.split('?')[0];
      if (pathname === '/health') {
        return;
      }

      // Verify bearer token for all other requests
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send(error('UNAUTHORIZED', 'Missing or invalid bearer token'));
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      if (token !== config.bearerToken) {
        return reply.code(401).send(error('UNAUTHORIZED', 'Invalid bearer token'));
      }
    });
  },
  {
    name: 'bearerAuthPlugin',
  },
);
