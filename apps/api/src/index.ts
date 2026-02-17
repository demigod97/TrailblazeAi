import Fastify from "fastify";
import { config } from "./config.js";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

async function start() {
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    app.log.info(`Server listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
