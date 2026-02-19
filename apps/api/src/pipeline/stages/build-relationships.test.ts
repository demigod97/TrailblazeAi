import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildUnitRelationships } from './build-relationships.js';
import { PipelineError } from '../../lib/errors.js';

// ESM mock hoisting — must be at top
const { mockGenerateObject } = vi.hoisted(() => {
  const mockGenerateObject = vi.fn().mockResolvedValue({
    object: {
      relationships: [
        { source_concept: 'Apex Triggers', target_concept: 'Apex Classes', relationship_type: 'prerequisite', strength: 0.9 },
        { source_concept: 'SOQL', target_concept: 'Data Management', relationship_type: 'related_to', strength: 0.8 },
        { source_concept: 'Account Fields', target_concept: 'Account', relationship_type: 'part_of', strength: 0.95 },
      ],
    },
  });
  return { mockGenerateObject };
});
vi.mock('ai', () => ({ generateObject: mockGenerateObject }));

const { mockAnthropic } = vi.hoisted(() => {
  const mockAnthropic = vi.fn().mockReturnValue({ id: 'claude-haiku-4-5-20251001' });
  return { mockAnthropic };
});
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: mockAnthropic }));

const { mockLogToolTrace } = vi.hoisted(() => {
  const mockLogToolTrace = vi.fn().mockResolvedValue(undefined);
  return { mockLogToolTrace };
});
vi.mock('../../lib/agent-logger.js', () => ({ logToolTrace: mockLogToolTrace }));

const { mockLoadKnowledgePrompts, mockResetPromptCache } = vi.hoisted(() => {
  const mockLoadKnowledgePrompts = vi.fn().mockResolvedValue({
    system: 'You are a Salesforce knowledge expert.',
    identify_concepts: 'Identify concepts in: {{content}}',
    classify_chunk: 'Classify: {{chunk}}',
    build_relationships: 'Analyze concepts.\n\nCurrent unit concepts:\n{{current_concepts}}\n\nOther concepts from this module:\n{{other_concepts}}',
  });
  const mockResetPromptCache = vi.fn();
  return { mockLoadKnowledgePrompts, mockResetPromptCache };
});
vi.mock('../../agents/knowledge-agent.js', () => ({
  loadKnowledgePrompts: mockLoadKnowledgePrompts,
  _resetPromptCache: mockResetPromptCache,
  conceptExtractionSchema: {
    safeParse: vi.fn().mockImplementation((data: unknown) => {
      if (data && typeof data === 'object' && 'sf_topics' in data) {
        return { success: true, data };
      }
      return { success: false };
    }),
  },
}));

// Shared mock data
const mockSfConcepts = {
  sf_topics: ['Apex Triggers', 'Apex Classes', 'SOQL', 'Account', 'Data Management', 'Account Fields'],
  sf_objects: ['Account'],
  sf_api_names: ['Account.Name'],
  apex_keywords: ['trigger', 'class'],
  flow_references: [],
  difficulty: 'intermediate',
  content_types: ['explanation', 'code'],
};

const mockUnitData = [
  {
    id: 'unit-1',
    sf_concepts: mockSfConcepts,
    title: 'Understanding Apex Triggers',
  },
];

const mockAllUnitsData = [
  {
    id: 'unit-1',
    sf_concepts: mockSfConcepts,
    title: 'Understanding Apex Triggers',
  },
  {
    id: 'unit-2',
    sf_concepts: {
      sf_topics: ['SOQL Queries', 'SOSL', 'Data Management'],
      sf_objects: [],
      sf_api_names: [],
      apex_keywords: ['query'],
      flow_references: [],
      difficulty: 'beginner',
      content_types: ['explanation'],
    },
    title: 'SOQL and SOSL',
  },
];

// Build the mock supabase client
function buildMockSupabase({
  unitSelectData = mockUnitData,
  unitSelectError = null,
  allUnitsData = mockAllUnitsData,
  allUnitsError = null,
  insertError = null,
  existingRelationships = [] as unknown[],
  chunkData = [{ id: 'chunk-1' }] as unknown[],
}: {
  unitSelectData?: unknown[];
  unitSelectError?: { message: string } | null;
  allUnitsData?: unknown[];
  allUnitsError?: { message: string } | null;
  insertError?: { message: string } | null;
  existingRelationships?: unknown[];
  chunkData?: unknown[];
} = {}) {
  // Track how many times 'units' is queried (first: current unit by unit_id, second: all units by module_id)
  let unitsQueryCount = 0;

  const mockInsert = vi.fn().mockResolvedValue({ error: insertError });

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'units') {
      return {
        select: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => {
            unitsQueryCount++;
            if (unitsQueryCount === 1) {
              // First query: fetch current unit by unit_id
              return Promise.resolve({ data: unitSelectData, error: unitSelectError });
            } else {
              // Second query: fetch all units by module_id
              return Promise.resolve({ data: allUnitsData, error: allUnitsError });
            }
          }),
        })),
      };
    }
    if (table === 'sf_concept_relationships') {
      return {
        select: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockResolvedValue({ data: existingRelationships, error: null }),
        })),
        insert: mockInsert,
      };
    }
    if (table === 'sf_knowledge_chunks') {
      return {
        select: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockResolvedValue({ data: chunkData, error: null }),
        })),
      };
    }
    return { select: vi.fn(), insert: mockInsert };
  });

  return { from: mockFrom, _mockInsert: mockInsert };
}

describe('buildUnitRelationships', () => {
  const input = {
    unit_id: 'unit-1',
    module_id: 'module-1',
    run_id: 'run-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockResetPromptCache();
    // Reset generateObject to default (returns 3 relationships)
    mockGenerateObject.mockResolvedValue({
      object: {
        relationships: [
          { source_concept: 'Apex Triggers', target_concept: 'Apex Classes', relationship_type: 'prerequisite', strength: 0.9 },
          { source_concept: 'SOQL', target_concept: 'Data Management', relationship_type: 'related_to', strength: 0.8 },
          { source_concept: 'Account Fields', target_concept: 'Account', relationship_type: 'part_of', strength: 0.95 },
        ],
      },
    });
  });

  it('fetches the current unit sf_concepts by unit_id', async () => {
    const { from } = buildMockSupabase();
    await buildUnitRelationships(input, { from } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>);

    // First call to from('units')
    expect(from).toHaveBeenCalledWith('units');
  });

  it('fetches all units in module for cross-unit concept context', async () => {
    const { from } = buildMockSupabase();
    await buildUnitRelationships(input, { from } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>);

    // 'units' should be queried twice (once for current unit, once for all module units)
    const unitsCalls = (from as ReturnType<typeof vi.fn>).mock.calls.filter((call: unknown[]) => call[0] === 'units');
    expect(unitsCalls.length).toBe(2);
  });

  it('calls generateObject with claude-haiku-4-5-20251001 model and conceptRelationshipSchema', async () => {
    const { from } = buildMockSupabase();
    await buildUnitRelationships(input, { from } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>);

    expect(mockGenerateObject).toHaveBeenCalledOnce();
    const call = mockGenerateObject.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(mockAnthropic).toHaveBeenCalledWith('claude-haiku-4-5-20251001');
    expect(call).toHaveProperty('schema');
    expect(call).toHaveProperty('prompt');
    expect(call).toHaveProperty('maxRetries', 1);
  });

  it('stores relationships in sf_concept_relationships with correct columns', async () => {
    const { from, _mockInsert } = buildMockSupabase();
    await buildUnitRelationships(input, { from } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>);

    expect(_mockInsert).toHaveBeenCalledOnce();
    const insertArg = (_mockInsert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as unknown[];
    expect(Array.isArray(insertArg)).toBe(true);
    // Check first relationship has all required columns
    const firstRel = insertArg[0] as Record<string, unknown>;
    expect(firstRel).toHaveProperty('source_concept');
    expect(firstRel).toHaveProperty('target_concept');
    expect(firstRel).toHaveProperty('relationship_type');
    expect(firstRel).toHaveProperty('strength');
    expect(firstRel).toHaveProperty('module_id', input.module_id);
  });

  it('logs a ToolTrace entry with agent_type knowledge and tool_type llm_call', async () => {
    const { from } = buildMockSupabase();
    await buildUnitRelationships(input, { from } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>);

    expect(mockLogToolTrace).toHaveBeenCalledOnce();
    const traceArg = (mockLogToolTrace as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(traceArg).toHaveProperty('agent_type', 'knowledge');
    expect(traceArg).toHaveProperty('tool_type', 'llm_call');
  });

  it('returns early with a log entry if unit has no valid sf_concepts', async () => {
    const { from } = buildMockSupabase({
      unitSelectData: [{ id: 'unit-1', sf_concepts: null, title: 'Empty Unit' }],
    });
    await buildUnitRelationships(input, { from } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>);

    // generateObject should NOT be called
    expect(mockGenerateObject).not.toHaveBeenCalled();
    // But logToolTrace should be called with early-exit summary
    expect(mockLogToolTrace).toHaveBeenCalledOnce();
  });

  it('throws PipelineError if the Supabase select for unit fails', async () => {
    const { from } = buildMockSupabase({
      unitSelectError: { message: 'DB connection failed' },
    });
    await expect(
      buildUnitRelationships(input, { from } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>),
    ).rejects.toThrow(PipelineError);
  });

  it('handles empty relationships response gracefully without calling insert', async () => {
    mockGenerateObject.mockResolvedValue({ object: { relationships: [] } });
    const { from, _mockInsert } = buildMockSupabase();
    await buildUnitRelationships(input, { from } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>);

    // insert should NOT be called when no relationships
    expect(_mockInsert).not.toHaveBeenCalled();
  });

  it('deduplicates relationships — skips source→target that already exists for this module', async () => {
    const { from, _mockInsert } = buildMockSupabase({
      existingRelationships: [
        { source_concept: 'Apex Triggers', target_concept: 'Apex Classes', relationship_type: 'prerequisite' },
      ],
    });
    await buildUnitRelationships(input, { from } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>);

    // Only 2 of the 3 relationships are new (1 is a duplicate)
    const insertArg = (_mockInsert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as unknown[];
    expect(insertArg.length).toBe(2);
  });

  it('filters out self-relationships (source_concept === target_concept)', async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        relationships: [
          { source_concept: 'Apex', target_concept: 'Apex', relationship_type: 'related_to', strength: 0.5 }, // self
          { source_concept: 'SOQL', target_concept: 'Data Management', relationship_type: 'related_to', strength: 0.8 },
        ],
      },
    });
    const { from, _mockInsert } = buildMockSupabase();
    await buildUnitRelationships(input, { from } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>);

    const insertArg = (_mockInsert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as unknown[];
    expect(insertArg.length).toBe(1); // Only the non-self relationship
  });
});
