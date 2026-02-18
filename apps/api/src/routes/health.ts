import type { FastifyInstance } from 'fastify';
import { createClient } from '@trailblaze/db';
import { config } from '../config.js';
import { success } from '../lib/response.js';
import type { ApiResponse } from '../types/api.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  database: 'connected' | 'disconnected';
  queue: 'ready' | 'not_ready';
  timestamp: string;
}

export async function healthRoute(app: FastifyInstance): Promise<void> {
  // Create Supabase client once at registration time — not per-request
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

  app.get<{ Reply: ApiResponse<HealthStatus> }>('/health', async (_request, reply) => {
    // Check database connectivity via lightweight Supabase ping
    let dbConnected = false;
    try {
      const { error } = await supabase.from('modules').select('id').limit(1);
      dbConnected = error === null;
    } catch {
      dbConnected = false;
    }

    // Check pg-boss queue readiness via live getQueueSize call
    let queueReady = false;
    try {
      if (app.boss) {
        await app.boss.getQueueSize('scrape-module');
        queueReady = true;
      }
    } catch {
      queueReady = false;
    }

    const isHealthy = dbConnected && queueReady;

    const response: HealthStatus = {
      status: isHealthy ? 'healthy' : 'degraded',
      database: dbConnected ? 'connected' : 'disconnected',
      queue: queueReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
    };

    return reply.send(success(response));
  });
}
