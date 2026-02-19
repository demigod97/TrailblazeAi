import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createClient } from '@trailblaze/db';
import { PipelineError } from '../../lib/errors.js';
import { logToolTrace } from '../../lib/agent-logger.js';
import { loadKnowledgePrompts, conceptExtractionSchema } from '../../agents/knowledge-agent.js';

export const conceptRelationshipSchema = z.object({
  relationships: z.array(
    z.object({
      source_concept: z.string(),
      target_concept: z.string(),
      relationship_type: z.enum(['prerequisite', 'related_to', 'part_of']),
      strength: z.number().min(0).max(1),
    }),
  ),
});

export interface BuildRelationshipsInput {
  unit_id: string;
  module_id: string;
  run_id: string | null;
}

// Structural type for Supabase operations used in this stage
type RelationshipsClient = {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): Promise<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
    };
    insert(data: unknown[]): Promise<{ error: { message: string } | null }>;
  };
};

// Structural type for chunk lookup (supports multi-column select with sf_topics)
type ChunkLookupClient = {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): Promise<{
        data: Array<{ id: string; sf_topics?: string[] | null }> | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export async function buildUnitRelationships(
  input: BuildRelationshipsInput,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const startTime = Date.now();
  const db = supabase as unknown as RelationshipsClient;

  // Fetch current unit's sf_concepts
  const { data: unitData, error: unitError } = await db
    .from('units')
    .select('id, sf_concepts, title')
    .eq('id', input.unit_id);

  if (unitError) {
    throw new PipelineError('build-relationships', `Failed to fetch unit: ${unitError.message}`);
  }

  const unit = unitData?.[0];
  const parsedConcepts = conceptExtractionSchema.safeParse(unit?.sf_concepts);

  if (!parsedConcepts.success) {
    // No valid concepts — log and return early
    await logToolTrace(supabase, {
      run_id: input.run_id,
      agent_type: 'knowledge',
      tool_type: 'llm_call',
      query: `build-relationships unit=${input.unit_id}`,
      raw_output: null,
      summary: 'No valid sf_concepts found — skipping relationship mapping',
      raw_output_truncated: false,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_usd: 0,
      duration_ms: Date.now() - startTime,
      confidence_score: null,
      related_chunk_ids: [],
    });
    return;
  }

  const currentConcepts = parsedConcepts.data;

  // Fetch all other units in the module for cross-unit context (HIGH: check error — missing context is a correctness defect)
  const { data: allUnitsData, error: allUnitsError } = await db
    .from('units')
    .select('id, sf_concepts, title')
    .eq('module_id', input.module_id);

  if (allUnitsError) {
    throw new PipelineError('build-relationships', `Failed to fetch module units: ${allUnitsError.message}`);
  }

  const otherUnitsConcepts: string[] = [];
  if (allUnitsData) {
    for (const u of allUnitsData) {
      if ((u as Record<string, unknown>)['id'] === input.unit_id) continue;
      const parsed = conceptExtractionSchema.safeParse((u as Record<string, unknown>)['sf_concepts']);
      if (parsed.success) {
        const allConceptNames = [
          ...parsed.data.sf_topics,
          ...parsed.data.sf_objects,
          ...parsed.data.apex_keywords,
          ...parsed.data.flow_references,
        ];
        otherUnitsConcepts.push(...allConceptNames);
      }
    }
  }

  // Collect current unit concept names for the prompt
  const currentConceptNames = [
    ...currentConcepts.sf_topics,
    ...currentConcepts.sf_objects,
    ...currentConcepts.apex_keywords,
    ...currentConcepts.flow_references,
  ];

  // Load prompts and build the relationship mapping prompt (MEDIUM: assert prompt exists)
  const prompts = await loadKnowledgePrompts();
  const buildRelationshipsPrompt = prompts.build_relationships;
  if (!buildRelationshipsPrompt) {
    throw new PipelineError('build-relationships', 'build_relationships prompt is missing from knowledge-agent.yaml');
  }
  const prompt = buildRelationshipsPrompt
    .replace('{{current_concepts}}', currentConceptNames.join(', '))
    .replace('{{other_concepts}}', [...new Set(otherUnitsConcepts)].join(', '));

  // Call LLM to identify relationships
  const { object } = await generateObject({
    model: anthropic('claude-haiku-4-5-20251001'),
    schema: conceptRelationshipSchema,
    prompt,
    system: prompts.system,
    maxRetries: 1,
  });

  // Fetch existing relationships for this module to deduplicate
  const { data: existingRels } = await db
    .from('sf_concept_relationships')
    .select('source_concept, target_concept, relationship_type')
    .eq('module_id', input.module_id);

  const existingSet = new Set(
    (existingRels ?? []).map(
      (r) =>
        `${(r as Record<string, unknown>)['source_concept']}→${(r as Record<string, unknown>)['target_concept']}→${(r as Record<string, unknown>)['relationship_type']}`,
    ),
  );

  // Filter: no self-relationships + no duplicates
  const newRelationships = object.relationships.filter((rel) => {
    if (rel.source_concept === rel.target_concept) return false;
    const key = `${rel.source_concept}→${rel.target_concept}→${rel.relationship_type}`;
    return !existingSet.has(key);
  });

  if (newRelationships.length === 0) {
    // Nothing to insert — log and return
    await logToolTrace(supabase, {
      run_id: input.run_id,
      agent_type: 'knowledge',
      tool_type: 'llm_call',
      query: `build-relationships unit=${input.unit_id}`,
      raw_output: null,
      summary: `No new relationships found (${object.relationships.length} duplicates/self-refs filtered)`,
      raw_output_truncated: false,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_usd: 0,
      duration_ms: Date.now() - startTime,
      confidence_score: null,
      related_chunk_ids: [],
    });
    return;
  }

  // Hoist chunk lookup — single query before the loop (HIGH: avoids N+1 queries and gives per-concept matching)
  const { data: unitChunks } = await (supabase as unknown as ChunkLookupClient)
    .from('sf_knowledge_chunks')
    .select('id, sf_topics')
    .eq('unit_id', input.unit_id);

  // Build relationship rows with concept-matched representative chunks
  const rows = newRelationships.map((rel) => {
    const sourceChunk =
      unitChunks?.find((c) => Array.isArray(c.sf_topics) && c.sf_topics.includes(rel.source_concept)) ??
      unitChunks?.[0] ??
      null;
    const targetChunk =
      unitChunks?.find((c) => Array.isArray(c.sf_topics) && c.sf_topics.includes(rel.target_concept)) ?? null;

    return {
      source_concept: rel.source_concept,
      target_concept: rel.target_concept,
      relationship_type: rel.relationship_type,
      strength: rel.strength,
      source_chunk_id: sourceChunk?.id ?? null,
      target_chunk_id: targetChunk?.id ?? null,
      module_id: input.module_id,
    };
  });

  // Batch insert
  const { error: insertError } = await db.from('sf_concept_relationships').insert(rows);
  if (insertError) {
    throw new PipelineError('build-relationships', `Failed to insert relationships: ${insertError.message}`);
  }

  await logToolTrace(supabase, {
    run_id: input.run_id,
    agent_type: 'knowledge',
    tool_type: 'llm_call',
    query: `build-relationships unit=${input.unit_id}`,
    raw_output: null,
    summary: `Mapped ${rows.length} concept relationships for unit ${input.unit_id}`,
    raw_output_truncated: false,
    input_tokens: 0,
    output_tokens: 0,
    estimated_cost_usd: 0,
    duration_ms: Date.now() - startTime,
    confidence_score: null,
    related_chunk_ids: rows.map((r) => r.source_chunk_id ?? '').filter(Boolean),
  });
}
