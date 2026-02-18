import { describe, it, expect, vi } from 'vitest';
import { logToolTrace } from './agent-logger.js';

describe('logToolTrace', () => {
  it('should call supabase.from("agent_logs").insert() with correct shape', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom } as unknown as ReturnType<
      typeof import('@trailblaze/db').createClient
    >;

    const params = {
      run_id: 'run-123',
      agent_type: 'scraper' as const,
      tool_type: 'playwright_mcp' as const,
      query: 'extract module content',
      raw_output: 'output content',
      summary: 'Successfully extracted',
      raw_output_truncated: false,
      input_tokens: 100,
      output_tokens: 200,
      estimated_cost_usd: 0.001,
      duration_ms: 1500,
      confidence_score: 0.95,
      related_chunk_ids: ['chunk-1', 'chunk-2'],
    };

    await logToolTrace(mockSupabase, params);

    expect(mockFrom).toHaveBeenCalledWith('agent_logs');
    expect(mockInsert).toHaveBeenCalledWith(params);
  });

  it('should insert record with tool_type: "stagehand"', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom } as unknown as ReturnType<
      typeof import('@trailblaze/db').createClient
    >;

    const params = {
      run_id: null,
      agent_type: 'scraper' as const,
      tool_type: 'stagehand' as const,
      query: 'extract with fallback',
      raw_output: null,
      summary: 'Stagehand extraction',
      raw_output_truncated: false,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_usd: 0,
      duration_ms: 5000,
      confidence_score: null,
      related_chunk_ids: null,
    };

    await logToolTrace(mockSupabase, params);

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ tool_type: 'stagehand' }));
  });

  it('should not throw and should console.error when Supabase returns an error object', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: { message: 'Database error' } });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom } as unknown as ReturnType<
      typeof import('@trailblaze/db').createClient
    >;

    const params = {
      run_id: 'run-123',
      agent_type: 'scraper' as const,
      tool_type: 'playwright_mcp' as const,
      query: 'test',
      raw_output: null,
      summary: 'test',
      raw_output_truncated: false,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_usd: 0,
      duration_ms: 0,
      confidence_score: null,
      related_chunk_ids: null,
    };

    const spyConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(logToolTrace(mockSupabase, params)).resolves.not.toThrow();
    expect(spyConsoleError).toHaveBeenCalledWith(
      'Failed to log tool trace to agent_logs:',
      'Database error',
    );

    spyConsoleError.mockRestore();
  });

  it('should not throw when insert throws', async () => {
    const mockInsert = vi.fn().mockRejectedValue(new Error('Insert failed'));
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom } as unknown as ReturnType<
      typeof import('@trailblaze/db').createClient
    >;

    const params = {
      run_id: 'run-123',
      agent_type: 'scraper' as const,
      tool_type: 'playwright_mcp' as const,
      query: 'test',
      raw_output: null,
      summary: 'test',
      raw_output_truncated: false,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_usd: 0,
      duration_ms: 0,
      confidence_score: null,
      related_chunk_ids: null,
    };

    const spyConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(logToolTrace(mockSupabase, params)).resolves.not.toThrow();
    expect(spyConsoleError).toHaveBeenCalledWith(
      'Failed to log tool trace to agent_logs:',
      'Insert failed',
    );

    spyConsoleError.mockRestore();
  });
});
