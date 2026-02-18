import { buildApp } from './app.js';
import { config } from './config.js';

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${config.port}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
