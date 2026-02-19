import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { parse } from 'yaml';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';
import { PipelineError } from '../lib/errors.js';

// ESM __dirname pattern
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface KnowledgePrompts {
  system: string;
  identify_concepts: string;
  classify_chunk: string;
}

const promptSchema = z.object({
  system: z.string(),
  identify_concepts: z.string(),
  classify_chunk: z.string(),
});

let cachedPrompts: KnowledgePrompts | null = null;

export async function loadKnowledgePrompts(): Promise<KnowledgePrompts> {
  if (cachedPrompts) return cachedPrompts;
  const yamlPath = join(__dirname, '../prompts/knowledge-agent.yaml');
  const content = await readFile(yamlPath, 'utf-8');
  const parsed = parse(content) as unknown;
  cachedPrompts = promptSchema.parse(parsed);
  return cachedPrompts;
}

/** Reset the prompt cache — for testing only */
export function _resetPromptCache(): void {
  cachedPrompts = null;
}

export const conceptExtractionSchema = z.object({
  sf_topics: z.array(z.string()),
  sf_objects: z.array(z.string()),
  sf_api_names: z.array(z.string()),
  apex_keywords: z.array(z.string()),
  flow_references: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  content_types: z.array(z.enum(['explanation', 'code', 'quiz', 'hands_on', 'reference', 'definition'])),
});

export type ConceptExtraction = z.infer<typeof conceptExtractionSchema>;

export async function identifyConcepts(content: string): Promise<ConceptExtraction> {
  // Validate that content is not empty
  if (!content || !content.trim()) {
    throw new PipelineError('identify-concepts', 'Content is empty');
  }

  const prompts = await loadKnowledgePrompts();
  const prompt = prompts.identify_concepts.replace('{{content}}', content);

  const { object } = await generateObject({
    model: anthropic('claude-haiku-4-5-20251001'),
    schema: conceptExtractionSchema,
    prompt: prompt,
    system: prompts.system,
    maxRetries: 1,
  });

  return object;
}

export const chunkClassificationSchema = z.object({
  content_type: z.enum(['explanation', 'code', 'quiz', 'hands_on', 'reference', 'definition']),
});

export async function classifyChunk(chunkText: string): Promise<string> {
  const prompts = await loadKnowledgePrompts();
  const prompt = prompts.classify_chunk.replace('{{chunk}}', chunkText);

  const { object } = await generateObject({
    model: anthropic('claude-haiku-4-5-20251001'),
    schema: chunkClassificationSchema,
    prompt: prompt,
    system: prompts.system,
    maxRetries: 1,
  });

  return object.content_type;
}
