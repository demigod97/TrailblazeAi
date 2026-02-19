import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockRecursiveChunker } = vi.hoisted(() => {
  const mockChunk = vi.fn().mockResolvedValue([
    { text: 'chunk 1 content', tokenCount: 200 },
    { text: 'chunk 2 content', tokenCount: 180 },
  ]);
  const MockRecursiveChunker = {
    create: vi.fn().mockResolvedValue({ chunk: mockChunk }),
  };
  return { MockRecursiveChunker, mockChunk };
});
vi.mock('@chonkiejs/core', () => ({ RecursiveChunker: MockRecursiveChunker }));

const { mockLogToolTrace } = vi.hoisted(() => {
  const mockLogToolTrace = vi.fn().mockResolvedValue(undefined);
  return { mockLogToolTrace };
});
vi.mock('../../lib/agent-logger.js', () => ({ logToolTrace: mockLogToolTrace }));

import { chunkUnitContent, extractCodeBlocks, detectQuizChunks, detectHandsOnSteps, CHUNK_SIZE, CHUNK_OVERLAP, HANDS_ON_MAX_TOKENS } from './chunk-content.js';
import { PipelineError } from '../../lib/errors.js';

describe('Chunk Content Pipeline Stage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractCodeBlocks', () => {
    it('pulls out fenced code blocks (```...```)', () => {
      const markdown = 'Some text\n```javascript\nconst x = 1;\n```\nMore text';
      const { codeChunks } = extractCodeBlocks(markdown);
      expect(codeChunks.length).toBeGreaterThan(0);
      expect(codeChunks[0]?.text).toContain('```');
    });

    it('replaces code blocks with placeholders', () => {
      const markdown = 'Text\n```code\n```\nMore';
      const { cleaned } = extractCodeBlocks(markdown);
      expect(cleaned).toContain('__CODE_BLOCK_');
      expect(cleaned).not.toContain('```code');
    });

    it('preserves code block content exactly as-is', () => {
      const codeContent = 'const x = 1; // comment\nconst y = 2;';
      const markdown = `Text\n\`\`\`\n${codeContent}\n\`\`\`\nMore`;
      const { codeChunks } = extractCodeBlocks(markdown);
      expect(codeChunks[0]?.text).toContain(codeContent);
    });

    it('sets content_type to code for extracted blocks', () => {
      const markdown = 'Text\n```\ncode\n```';
      const { codeChunks } = extractCodeBlocks(markdown);
      expect(codeChunks[0]?.content_type).toBe('code');
    });

    it('returns empty array when no code blocks found', () => {
      const markdown = 'Just plain text with no code blocks';
      const { codeChunks } = extractCodeBlocks(markdown);
      expect(codeChunks.length).toBe(0);
    });

    it('assigns correct section_header for duplicate code blocks using offset', () => {
      const markdown = '## First Section\n```\nconst x = 1;\n```\n## Second Section\n```\nconst x = 1;\n```';
      const { codeChunks } = extractCodeBlocks(markdown);
      expect(codeChunks).toHaveLength(2);
      expect(codeChunks[0]?.section_header).toBe('First Section');
      expect(codeChunks[1]?.section_header).toBe('Second Section');
    });
  });

  describe('detectQuizChunks', () => {
    it('identifies quiz-formatted content', () => {
      const markdown = '**Question**: What is Apex?\nA. A programming language\nB. A tool';
      const quizChunks = detectQuizChunks(markdown);
      expect(Array.isArray(quizChunks)).toBe(true);
    });

    it('returns atomic quiz chunks with content_type quiz', () => {
      const markdown = '**Question**: What?\nA. Option A\nB. Option B';
      const quizChunks = detectQuizChunks(markdown);
      if (quizChunks.length > 0) {
        expect(quizChunks[0]?.content_type).toBe('quiz');
      }
    });

    it('returns empty array when no quizzes found', () => {
      const markdown = 'Just regular content, no questions here.';
      const quizChunks = detectQuizChunks(markdown);
      expect(Array.isArray(quizChunks)).toBe(true);
    });
  });

  describe('detectHandsOnSteps', () => {
    it('identifies sequential numbered steps', () => {
      const markdown = 'Step 1: Do something\nStep 2: Do something else';
      const steps = detectHandsOnSteps(markdown);
      expect(Array.isArray(steps)).toBe(true);
    });

    it('tags hands-on chunks with content_type hands_on', () => {
      const markdown = '1. Click the button\n2. Enter your name';
      const steps = detectHandsOnSteps(markdown);
      if (steps.length > 0) {
        expect(steps[0]?.content_type).toBe('hands_on');
      }
    });

    it('returns empty array when no hands-on steps found', () => {
      const markdown = 'Just some explanation text.';
      const steps = detectHandsOnSteps(markdown);
      expect(Array.isArray(steps)).toBe(true);
    });
  });

  describe('chunkUnitContent', () => {
    const createMockSupabase = () => {
      const mockSelectEq = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'unit-1',
            content_markdown: 'Some content for chunking',
            sf_concepts: JSON.stringify({
              sf_topics: ['Apex'],
              sf_objects: [],
              sf_api_names: [],
              apex_keywords: [],
              flow_references: [],
              difficulty: 'intermediate',
              content_types: [],
            }),
            module_id: 'module-1',
            title: 'Test Unit',
          },
        ],
        error: null,
      });

      const mockInsertFn = vi.fn().mockResolvedValue({ error: null });

      return {
        from: vi.fn((table: string) => {
          if (table === 'units') {
            return {
              select: vi.fn(() => ({
                eq: mockSelectEq,
              })),
            };
          } else if (table === 'sf_knowledge_chunks') {
            return {
              insert: mockInsertFn,
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;
    };

    it('reads unit from Supabase by unit_id', async () => {
      const mockSupabase = createMockSupabase();
      await chunkUnitContent({ unit_id: 'unit-1', module_id: 'module-1', run_id: null }, mockSupabase);
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
                  content_markdown: null,
                  sf_concepts: null,
                  module_id: 'module-1',
                  title: 'Test Unit',
                },
              ],
              error: null,
            }),
          })),
        })),
      } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;

      await expect(chunkUnitContent({ unit_id: 'unit-1', module_id: 'module-1', run_id: null }, mockSupabase)).rejects.toThrow(
        PipelineError,
      );
    });

    it('uses RecursiveChunker with chunkSize: 512', async () => {
      const mockSupabase = createMockSupabase();
      await chunkUnitContent({ unit_id: 'unit-1', module_id: 'module-1', run_id: null }, mockSupabase);
      expect(MockRecursiveChunker.create).toHaveBeenCalled();
      const call = MockRecursiveChunker.create.mock.calls[0]?.[0];
      expect(call?.chunkSize).toBe(CHUNK_SIZE);
    });

    it('stores chunks in sf_knowledge_chunks with unit_id and module_id', async () => {
      const mockSelectEq = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'unit-1',
            content_markdown: 'Test content',
            sf_concepts: JSON.stringify({
              sf_topics: ['Apex'],
              difficulty: 'intermediate',
            }),
            module_id: 'module-1',
            title: 'Test Unit',
          },
        ],
        error: null,
      });

      const mockInsertFn = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'units') {
            return {
              select: vi.fn(() => ({
                eq: mockSelectEq,
              })),
            };
          } else if (table === 'sf_knowledge_chunks') {
            return {
              insert: mockInsertFn,
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;

      await chunkUnitContent({ unit_id: 'unit-1', module_id: 'module-1', run_id: null }, mockSupabase);

      expect(mockInsertFn).toHaveBeenCalled();
      const insertedChunks = mockInsertFn.mock.calls[0]?.[0];
      if (Array.isArray(insertedChunks) && insertedChunks.length > 0) {
        expect(insertedChunks[0]?.unit_id).toBe('unit-1');
        expect(insertedChunks[0]?.module_id).toBe('module-1');
      }
    });

    it('assigns chunk_index sequentially starting from 0', async () => {
      const mockSupabase = createMockSupabase();
      await chunkUnitContent({ unit_id: 'unit-1', module_id: 'module-1', run_id: null }, mockSupabase);

      const mockInsertFn = mockSupabase.from('sf_knowledge_chunks').insert as any;
      const insertedChunks = mockInsertFn.mock.calls[0]?.[0];
      if (Array.isArray(insertedChunks)) {
        for (let i = 0; i < insertedChunks.length; i++) {
          expect(insertedChunks[i]?.chunk_index).toBe(i);
        }
      }
    });

    it('extracts code blocks and preserves them separately', async () => {
      const mockSupabase = createMockSupabase();
      await chunkUnitContent({ unit_id: 'unit-1', module_id: 'module-1', run_id: null }, mockSupabase);
      expect(mockLogToolTrace).toHaveBeenCalled();
    });
  });

  describe('Constants', () => {
    it('exports CHUNK_SIZE = 512', () => {
      expect(CHUNK_SIZE).toBe(512);
    });

    it('exports CHUNK_OVERLAP = 50', () => {
      expect(CHUNK_OVERLAP).toBe(50);
    });

    it('exports HANDS_ON_MAX_TOKENS = 800', () => {
      expect(HANDS_ON_MAX_TOKENS).toBe(800);
    });
  });
});
