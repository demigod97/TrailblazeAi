import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockIdentifyConcepts } = vi.hoisted(() => {
  const mockIdentifyConcepts = vi.fn().mockResolvedValue({
    sf_topics: ['Apex', 'SOQL'],
    sf_objects: ['Account', 'Contact'],
    sf_api_names: ['Account.Name'],
    apex_keywords: ['trigger', 'batch'],
    flow_references: [],
    difficulty: 'intermediate',
    content_types: ['explanation', 'code'],
  });
  return { mockIdentifyConcepts };
});
vi.mock('../../agents/knowledge-agent.js', () => ({ identifyConcepts: mockIdentifyConcepts }));

const { mockLogToolTrace } = vi.hoisted(() => {
  const mockLogToolTrace = vi.fn().mockResolvedValue(undefined);
  return { mockLogToolTrace };
});
vi.mock('../../lib/agent-logger.js', () => ({ logToolTrace: mockLogToolTrace }));

import { identifyUnitConcepts } from './identify-concepts.js';
import { PipelineError } from '../../lib/errors.js';

describe('Identify Concepts Pipeline Stage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockSupabase = () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockSelectEq = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'unit-1',
          title: 'Test Unit',
          content_markdown: 'Some markdown content about Apex and SOQL',
        },
      ],
      error: null,
    });

    return {
      from: vi.fn((table: string) => {
        if (table === 'units') {
          return {
            select: vi.fn(() => ({
              eq: mockSelectEq,
            })),
            update: vi.fn(() => ({
              eq: mockUpdateEq,
            })),
          };
        }
        return {};
      }),
    } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;
  };

  it('reads unit from Supabase by unit_id', async () => {
    const mockSupabase = createMockSupabase();
    await identifyUnitConcepts({ unit_id: 'unit-1', run_id: null }, mockSupabase);
    expect(mockSupabase.from).toHaveBeenCalledWith('units');
  });

  it('throws PipelineError if unit has no content_markdown', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'unit-1',
                title: 'Test Unit',
                content_markdown: null,
              },
            ],
            error: null,
          }),
        })),
      })),
    } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;

    await expect(identifyUnitConcepts({ unit_id: 'unit-1', run_id: null }, mockSupabase)).rejects.toThrow(
      PipelineError,
    );
  });

  it('throws PipelineError if unit not found', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      })),
    } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;

    await expect(identifyUnitConcepts({ unit_id: 'unit-1', run_id: null }, mockSupabase)).rejects.toThrow(
      PipelineError,
    );
  });

  it('calls identifyConcepts with the unit content_markdown', async () => {
    const mockSupabase = createMockSupabase();
    await identifyUnitConcepts({ unit_id: 'unit-1', run_id: null }, mockSupabase);
    expect(mockIdentifyConcepts).toHaveBeenCalledWith('Some markdown content about Apex and SOQL');
  });

  it('stores the result in units.sf_concepts column as JSONB', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockSelectEq = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'unit-1',
          title: 'Test Unit',
          content_markdown: 'Sample content',
        },
      ],
      error: null,
    });

    const mockUpdateFn = vi.fn(() => ({
      eq: mockUpdateEq,
    }));

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'units') {
          return {
            select: vi.fn(() => ({
              eq: mockSelectEq,
            })),
            update: mockUpdateFn,
          };
        }
        return {};
      }),
    } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;

    await identifyUnitConcepts({ unit_id: 'unit-1', run_id: null }, mockSupabase);

    expect(mockUpdateFn).toHaveBeenCalled();
    const updateCalls = mockUpdateFn.mock.calls as unknown[][];
    expect(updateCalls.length).toBeGreaterThan(0);
    if (Array.isArray(updateCalls[0]) && updateCalls[0].length > 0) {
      const updateCall = updateCalls[0][0] as Record<string, unknown>;
      expect(updateCall.sf_concepts).toBeDefined();
      expect(typeof updateCall.sf_concepts).toBe('string');
    }
  });

  it('logs a ToolTrace entry with agent_type knowledge and tool_type llm_call', async () => {
    const mockSupabase = createMockSupabase();
    await identifyUnitConcepts({ unit_id: 'unit-1', run_id: 'run-123', }, mockSupabase);
    expect(mockLogToolTrace).toHaveBeenCalled();
    const call = mockLogToolTrace.mock.calls[0]?.[1];
    expect(call?.agent_type).toBe('knowledge');
    expect(call?.tool_type).toBe('llm_call');
  });

  it('includes query and summary in ToolTrace', async () => {
    const mockSupabase = createMockSupabase();
    await identifyUnitConcepts({ unit_id: 'unit-1', run_id: null }, mockSupabase);
    const call = mockLogToolTrace.mock.calls[0]?.[1];
    expect(call?.query).toBeDefined();
    expect(call?.query).toContain('identify-concepts');
    expect(call?.summary).toBeDefined();
  });
});
