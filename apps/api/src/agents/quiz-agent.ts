import { generateObject, embed } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { parse } from 'yaml';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';
import { PipelineError } from '../lib/errors.js';
import type { createClient } from '@trailblaze/db';

// ESM __dirname pattern
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Prompt loading ---

export interface QuizPrompts {
  system: string;
  answer_question: string;
}

const quizPromptSchema = z.object({
  system: z.string(),
  answer_question: z.string(),
});

let cachedQuizPrompts: QuizPrompts | null = null;

export async function loadQuizPrompts(): Promise<QuizPrompts> {
  if (cachedQuizPrompts) return cachedQuizPrompts;
  const yamlPath = join(__dirname, '../prompts/quiz-agent.yaml');
  const content = await readFile(yamlPath, 'utf-8');
  const parsed = parse(content) as unknown;
  cachedQuizPrompts = quizPromptSchema.parse(parsed);
  return cachedQuizPrompts;
}

/** Reset the prompt cache — for testing only */
export function _resetPromptCache(): void {
  cachedQuizPrompts = null;
}

// --- Types ---

export interface QuizItem {
  id: string;
  unit_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'multi_select';
  options: string[];
  correct_answer: string;
  explanation: string | null;
  related_chunk_ids: string[];
  display_order: number;
  created_at: string;
}

export interface QuizAnswer {
  reasoning: string;
  selected_answer: string;
  confidence: number;
}

const quizAnswerSchema = z.object({
  reasoning: z.string(),
  selected_answer: z.string(),
  confidence: z.number().min(0).max(1),
});

// Structural types for Supabase operations not yet in generated types
type DbQueryResult = Promise<{
  data: Array<Record<string, unknown>> | null;
  error: { message: string } | null;
}>;
type DbMutResult = Promise<{ error: { message: string } | null }>;

type QuizDbClient = {
  rpc(fn: string, params: Record<string, unknown>): DbQueryResult;
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): DbQueryResult;
      in(col: string, vals: string[]): DbQueryResult;
    };
    insert(rows: Array<Record<string, unknown>>): DbMutResult;
    update(data: Record<string, unknown>): { eq(col: string, val: string): DbMutResult };
  };
};

// --- Constants ---

const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
const INITIAL_MATCH_COUNT = 10;
const RETRY_MATCH_COUNT = 20;

// --- Internal helpers ---

async function searchKnowledge(
  db: QuizDbClient,
  queryText: string,
  queryEmbedding: number[],
  matchCount: number,
): Promise<string> {
  const { data, error } = await db.rpc('knowledge_search', {
    query_text: queryText,
    query_embedding: queryEmbedding,
    match_count: matchCount,
    full_text_weight: 1.5,
    semantic_weight: 1.0,
    rrf_k: 50,
  });

  if (error) {
    throw new PipelineError('quiz-agent', error.message);
  }

  const chunks = (data ?? []) as Array<{ chunk_text: string }>;
  return chunks.map((c) => c.chunk_text).join('\n\n---\n\n');
}

async function callGenerateObject(
  prompts: QuizPrompts,
  quizItem: QuizItem,
  context: string,
  retryInstruction: string,
): Promise<QuizAnswer> {
  const prompt = prompts.answer_question
    .replace('{question}', quizItem.question_text)
    .replace('{options}', quizItem.options.join('\n'))
    .replace('{context}', context)
    .replace('{retry_instruction}', retryInstruction);

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: quizAnswerSchema,
    prompt,
    system: prompts.system,
    maxRetries: 1,
  });

  return object;
}

// --- Exported functions ---

export async function answerQuizQuestion(
  quizItem: QuizItem,
  supabase: ReturnType<typeof createClient>,
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
): Promise<QuizAnswer> {
  const db = supabase as unknown as QuizDbClient;
  const prompts = await loadQuizPrompts();

  // 1. Generate embedding for the question
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: quizItem.question_text,
  });

  // 2. Search knowledge base with initial match count
  const context = await searchKnowledge(db, quizItem.question_text, embedding, INITIAL_MATCH_COUNT);

  // 3. Answer the question using chain-of-thought
  const answer = await callGenerateObject(prompts, quizItem, context, '');

  // 4. Retry with broader scope if confidence is below threshold
  if (answer.confidence < confidenceThreshold) {
    const retryContext = await searchKnowledge(
      db,
      quizItem.question_text,
      embedding,
      RETRY_MATCH_COUNT,
    );
    const retryInstruction =
      'Your previous answer had low confidence. Please reconsider using this broader context.';
    const retryAnswer = await callGenerateObject(prompts, quizItem, retryContext, retryInstruction);

    // Keep the answer with higher confidence
    if (retryAnswer.confidence > answer.confidence) {
      return retryAnswer;
    }
    return answer;
  }

  return answer;
}

export async function answerModuleQuiz(
  { module_id, run_id }: { module_id: string; run_id: string | null },
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const db = supabase as unknown as QuizDbClient;

  // 1. Transition module status to "quizzing"
  await db.from('modules').update({ status: 'quizzing' }).eq('id', module_id);

  // 2. Fetch units for this module
  const { data: unitsData, error: unitsError } = await db
    .from('units')
    .select('id')
    .eq('module_id', module_id);

  if (unitsError) {
    throw new PipelineError('quiz-agent', unitsError.message);
  }

  const unitIds = (unitsData ?? []).map((u) => (u as { id: string }).id);
  if (unitIds.length === 0) return;

  // 3. Fetch quiz items for those units
  const { data: quizItemsData, error: quizItemsError } = await db
    .from('quiz_items')
    .select('*')
    .in('unit_id', unitIds);

  if (quizItemsError) {
    throw new PipelineError('quiz-agent', quizItemsError.message);
  }

  const quizItems = (quizItemsData ?? []) as unknown as QuizItem[];
  if (quizItems.length === 0) return;

  // 4. Answer each quiz item and store results
  for (const item of quizItems) {
    // Skip if already answered
    const { data: existing } = await db
      .from('quiz_results')
      .select('id')
      .eq('quiz_item_id', item.id);

    if (existing && existing.length > 0) continue;

    const answer = await answerQuizQuestion(item, supabase);

    const resultRow: Record<string, unknown> = {
      unit_id: item.unit_id,
      quiz_item_id: item.id,
      selected_answer: answer.selected_answer,
      is_correct: answer.selected_answer === item.correct_answer,
      confidence_score: answer.confidence,
      reasoning: answer.reasoning,
      attempt_number: 1,
    };

    if (run_id) {
      resultRow.run_id = run_id;
    }

    const { error: insertError } = await db.from('quiz_results').insert([resultRow]);
    if (insertError) {
      throw new PipelineError('quiz-agent', insertError.message);
    }
  }
}
