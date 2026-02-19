import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEmbedMany } = vi.hoisted(() => {
  const mockEmbedMany = vi.fn().mockResolvedValue({
    embeddings: [
      new Array(1536).fill(0.1),
      new Array(1536).fill(0.2),
    ],
    usage: { tokens: 250 },
  });
  return { mockEmbedMany };
});
vi.mock('ai', () => ({ embedMany: mockEmbedMany }));

const { mockOpenAi } = vi.hoisted(() => {
  const mockOpenAi = {
    embedding: vi.fn().mockReturnValue({ id: 'text-embedding-3-small' }),
  };
  return { mockOpenAi };
});
vi.mock('@ai-sdk/openai', () => ({ openai: mockOpenAi }));

const { mockLogToolTrace } = vi.hoisted(() => {
  const mockLogToolTrace = vi.fn().mockResolvedValue(undefined);
  return { mockLogToolTrace };
});
vi.mock('../../lib/agent-logger.js', () => ({ logToolTrace: mockLogToolTrace }));

import { generateUnitEmbeddings, EMBEDDING_COST_PER_TOKEN_USD } from './generate-embeddings.js';
import { PipelineError } from '../../lib/errors.js';

describe('Generate Embeddings Pipeline Stage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateUnitEmbeddings', () => {
    const createMockSupabase = () => {
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      const mockSelectIs = vi.fn().mockResolvedValue({
        data: [
          { id: 'chunk-1', chunk_text: 'Salesforce Apex is a programming language...' },
          { id: 'chunk-2', chunk_text: 'SOQL queries allow you to retrieve data...' },
        ],
        error: null,
      });

      const mockSelectEq = vi.fn().mockReturnValue({ is: mockSelectIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      return {
        from: mockFrom,
        mockSelectEq,
        mockSelectIs,
        mockUpdate,
        mockUpdateEq,
      };
    };

    it('fetches chunks for unit_id from sf_knowledge_chunks with embedding IS NULL', async () => {
      const mockSupabase = createMockSupabase();

      await generateUnitEmbeddings(
        { unit_id: 'unit-123', module_id: 'module-456', run_id: 'run-789' },
        mockSupabase as any,
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('sf_knowledge_chunks');
      expect(mockSupabase.mockSelectEq).toHaveBeenCalledWith('unit_id', 'unit-123');
      expect(mockSupabase.mockSelectIs).toHaveBeenCalledWith('embedding', null);
    });

    it('calls embedMany() with model text-embedding-3-small, maxRetries: 3, and maxParallelCalls: 5', async () => {
      const mockSupabase = createMockSupabase();

      await generateUnitEmbeddings(
        { unit_id: 'unit-123', module_id: 'module-456', run_id: 'run-789' },
        mockSupabase as any,
      );

      expect(mockOpenAi.embedding).toHaveBeenCalledWith('text-embedding-3-small');
      expect(mockEmbedMany).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(Object),
          values: ['Salesforce Apex is a programming language...', 'SOQL queries allow you to retrieve data...'],
          maxRetries: 3,
          maxParallelCalls: 5,
        }),
      );
    });

    it('updates each chunk with its embedding vector', async () => {
      const mockSupabase = createMockSupabase();

      await generateUnitEmbeddings(
        { unit_id: 'unit-123', module_id: 'module-456', run_id: 'run-789' },
        mockSupabase as any,
      );

      expect(mockSupabase.mockUpdate).toHaveBeenCalledTimes(2);
      expect(mockSupabase.mockUpdate).toHaveBeenCalledWith({
        embedding: JSON.stringify(new Array(1536).fill(0.1)),
      });
      expect(mockSupabase.mockUpdate).toHaveBeenCalledWith({
        embedding: JSON.stringify(new Array(1536).fill(0.2)),
      });
      expect(mockSupabase.mockUpdateEq).toHaveBeenCalledWith('id', 'chunk-1');
      expect(mockSupabase.mockUpdateEq).toHaveBeenCalledWith('id', 'chunk-2');
    });

    it('logs ToolTrace with agent_type knowledge and tool_type embedding', async () => {
      const mockSupabase = createMockSupabase();

      await generateUnitEmbeddings(
        { unit_id: 'unit-123', module_id: 'module-456', run_id: 'run-789' },
        mockSupabase as any,
      );

      expect(mockLogToolTrace).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          agent_type: 'knowledge',
          tool_type: 'embedding',
          run_id: 'run-789',
        }),
      );
    });

    it('logs token usage from embedMany response', async () => {
      const mockSupabase = createMockSupabase();

      await generateUnitEmbeddings(
        { unit_id: 'unit-123', module_id: 'module-456', run_id: 'run-789' },
        mockSupabase as any,
      );

      expect(mockLogToolTrace).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          input_tokens: 250,
        }),
      );
    });

    it('returns early with log entry if no chunks found for unit_id', async () => {
      const mockSelectIs = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockSelectEq = vi.fn().mockReturnValue({ is: mockSelectIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          update: vi.fn(),
        }),
      };

      await generateUnitEmbeddings(
        { unit_id: 'unit-empty', module_id: 'module-456', run_id: 'run-789' },
        mockSupabase as any,
      );

      expect(mockEmbedMany).not.toHaveBeenCalled();
      expect(mockLogToolTrace).toHaveBeenCalled();
    });

    it('throws PipelineError if Supabase select fails', async () => {
      const mockSelectIs = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });
      const mockSelectEq = vi.fn().mockReturnValue({ is: mockSelectIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      await expect(
        generateUnitEmbeddings(
          { unit_id: 'unit-123', module_id: 'module-456', run_id: 'run-789' },
          mockSupabase as any,
        ),
      ).rejects.toThrow(PipelineError);
    });

    it('throws PipelineError if embedding update fails', async () => {
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: { message: 'Update failed' },
      });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      const mockSelectIs = vi.fn().mockResolvedValue({
        data: [{ id: 'chunk-1', chunk_text: 'Text 1' }],
        error: null,
      });
      const mockSelectEq = vi.fn().mockReturnValue({ is: mockSelectIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          update: mockUpdate,
        }),
      };

      await expect(
        generateUnitEmbeddings(
          { unit_id: 'unit-123', module_id: 'module-456', run_id: 'run-789' },
          mockSupabase as any,
        ),
      ).rejects.toThrow(PipelineError);
    });

    it('includes chunk count in logged summary', async () => {
      const mockSupabase = createMockSupabase();

      await generateUnitEmbeddings(
        { unit_id: 'unit-123', module_id: 'module-456', run_id: 'run-789' },
        mockSupabase as any,
      );

      expect(mockLogToolTrace).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          summary: expect.stringContaining('2 embeddings'),
        }),
      );
    });

    it('calculates estimated cost based on token usage', async () => {
      const mockSupabase = createMockSupabase();

      await generateUnitEmbeddings(
        { unit_id: 'unit-123', module_id: 'module-456', run_id: 'run-789' },
        mockSupabase as any,
      );

      const expectedCost = 250 * EMBEDDING_COST_PER_TOKEN_USD;
      expect(mockLogToolTrace).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          estimated_cost_usd: expect.closeTo(expectedCost, 10),
        }),
      );
    });
  });
});
