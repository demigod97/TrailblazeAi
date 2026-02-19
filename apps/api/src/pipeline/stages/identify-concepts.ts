import { createClient } from '@trailblaze/db';
import { PipelineError } from '../../lib/errors.js';
import { identifyConcepts } from '../../agents/knowledge-agent.js';
import { logToolTrace } from '../../lib/agent-logger.js';

export interface IdentifyConceptsInput {
  unit_id: string;
  run_id: string | null;
}

// Structural type for the Supabase client operations used in this stage.
type PipelineClient = {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): Promise<{ data: Array<{ id: string; title: string | null; content_markdown: string | null }> | null; error: { message: string } | null }>;
    };
    update(data: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function identifyUnitConcepts(input: IdentifyConceptsInput, supabase: ReturnType<typeof createClient>): Promise<void> {
  const db = supabase as unknown as PipelineClient;

  // Fetch unit from units table
  const { data: units, error: selectError } = await db
    .from('units')
    .select('id, title, content_markdown')
    .eq('id', input.unit_id);

  if (selectError) {
    throw new PipelineError('identify-concepts', `Failed to query unit: ${selectError.message}`);
  }

  if (!units || units.length === 0) {
    throw new PipelineError('identify-concepts', `Unit not found: ${input.unit_id}`);
  }

  const unit = units[0];
  if (!unit || !unit.content_markdown) {
    throw new PipelineError('identify-concepts', `Unit has no content_markdown: ${input.unit_id}`);
  }

  // Start timer for duration tracking
  const startTime = Date.now();

  // Call the knowledge agent to identify concepts
  const concepts = await identifyConcepts(unit.content_markdown);

  // Update units table with sf_concepts
  const { error: updateError } = await db
    .from('units')
    .update({ sf_concepts: JSON.stringify(concepts) })
    .eq('id', input.unit_id);

  if (updateError) {
    throw new PipelineError('identify-concepts', `Failed to update unit concepts: ${updateError.message}`);
  }

  // Log tool trace
  const duration = Date.now() - startTime;
  await logToolTrace(supabase, {
    run_id: input.run_id,
    agent_type: 'knowledge',
    tool_type: 'llm_call',
    query: `identify-concepts for unit: ${unit?.title ?? input.unit_id}`,
    raw_output: JSON.stringify(concepts),
    summary: `Identified ${concepts.sf_topics.length} topics, ${concepts.sf_objects.length} objects`,
    raw_output_truncated: false,
    input_tokens: 0,
    output_tokens: 0,
    estimated_cost_usd: 0,
    duration_ms: duration,
    confidence_score: null,
    related_chunk_ids: null,
  });
}
