import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGenerateObject } = vi.hoisted(() => {
  const mockGenerateObject = vi.fn().mockResolvedValue({
    object: {
      sf_topics: ['Apex', 'SOQL'],
      sf_objects: ['Account', 'Contact'],
      sf_api_names: ['Account.Name'],
      apex_keywords: ['trigger', 'batch'],
      flow_references: [],
      difficulty: 'intermediate',
      content_types: ['explanation', 'code'],
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

const { mockReadFile } = vi.hoisted(() => {
  const mockReadFile = vi.fn().mockResolvedValue(`system: "You are a knowledge specialist"
identify_concepts: "Analyze: {{content}}"
classify_chunk: "Classify: {{chunk}}"`);
  return { mockReadFile };
});
vi.mock('fs/promises', () => ({ readFile: mockReadFile }));

import { loadKnowledgePrompts, identifyConcepts, classifyChunk, conceptExtractionSchema, _resetPromptCache } from './knowledge-agent.js';
import { PipelineError } from '../lib/errors.js';

describe('Knowledge Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetPromptCache();
  });

  describe('loadKnowledgePrompts', () => {
    it('loads and parses knowledge prompts from YAML', async () => {
      const prompts = await loadKnowledgePrompts();
      expect(prompts).toEqual({
        system: 'You are a knowledge specialist',
        identify_concepts: 'Analyze: {{content}}',
        classify_chunk: 'Classify: {{chunk}}',
      });
    });

    it('reads the YAML file from the correct path', async () => {
      await loadKnowledgePrompts();
      expect(mockReadFile).toHaveBeenCalled();
      const callArg = mockReadFile.mock.calls[0]?.[0];
      expect(typeof callArg).toBe('string');
      expect(callArg).toContain('knowledge-agent.yaml');
    });

    it('throws on invalid YAML structure', async () => {
      mockReadFile.mockResolvedValueOnce('invalid: yaml: structure: here: missing_required_fields');
      await expect(loadKnowledgePrompts()).rejects.toThrow();
    });
  });

  describe('identifyConcepts', () => {
    it('calls generateObject with claude-haiku-4-5-20251001 model', async () => {
      await identifyConcepts('Sample content about Apex and SOQL');
      expect(mockGenerateObject).toHaveBeenCalled();
      const call = mockGenerateObject.mock.calls[0];
      expect(call).toBeDefined();
    });

    it('returns a validated ConceptExtraction result with all required fields', async () => {
      const result = await identifyConcepts('Sample content about Apex and SOQL');
      expect(result).toEqual({
        sf_topics: ['Apex', 'SOQL'],
        sf_objects: ['Account', 'Contact'],
        sf_api_names: ['Account.Name'],
        apex_keywords: ['trigger', 'batch'],
        flow_references: [],
        difficulty: 'intermediate',
        content_types: ['explanation', 'code'],
      });
    });

    it('uses conceptExtractionSchema for validation', async () => {
      await identifyConcepts('Sample content');
      const call = mockGenerateObject.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call?.schema).toBe(conceptExtractionSchema);
    });

    it('sets maxRetries to 1 for one retry on validation failure', async () => {
      await identifyConcepts('Sample content');
      const call = mockGenerateObject.mock.calls[0]?.[0];
      expect(call?.maxRetries).toBe(1);
    });

    it('throws PipelineError if content is empty', async () => {
      await expect(identifyConcepts('')).rejects.toThrow(PipelineError);
      await expect(identifyConcepts('   ')).rejects.toThrow(PipelineError);
    });

    it('replaces {{content}} placeholder in the prompt', async () => {
      mockReadFile.mockResolvedValueOnce(`system: "You are a specialist"
identify_concepts: "Analyze this: {{content}}"
classify_chunk: "Test: {{chunk}}"`);

      await identifyConcepts('My test content here');
      const call = mockGenerateObject.mock.calls[0]?.[0];
      expect(call?.prompt).toContain('My test content here');
      expect(call?.prompt).not.toContain('{{content}}');
    });
  });

  describe('classifyChunk', () => {
    beforeEach(() => {
      mockGenerateObject.mockClear();
      mockGenerateObject.mockResolvedValue({
        object: {
          content_type: 'code',
        },
      });
    });

    it('calls generateObject with claude-haiku-4-5-20251001 model', async () => {
      await classifyChunk('```\nsome code\n```');
      expect(mockGenerateObject).toHaveBeenCalled();
    });

    it('returns the content_type from the LLM response', async () => {
      const result = await classifyChunk('```\nsome code\n```');
      expect(result).toBe('code');
    });

    it('replaces {{chunk}} placeholder in the prompt', async () => {
      mockReadFile.mockResolvedValueOnce(`system: "Test system"
identify_concepts: "Test"
classify_chunk: "Classify this: {{chunk}}"`);

      await classifyChunk('My test chunk');
      const call = mockGenerateObject.mock.calls[0]?.[0];
      expect(call?.prompt).toContain('My test chunk');
      expect(call?.prompt).not.toContain('{{chunk}}');
    });

    it('sets maxRetries to 1 for one retry on validation failure', async () => {
      await classifyChunk('Test chunk');
      const call = mockGenerateObject.mock.calls[0]?.[0];
      expect(call?.maxRetries).toBe(1);
    });
  });
});
