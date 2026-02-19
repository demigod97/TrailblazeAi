import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock setup (vi.hoisted required for ESM factory closures) ---

const { mockGenerateObject } = vi.hoisted(() => ({
  mockGenerateObject: vi.fn(),
}));
const { mockEmbed } = vi.hoisted(() => ({
  mockEmbed: vi.fn().mockResolvedValue({ embedding: new Array(1536).fill(0.1) }),
}));
vi.mock('ai', () => ({
  generateObject: mockGenerateObject,
  embed: mockEmbed,
}));

const { mockAnthropicFn } = vi.hoisted(() => ({
  mockAnthropicFn: vi.fn().mockReturnValue('mock-anthropic-model'),
}));
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: mockAnthropicFn }));

const { mockOpenaiEmbeddingFn } = vi.hoisted(() => ({
  mockOpenaiEmbeddingFn: vi.fn().mockReturnValue('mock-embedding-model'),
}));
vi.mock('@ai-sdk/openai', () => ({
  openai: { embedding: mockOpenaiEmbeddingFn },
}));

vi.mock('@trailblaze/db', () => ({
  createClient: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(
    "system: 'You are a Salesforce expert.'\nanswer_question: 'Question: {question} Options: {options} Context: {context} {retry_instruction}'\n",
  ),
}));

// --- Import after mocks ---
import { loadQuizPrompts, _resetPromptCache, answerQuizQuestion, answerModuleQuiz } from './quiz-agent.js';
import type { createClient } from '@trailblaze/db';

// --- Test data ---

const mockQuizItem = {
  id: 'quiz-item-1',
  unit_id: 'unit-1',
  question_text: 'What does an Apex trigger do?',
  question_type: 'multiple_choice' as const,
  options: ['A. Runs before or after DML events', 'B. Creates a workflow rule', 'C. Sends an email', 'D. Generates a report'],
  correct_answer: 'A. Runs before or after DML events',
  explanation: null,
  related_chunk_ids: [],
  display_order: 1,
  created_at: '2026-02-20T00:00:00Z',
};

const mockChunkRow = {
  id: 'chunk-1',
  chunk_text: 'Apex triggers fire before or after DML events on specific Salesforce objects.',
  content_type: 'explanation',
  relevance_score: 0.92,
};

const mockAnswerObject = {
  reasoning: 'The question asks about Apex triggers. Context states they fire before or after DML events. Option A matches this exactly.',
  selected_answer: 'A. Runs before or after DML events',
  confidence: 0.95,
};

function makeSupabaseMock(
  rpcData: Array<Record<string, unknown>> | null = [mockChunkRow],
  rpcError: { message: string } | null = null,
  quizItemsData: Array<Record<string, unknown>> | null = [mockQuizItem],
  quizItemsError: { message: string } | null = null,
  moduleData: Array<Record<string, unknown>> | null = [{ id: 'mod-1', status: 'ready' }],
  insertError: { message: string } | null = null,
): ReturnType<typeof createClient> {
  const mockRpc = vi.fn().mockResolvedValue({ data: rpcData, error: rpcError });
  const mockInResult = { data: quizItemsData, error: quizItemsError };
  const mockInsertResult = { error: insertError };
  const mockUpdateResult = { error: null };
  const mockSelectEq = vi.fn().mockResolvedValue({ data: moduleData, error: null });

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'quiz_results') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockResolvedValue(mockInsertResult),
      };
    }
    if (table === 'modules') {
      return {
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(mockUpdateResult) }),
        select: vi.fn().mockReturnValue({ eq: mockSelectEq }),
      };
    }
    if (table === 'units') {
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'unit-1', module_id: 'mod-1' }], error: null }) }),
      };
    }
    if (table === 'quiz_items') {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue(mockInResult),
        }),
      };
    }
    return {};
  });

  return { rpc: mockRpc, from: mockFrom } as unknown as ReturnType<typeof createClient>;
}

describe('loadQuizPrompts', () => {
  beforeEach(() => {
    _resetPromptCache();
    vi.clearAllMocks();
  });

  it('returns prompts with system and answer_question keys', async () => {
    const prompts = await loadQuizPrompts();
    expect(prompts.system).toBeTruthy();
    expect(prompts.answer_question).toBeTruthy();
  });

  it('returns cached prompts on second call (no second readFile)', async () => {
    const { readFile } = await import('fs/promises');
    await loadQuizPrompts();
    await loadQuizPrompts();
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  it('throws PipelineError if system key missing from YAML', async () => {
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValueOnce('answer_question: "test"');
    await expect(loadQuizPrompts()).rejects.toThrow();
  });
});

describe('answerQuizQuestion', () => {
  beforeEach(() => {
    _resetPromptCache();
    vi.clearAllMocks();
    mockGenerateObject.mockResolvedValue({ object: mockAnswerObject });
  });

  it('calls knowledge_search RPC with question text and embedding', async () => {
    const supabase = makeSupabaseMock();
    await answerQuizQuestion(mockQuizItem, supabase);
    expect(mockEmbed).toHaveBeenCalledWith(
      expect.objectContaining({ value: mockQuizItem.question_text }),
    );
    expect((supabase as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc).toHaveBeenCalledWith(
      'knowledge_search',
      expect.objectContaining({ query_text: mockQuizItem.question_text }),
    );
  });

  it('returns structured answer with reasoning, selected_answer, and confidence', async () => {
    const supabase = makeSupabaseMock();
    const result = await answerQuizQuestion(mockQuizItem, supabase);
    expect(result.reasoning).toBeTruthy();
    expect(result.selected_answer).toBe('A. Runs before or after DML events');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('retries with broader scope when confidence is below threshold', async () => {
    const lowConfidenceAnswer = { ...mockAnswerObject, confidence: 0.5 };
    const highConfidenceAnswer = { ...mockAnswerObject, confidence: 0.85 };
    mockGenerateObject
      .mockResolvedValueOnce({ object: lowConfidenceAnswer })
      .mockResolvedValueOnce({ object: highConfidenceAnswer });

    const supabase = makeSupabaseMock();
    const result = await answerQuizQuestion(mockQuizItem, supabase, 0.7);

    // Should have called generateObject twice (initial + retry)
    expect(mockGenerateObject).toHaveBeenCalledTimes(2);
    // Final result should be the higher-confidence answer
    expect(result.confidence).toBe(0.85);
  });

  it('keeps original answer if retry has lower confidence', async () => {
    const firstAnswer = { ...mockAnswerObject, confidence: 0.6 };
    const worseRetry = { ...mockAnswerObject, confidence: 0.4 };
    mockGenerateObject
      .mockResolvedValueOnce({ object: firstAnswer })
      .mockResolvedValueOnce({ object: worseRetry });

    const supabase = makeSupabaseMock();
    const result = await answerQuizQuestion(mockQuizItem, supabase, 0.7);

    // Should have retried but kept the 0.6 answer since retry was 0.4
    expect(result.confidence).toBe(0.6);
  });

  it('throws PipelineError when knowledge_search RPC fails', async () => {
    const supabase = makeSupabaseMock(null, { message: 'RPC error' });
    await expect(answerQuizQuestion(mockQuizItem, supabase)).rejects.toThrow('RPC error');
  });
});

describe('answerModuleQuiz', () => {
  beforeEach(() => {
    _resetPromptCache();
    vi.clearAllMocks();
    mockGenerateObject.mockResolvedValue({ object: mockAnswerObject });
  });

  it('transitions module status to "quizzing" at start', async () => {
    const supabase = makeSupabaseMock();
    await answerModuleQuiz({ module_id: 'mod-1', run_id: null }, supabase);
    const fromModule = vi.mocked(supabase.from).mock.calls.find(([t]) => t === 'modules');
    expect(fromModule).toBeTruthy();
  });

  it('stores quiz results for each quiz item', async () => {
    const supabase = makeSupabaseMock();
    await answerModuleQuiz({ module_id: 'mod-1', run_id: null }, supabase);
    // Should have called from('quiz_results') for insert
    const quizResultInsert = vi.mocked(supabase.from).mock.calls.find(([t]) => t === 'quiz_results');
    expect(quizResultInsert).toBeTruthy();
  });

  it('handles empty quiz_items list gracefully (no error, no inserts)', async () => {
    const supabase = makeSupabaseMock([mockChunkRow], null, [], null);
    await expect(answerModuleQuiz({ module_id: 'mod-1', run_id: null }, supabase)).resolves.toBeUndefined();
  });

  it('throws PipelineError when quiz_items query fails', async () => {
    const supabase = makeSupabaseMock([mockChunkRow], null, null, { message: 'DB error' });
    await expect(answerModuleQuiz({ module_id: 'mod-1', run_id: null }, supabase)).rejects.toThrow();
  });
});
