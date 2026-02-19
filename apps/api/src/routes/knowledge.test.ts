import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { bearerAuth } from '../plugins/auth.js';
import { pgBossPlugin } from '../plugins/pg-boss.js';

// Mock config
vi.mock('../config.js', () => ({
  config: {
    port: 3001,
    bearerToken: 'test-bearer-token-that-is-at-least-32-characters-long-xxx',
    supabaseUrl: 'https://test.supabase.co',
    supabaseServiceKey: 'test-key',
    anthropicApiKey: 'test-key',
    openaiApiKey: 'test-key',
    databaseUrl: 'postgresql://test',
    nodeEnv: 'test',
  },
}));

// Mock AI SDK embed()
const { mockEmbed } = vi.hoisted(() => {
  const mockEmbed = vi.fn().mockResolvedValue({
    embedding: new Array(1536).fill(0.1),
    usage: { tokens: 10 },
  });
  return { mockEmbed };
});
vi.mock('ai', () => ({ embed: mockEmbed }));

// Mock @ai-sdk/openai
const { mockOpenai } = vi.hoisted(() => {
  const mockEmbeddingModel = { type: 'embedding', modelId: 'text-embedding-3-small' };
  const mockOpenai = { embedding: vi.fn().mockReturnValue(mockEmbeddingModel) };
  return { mockOpenai };
});
vi.mock('@ai-sdk/openai', () => ({ openai: mockOpenai }));

// Mock Supabase with realistic fixture data
const mockChunk = {
  id: 'chunk-1',
  module_id: 'module-1',
  unit_id: 'unit-1',
  chunk_text: 'Apex triggers allow you to perform custom actions before or after DML events.',
  content_type: 'explanation',
  difficulty: 'intermediate',
  sf_topics: ['Apex', 'Triggers'],
  section_header: 'Understanding Apex Triggers',
  relevance_score: 0.95,
};

// Default mock: successful search with one result
vi.mock('@trailblaze/db', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ data: [mockChunk], error: null }),
    from: vi.fn((table: string) => {
      if (table === 'units') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'unit-1', title: 'Apex Triggers Deep Dive' }],
              error: null,
            }),
          })),
        };
      }
      if (table === 'modules') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'module-1', name: 'Apex Fundamentals' }],
              error: null,
            }),
          })),
        };
      }
      if (table === 'sf_concept_relationships') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        };
      }
      return { select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })) };
    }),
  })),
}));

// Mock pg-boss
vi.mock('pg-boss', () => ({
  default: class {
    on = vi.fn();
    start = vi.fn().mockResolvedValue(undefined);
    createQueue = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    getQueueSize = vi.fn().mockResolvedValue(0);
    send = vi.fn().mockResolvedValue(undefined);
  },
}));

// Import after mocks
import { knowledgeRoutes } from './knowledge.js';

const AUTH_HEADER = 'Bearer test-bearer-token-that-is-at-least-32-characters-long-xxx';

// Helper to build a test app
async function buildTestApp() {
  const app = Fastify({ logger: false });
  await app.register(bearerAuth);
  await app.register(pgBossPlugin);
  await app.register(knowledgeRoutes);
  return app;
}

describe('GET /api/knowledge/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default successful mock after each test
    mockEmbed.mockResolvedValue({ embedding: new Array(1536).fill(0.1), usage: { tokens: 10 } });
  });

  it('returns 401 without Authorization header', async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/knowledge/search?q=apex' });
    expect(response.statusCode).toBe(401);
  });

  it('returns 400 when q query param is missing', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search',
      headers: { authorization: AUTH_HEADER },
    });
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with results including all required fields', async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex+triggers',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: {
        results: Array<{
          id: string;
          chunk_text: string;
          content_type: string;
          sf_topics: string[];
          module_name: string;
          unit_title: string;
          relevance_score: number;
          related_chunk_ids: string[];
        }>;
        count: number;
        offset: number;
        limit: number;
      };
      error: null;
    };
    expect(body.data.results.length).toBeGreaterThan(0);
    expect(body.data.count).toBe(1);
    expect(body.data.offset).toBe(0);
    expect(body.data.limit).toBe(10);

    const result = body.data.results[0];
    expect(result).toBeDefined();
    expect(result?.chunk_text).toContain('Apex triggers');
    expect(result?.content_type).toBe('explanation');
    expect(result?.sf_topics).toEqual(['Apex', 'Triggers']);
    expect(result?.module_name).toBe('Apex Fundamentals');
    expect(result?.unit_title).toBe('Apex Triggers Deep Dive');
    expect(result?.relevance_score).toBe(0.95);
    expect(Array.isArray(result?.related_chunk_ids)).toBe(true);
  });

  it('returns empty array with count 0 when RPC returns no results', async () => {
    const { createClient } = await import('@trailblaze/db');
    vi.mocked(createClient).mockReturnValueOnce({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    } as never);

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=nonexistent+topic+xyz',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.results).toEqual([]);
    expect(body.data.count).toBe(0);
  });

  it('calls embed() with the query text', async () => {
    const app = await buildTestApp();
    await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex+triggers',
      headers: { authorization: AUTH_HEADER },
    });

    expect(mockEmbed).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'apex triggers' }),
    );
  });

  it('calls supabase.rpc with knowledge_search and the generated embedding', async () => {
    const { createClient } = await import('@trailblaze/db');
    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(createClient).mockReturnValueOnce({
      rpc: mockRpc,
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    } as never);

    const app = await buildTestApp();
    await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=soql',
      headers: { authorization: AUTH_HEADER },
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'knowledge_search',
      expect.objectContaining({
        query_text: 'soql',
        query_embedding: expect.any(Array),
        match_count: expect.any(Number),
      }),
    );
  });

  it('applies content_type filter — only returns matching chunks', async () => {
    const { createClient } = await import('@trailblaze/db');
    const codeChunk = { ...mockChunk, id: 'code-chunk', content_type: 'code', relevance_score: 0.9 };
    const explanationChunk = { ...mockChunk, id: 'explanation-chunk', content_type: 'explanation', relevance_score: 0.8 };
    vi.mocked(createClient).mockReturnValueOnce({
      rpc: vi.fn().mockResolvedValue({ data: [codeChunk, explanationChunk], error: null }),
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    } as never);

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex&content_type=code',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.results.every((r: { content_type: string }) => r.content_type === 'code')).toBe(true);
  });

  it('applies sf_topics filter — only returns chunks with overlapping topics', async () => {
    const { createClient } = await import('@trailblaze/db');
    const apexChunk = { ...mockChunk, id: 'apex-chunk', sf_topics: ['Apex', 'Triggers'], relevance_score: 0.9 };
    const soqlChunk = { ...mockChunk, id: 'soql-chunk', sf_topics: ['SOQL', 'Data Management'], relevance_score: 0.8 };
    vi.mocked(createClient).mockReturnValueOnce({
      rpc: vi.fn().mockResolvedValue({ data: [apexChunk, soqlChunk], error: null }),
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    } as never);

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex&sf_topics=Apex',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const ids = body.data.results.map((r: { id: string }) => r.id);
    expect(ids).toContain('apex-chunk');
    expect(ids).not.toContain('soql-chunk');
  });

  it('returns 500 when embed() throws an error', async () => {
    mockEmbed.mockRejectedValueOnce(new Error('OpenAI API rate limit'));

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('PIPELINE_ERROR');
  });

  it('returns 500 when supabase RPC returns an error', async () => {
    const { createClient } = await import('@trailblaze/db');
    vi.mocked(createClient).mockReturnValueOnce({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'RPC execution failed' } }),
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    } as never);

    const app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/knowledge/search?q=apex',
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('PIPELINE_ERROR');
  });
});
