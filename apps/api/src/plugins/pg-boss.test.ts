import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { pgBossPlugin } from './pg-boss.js';

// Mock pg-boss
vi.mock('pg-boss', () => {
  const MockPgBoss = class {
    on = vi.fn();
    start = vi.fn().mockResolvedValue(undefined);
    createQueue = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
  };

  return {
    default: MockPgBoss,
  };
});

describe('pg-boss Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should register pg-boss plugin and decorate app', async () => {
    const app = Fastify({ logger: false });
    await app.register(pgBossPlugin);

    expect(app.boss).toBeDefined();
  });

  it('should initialize with all 8 queue configurations', async () => {
    const app = Fastify({ logger: false });
    await app.register(pgBossPlugin);

    expect(app.boss).toBeDefined();
    expect(app.boss.start).toHaveBeenCalled();
    expect(app.boss.createQueue).toHaveBeenCalledTimes(8);

    const calls = vi.mocked(app.boss.createQueue).mock.calls as Array<[string, ...unknown[]]>;
    const queueNames = calls.map(([name]) => name);
    expect(queueNames).toContain('scrape-module');
    expect(queueNames).toContain('extract-content');
    expect(queueNames).toContain('identify-concepts');
    expect(queueNames).toContain('chunk-content');
    expect(queueNames).toContain('generate-embeddings');
    expect(queueNames).toContain('build-relationships');
    expect(queueNames).toContain('answer-quiz');
    expect(queueNames).toContain('submit-quiz');
  });

  it('should call boss.start() during registration', async () => {
    const app = Fastify({ logger: false });
    await app.register(pgBossPlugin);

    const boss = app.boss;
    expect(boss.start).toHaveBeenCalled();
  });

  it('creates scrape-module queue with retryLimit: 3, retryBackoff: true, expireInHours: 1', async () => {
    const app = Fastify({ logger: false });
    await app.register(pgBossPlugin);

    expect(app.boss.createQueue).toHaveBeenCalledWith(
      'scrape-module',
      expect.objectContaining({
        retryLimit: 3,
        retryBackoff: true,
        expireInHours: 1,
      }),
    );
  });

  it('creates extract-content queue with retryLimit: 2, retryBackoff: true, expireInHours: 0.5', async () => {
    const app = Fastify({ logger: false });
    await app.register(pgBossPlugin);

    expect(app.boss.createQueue).toHaveBeenCalledWith(
      'extract-content',
      expect.objectContaining({
        retryLimit: 2,
        retryBackoff: true,
        expireInHours: 0.5,
      }),
    );
  });
});
