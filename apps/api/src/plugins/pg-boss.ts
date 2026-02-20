import fp from 'fastify-plugin';
import PgBoss from 'pg-boss';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyInstance {
    boss: PgBoss;
  }
}

export const pgBossPlugin = fp(
  async (app: FastifyInstance) => {
    const boss = new PgBoss(config.databaseUrl);

    boss.on('error', (error: unknown) => {
      if (error instanceof Error) {
        app.log.error(error);
      }
    });

    await boss.start();

    // Create all 7 stage queues with stage-specific retry and expiry config
    const queueConfigs: PgBoss.Queue[] = [
      { name: 'scrape-module', retryLimit: 3, retryBackoff: true, expireInHours: 1 },
      { name: 'extract-content', retryLimit: 2, retryBackoff: true, expireInHours: 0.5 },
      { name: 'identify-concepts', retryLimit: 2, retryBackoff: true, expireInHours: 0.5 },
      { name: 'chunk-content', retryLimit: 2, expireInMinutes: 10 },
      { name: 'generate-embeddings', retryLimit: 3, retryBackoff: true, expireInMinutes: 15 },
      { name: 'build-relationships', retryLimit: 2, retryBackoff: true, expireInHours: 0.5 },
      { name: 'answer-quiz', retryLimit: 2, retryBackoff: true, expireInHours: 0.5 },
      { name: 'submit-quiz', retryLimit: 2, retryBackoff: true, expireInHours: 1 },
    ];

    for (const queue of queueConfigs) {
      await boss.createQueue(queue.name, queue);
    }

    app.log.info(`Initialized pg-boss with queue configs: ${queueConfigs.map((q) => q.name).join(', ')}`);

    app.decorate('boss', boss);

    app.addHook('onClose', async () => {
      await boss.stop();
    });
  },
  {
    name: 'pgBossPlugin',
  },
);
