import Fastify, { type FastifyServerOptions } from 'fastify';
import { cors } from './plugins/cors.js';
import { rateLimit } from './plugins/rate-limit.js';
import { bearerAuth } from './plugins/auth.js';
import { pgBossPlugin } from './plugins/pg-boss.js';
import { errorHandlerSetup } from './plugins/error-handler.js';
import { healthRoute } from './routes/health.js';
import { trailmixRoutes } from './routes/trailmix.js';
import { modulesRoutes } from './routes/modules.js';
import { knowledgeRoutes } from './routes/knowledge.js';
import quizResultsRoutes from './routes/quiz-results.js';
import { registerQueueHandlers } from './pipeline/queue-handlers.js';

export async function buildApp(opts?: FastifyServerOptions) {
  const app = Fastify({ logger: true, ...opts });

  // Register plugins in order
  await app.register(cors);
  await app.register(rateLimit);

  // Health route must be registered BEFORE auth plugin to bypass auth
  await app.register(healthRoute);

  // Auth plugin applies to all routes registered after it
  await app.register(bearerAuth);

  // Queue plugin
  await app.register(pgBossPlugin);

  // Register queue handlers after pgBossPlugin is registered
  await registerQueueHandlers(app.boss);

  // Authenticated routes registered after bearerAuth
  await app.register(trailmixRoutes);
  await app.register(modulesRoutes);
  await app.register(knowledgeRoutes);
  await app.register(quizResultsRoutes);

  // Set global error handler
  errorHandlerSetup(app);

  return app;
}
