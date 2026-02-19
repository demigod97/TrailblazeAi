import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@trailblaze/db';
import { PipelineError } from '../../lib/errors.js';
import { logToolTrace } from '../../lib/agent-logger.js';

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_COST_PER_TOKEN_USD = 0.00000002;

export interface GenerateEmbeddingsInput {
  unit_id: string;
  module_id: string;
  run_id: string | null;
}

type EmbeddingClient = {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): {
        is(col: string, val: null): Promise<{
          data: Array<{ id: string; chunk_text: string }> | null;
          error: { message: string } | null;
        }>;
      };
    };
    update(data: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function generateUnitEmbeddings(
  input: GenerateEmbeddingsInput,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const db = supabase as unknown as EmbeddingClient;

  const startTime = Date.now();

  // Fetch only chunks without embeddings (prevents re-embedding on retry)
  const { data: chunks, error } = await db
    .from('sf_knowledge_chunks')
    .select('id, chunk_text')
    .eq('unit_id', input.unit_id)
    .is('embedding', null);

  if (error) {
    throw new PipelineError('generate-embeddings', `Failed to fetch chunks: ${error.message}`);
  }

  if (!chunks || chunks.length === 0) {
    // No chunks — unit had no content or all already embedded. Log and return.
    await logToolTrace(supabase, {
      run_id: input.run_id,
      agent_type: 'knowledge',
      tool_type: 'embedding',
      query: `generate-embeddings for unit: ${input.unit_id}`,
      raw_output: JSON.stringify({ chunk_count: 0 }),
      summary: `No chunks found for unit ${input.unit_id} — skipping embedding`,
      raw_output_truncated: false,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_usd: 0,
      duration_ms: Date.now() - startTime,
      confidence_score: null,
      related_chunk_ids: null,
    });
    return;
  }

  const chunkTexts = chunks.map((c) => c.chunk_text);

  const { embeddings, usage } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: chunkTexts,
    maxRetries: 3,
    maxParallelCalls: 5,
  });

  // Update each chunk's embedding (FTS trigger auto-sets fts from chunk_text)
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    if (!chunk || !embedding) continue;

    const { error: updateError } = await db
      .from('sf_knowledge_chunks')
      .update({ embedding: JSON.stringify(embedding) })
      .eq('id', chunk.id);

    if (updateError) {
      throw new PipelineError(
        'generate-embeddings',
        `Failed to update embedding for chunk ${chunk.id}: ${updateError.message}`,
      );
    }
  }

  const estimatedCost = (usage?.tokens ?? 0) * EMBEDDING_COST_PER_TOKEN_USD;

  await logToolTrace(supabase, {
    run_id: input.run_id,
    agent_type: 'knowledge',
    tool_type: 'embedding',
    query: `generate-embeddings for unit: ${input.unit_id}`,
    raw_output: JSON.stringify({ chunk_count: chunks.length, embedding_dimensions: EMBEDDING_DIMENSIONS }),
    summary: `Generated ${chunks.length} embeddings (${EMBEDDING_DIMENSIONS}-dim) for unit ${input.unit_id}`,
    raw_output_truncated: false,
    input_tokens: usage?.tokens ?? 0,
    output_tokens: 0,
    estimated_cost_usd: estimatedCost,
    duration_ms: Date.now() - startTime,
    confidence_score: null,
    related_chunk_ids: chunks.map((c) => c.id),
  });
}
