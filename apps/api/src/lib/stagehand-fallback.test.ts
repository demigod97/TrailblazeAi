import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { extractWithStagehand } from './stagehand-fallback.js';

// Mock Stagehand using vi.hoisted (required for ESM mock hoisting)
const { MockStagehand, mockExtract, mockInit, mockClose, mockGoto, mockActivePage } = vi.hoisted(
  () => {
    const mockExtract = vi.fn().mockResolvedValue({ content: 'extracted data' });
    const mockInit = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn().mockResolvedValue(undefined);
    const mockGoto = vi.fn().mockResolvedValue(undefined);
    const mockActivePage = vi.fn().mockReturnValue({ goto: mockGoto });
    const MockStagehand = vi.fn().mockImplementation(() => ({
      init: mockInit,
      close: mockClose,
      extract: mockExtract,
      context: { activePage: mockActivePage },
    }));
    return { MockStagehand, mockExtract, mockInit, mockClose, mockGoto, mockActivePage };
  },
);

vi.mock('@browserbasehq/stagehand', () => ({ Stagehand: MockStagehand }));

// Mock logToolTrace
const { mockLogToolTrace } = vi.hoisted(() => {
  const mockLogToolTrace = vi.fn().mockResolvedValue(undefined);
  return { mockLogToolTrace };
});

vi.mock('./agent-logger.js', () => ({ logToolTrace: mockLogToolTrace }));

describe('extractWithStagehand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActivePage.mockReturnValue({ goto: mockGoto });
  });

  it('should call Stagehand constructor with correct v3 config', async () => {
    const mockSupabase = {} as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;
    const schema = z.object({ title: z.string() });

    await extractWithStagehand({
      url: 'https://example.com',
      schema,
      instruction: 'extract title',
      supabase: mockSupabase,
      runId: 'run-123',
    });

    expect(MockStagehand).toHaveBeenCalledWith({
      env: 'LOCAL',
      model: 'claude-haiku-4-5-20251001',
      verbose: 0,
      disablePino: true,
    });
  });

  it('should call stagehand.init(), page.goto(), and extract() in order', async () => {
    const mockSupabase = {} as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;
    const schema = z.object({ title: z.string() });
    const callOrder: string[] = [];

    mockInit.mockImplementation(() => {
      callOrder.push('init');
      return Promise.resolve(undefined);
    });
    mockGoto.mockImplementation(() => {
      callOrder.push('goto');
      return Promise.resolve(undefined);
    });
    mockExtract.mockImplementation(() => {
      callOrder.push('extract');
      return Promise.resolve({ title: 'Test Title' });
    });

    await extractWithStagehand({
      url: 'https://example.com',
      schema,
      instruction: 'extract title',
      supabase: mockSupabase,
      runId: 'run-123',
    });

    expect(callOrder).toEqual(['init', 'goto', 'extract']);
    expect(mockGoto).toHaveBeenCalledWith('https://example.com');
  });

  it('should call extract with instruction and schema as separate args', async () => {
    const mockSupabase = {} as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;
    const schema = z.object({ title: z.string() });

    await extractWithStagehand({
      url: 'https://example.com',
      schema,
      instruction: 'extract the page title',
      supabase: mockSupabase,
      runId: 'run-123',
    });

    expect(mockExtract).toHaveBeenCalledWith('extract the page title', schema);
  });

  it('should call logToolTrace with tool_type: "stagehand" and agent_type: "scraper"', async () => {
    const mockSupabase = {} as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;
    const schema = z.object({ title: z.string() });
    const extractedData = { title: 'Test Title' };
    mockExtract.mockResolvedValue(extractedData);

    await extractWithStagehand({
      url: 'https://example.com',
      schema,
      instruction: 'extract title',
      supabase: mockSupabase,
      runId: 'run-123',
    });

    expect(mockLogToolTrace).toHaveBeenCalledWith(
      mockSupabase,
      expect.objectContaining({
        tool_type: 'stagehand',
        agent_type: 'scraper',
        query: 'extract title',
        run_id: 'run-123',
        summary: 'Stagehand extraction',
      }),
    );
  });

  it('should return the extracted data from stagehand.extract()', async () => {
    const mockSupabase = {} as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;
    const schema = z.object({ title: z.string(), content: z.string() });
    const extractedData = { title: 'Test Title', content: 'Test Content' };
    mockExtract.mockResolvedValue(extractedData);

    const result = await extractWithStagehand({
      url: 'https://example.com',
      schema,
      instruction: 'extract title and content',
      supabase: mockSupabase,
      runId: null,
    });

    expect(result).toEqual(extractedData);
  });

  it('should call stagehand.close() in finally block (success case)', async () => {
    const mockSupabase = {} as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;
    const schema = z.object({ title: z.string() });

    await extractWithStagehand({
      url: 'https://example.com',
      schema,
      instruction: 'extract title',
      supabase: mockSupabase,
      runId: 'run-123',
    });

    expect(mockClose).toHaveBeenCalled();
  });

  it('should call stagehand.close() even when extract throws', async () => {
    const mockSupabase = {} as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;
    const schema = z.object({ title: z.string() });
    mockExtract.mockRejectedValueOnce(new Error('Extract failed'));

    try {
      await extractWithStagehand({
        url: 'https://example.com',
        schema,
        instruction: 'extract title',
        supabase: mockSupabase,
        runId: 'run-123',
      });
    } catch {
      // Expected to throw
    }

    expect(mockClose).toHaveBeenCalled();
  });

  it('should include raw_output_truncated in logToolTrace', async () => {
    const mockSupabase = {} as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;
    const schema = z.object({ title: z.string() });
    const longData = { title: 'x'.repeat(60000) };
    mockExtract.mockResolvedValue(longData);

    await extractWithStagehand({
      url: 'https://example.com',
      schema,
      instruction: 'extract title',
      supabase: mockSupabase,
      runId: 'run-123',
    });

    expect(mockLogToolTrace).toHaveBeenCalledWith(
      mockSupabase,
      expect.objectContaining({
        raw_output_truncated: true,
      }),
    );
  });

  it('should throw if no active page after init()', async () => {
    const mockSupabase = {} as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;
    const schema = z.object({ title: z.string() });
    mockActivePage.mockReturnValueOnce(undefined);

    await expect(
      extractWithStagehand({
        url: 'https://example.com',
        schema,
        instruction: 'extract title',
        supabase: mockSupabase,
        runId: 'run-123',
      }),
    ).rejects.toThrow('Stagehand: no active page after init()');

    expect(mockClose).toHaveBeenCalled();
  });
});
