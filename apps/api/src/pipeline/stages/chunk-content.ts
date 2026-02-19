import { RecursiveChunker } from '@chonkiejs/core';
import { createClient } from '@trailblaze/db';
import { PipelineError } from '../../lib/errors.js';
import { logToolTrace } from '../../lib/agent-logger.js';
import { conceptExtractionSchema, type ConceptExtraction } from '../../agents/knowledge-agent.js';

export const CHUNK_SIZE = 512;
export const CHUNK_OVERLAP = 50;
export const HANDS_ON_MAX_TOKENS = 800;

export interface ChunkContentInput {
  unit_id: string;
  module_id: string;
  run_id: string | null;
}

export interface PreparedChunk {
  text: string;
  content_type: string;
  section_header: string | null;
}

// Structural type for the Supabase client operations used in this stage.
type PipelineClient = {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): Promise<{
        data: Array<{ id: string; content_markdown: string | null; sf_concepts: unknown | null; module_id: string; title: string | null }> | null;
        error: { message: string } | null;
      }>;
    };
    insert(data: unknown[]): Promise<{ error: { message: string } | null }>;
  };
};

const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;

export function extractCodeBlocks(markdown: string): { cleaned: string; codeChunks: PreparedChunk[] } {
  const codeChunks: PreparedChunk[] = [];

  const cleaned = markdown.replace(CODE_BLOCK_REGEX, (match: string, offset: number) => {
    // Find the most recent heading before this code block using the offset parameter
    const textBefore = markdown.substring(0, offset);
    const headerMatches = textBefore.match(/^(#{1,4}\s+.+)$/gm);
    const currentHeader = headerMatches ? headerMatches[headerMatches.length - 1]?.replace(/^#+\s+/, '') ?? null : null;

    codeChunks.push({
      text: match,
      content_type: 'code',
      section_header: currentHeader,
    });

    return `__CODE_BLOCK_${codeChunks.length - 1}__`;
  });

  return { cleaned, codeChunks };
}

export function detectQuizChunks(markdown: string): PreparedChunk[] {
  const quizChunks: PreparedChunk[] = [];

  // Simple quiz pattern detection: look for question markers and options
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line && (line.includes('**Question**') || line.includes('Question:') || line.match(/^\d+\.\s/))) {
      // Start of a potential quiz question
      let questionBlock = line;
      i++;

      // Collect all lines until we hit a blank line or next question
      while (i < lines.length && lines[i] && !lines[i]!.match(/^(#{1,4}\s|$)/)) {
        questionBlock += '\n' + lines[i];
        i++;
        // Stop if we have options (A., B., C., D. or [ ], etc.)
        if (questionBlock.match(/[A-D]\.\s|radio|checkbox/)) {
          break;
        }
      }

      if (questionBlock.match(/[A-D]\.\s|radio|checkbox/)) {
        quizChunks.push({
          text: questionBlock.trim(),
          content_type: 'quiz',
          section_header: null,
        });
      }
    } else {
      i++;
    }
  }

  return quizChunks;
}

export function detectHandsOnSteps(markdown: string): PreparedChunk[] {
  const handsOnChunks: PreparedChunk[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Look for step patterns: "Step N:", "N.", "N)", etc. with imperative verbs
    if (line && line.match(/^(Step\s+\d+:|^\d+[.)]\s+)/)) {
      let stepBlock = line;
      let stepCount = 1;
      i++;

      // Group consecutive steps
      while (i < lines.length && stepCount < 10) {
        const nextLine = lines[i];
        if (nextLine && nextLine.match(/^(Step\s+\d+:|^\d+[.)]\s+)/)) {
          stepBlock += '\n' + nextLine;
          stepCount++;
          i++;
        } else if (nextLine && nextLine.trim()) {
          // Include continuation lines (content of the step)
          stepBlock += '\n' + nextLine;
          i++;
        } else {
          break;
        }
      }

      if (stepBlock.match(/^\d+[\.)]\s|^Step\s+\d+:/m)) {
        handsOnChunks.push({
          text: stepBlock.trim(),
          content_type: 'hands_on',
          section_header: null,
        });
      }
    } else {
      i++;
    }
  }

  return handsOnChunks;
}

export async function chunkUnitContent(input: ChunkContentInput, supabase: ReturnType<typeof createClient>): Promise<void> {
  const db = supabase as unknown as PipelineClient;

  // Fetch unit from units table
  const { data: units, error: selectError } = await db
    .from('units')
    .select('id, content_markdown, sf_concepts, module_id, title')
    .eq('id', input.unit_id);

  if (selectError) {
    throw new PipelineError('chunk-content', `Failed to query unit: ${selectError.message}`);
  }

  if (!units || units.length === 0) {
    throw new PipelineError('chunk-content', `Unit not found: ${input.unit_id}`);
  }

  const unit = units[0];
  if (!unit || !unit.content_markdown) {
    throw new PipelineError('chunk-content', `Unit has no content_markdown: ${input.unit_id}`);
  }

  // Parse sf_concepts from unit with Zod validation at the system boundary
  let concepts: Partial<ConceptExtraction> = {
    sf_topics: [],
  };
  if (unit.sf_concepts) {
    try {
      const raw = typeof unit.sf_concepts === 'string' ? JSON.parse(unit.sf_concepts) : unit.sf_concepts;
      const parseResult = conceptExtractionSchema.safeParse(raw);
      concepts = parseResult.success ? parseResult.data : { sf_topics: [], difficulty: undefined };
    } catch {
      // Fallback to defaults if JSON parsing fails
    }
  }

  const startTime = Date.now();

  // Extract special content types
  const { cleaned: textAfterCodeExtraction, codeChunks } = extractCodeBlocks(unit.content_markdown);
  const quizChunks = detectQuizChunks(textAfterCodeExtraction);
  const handsOnChunks = detectHandsOnSteps(textAfterCodeExtraction);

  // Remove quiz and hands-on content from the text
  let remainingText = textAfterCodeExtraction;
  for (const quiz of quizChunks) {
    remainingText = remainingText.replace(quiz.text, '');
  }
  for (const step of handsOnChunks) {
    remainingText = remainingText.replace(step.text, '');
  }

  // Use RecursiveChunker for remaining text (library does not support overlap natively)
  const chunker = await RecursiveChunker.create({ chunkSize: CHUNK_SIZE });
  const regularChunks = await chunker.chunk(remainingText);

  // Apply manual overlap: prepend the last ~CHUNK_OVERLAP tokens from the previous chunk
  // to each subsequent chunk for context continuity during retrieval
  const CHARS_PER_TOKEN_ESTIMATE = 4;
  const overlapChars = CHUNK_OVERLAP * CHARS_PER_TOKEN_ESTIMATE;
  const preparedRegularChunks: PreparedChunk[] = regularChunks.map((chunk, idx) => {
    let text = chunk.text;
    if (idx > 0 && regularChunks[idx - 1]) {
      const prevText = regularChunks[idx - 1]!.text;
      const overlapText = prevText.slice(-overlapChars);
      text = overlapText + text;
    }
    return {
      text,
      content_type: 'explanation' as const,
      section_header: null,
    };
  });

  // Combine all chunks
  const allChunks = [...codeChunks, ...quizChunks, ...handsOnChunks, ...preparedRegularChunks];

  // Guard: skip insert if no chunks were produced (e.g., degenerate unit content)
  if (allChunks.length === 0) {
    const duration = Date.now() - startTime;
    await logToolTrace(supabase, {
      run_id: input.run_id,
      agent_type: 'knowledge',
      tool_type: 'llm_call',
      query: `chunk-content for unit: ${unit?.title ?? input.unit_id}`,
      raw_output: JSON.stringify({ chunk_count: 0 }),
      summary: 'No chunks produced for unit',
      raw_output_truncated: false,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_usd: 0,
      duration_ms: duration,
      confidence_score: null,
      related_chunk_ids: null,
    });
    return;
  }

  // Insert chunks into sf_knowledge_chunks
  const chunksToInsert = allChunks.map((chunk, index) => ({
    unit_id: input.unit_id,
    module_id: input.module_id,
    chunk_text: chunk.text,
    content_type: chunk.content_type,
    difficulty: concepts.difficulty ?? null,
    sf_topics: concepts.sf_topics ?? [],
    section_header: chunk.section_header,
    chunk_index: index,
    fts: null,
  }));

  const { error: insertError } = await db.from('sf_knowledge_chunks').insert(chunksToInsert);

  if (insertError) {
    throw new PipelineError('chunk-content', `Failed to insert chunks: ${insertError.message}`);
  }

  // Log tool trace
  const duration = Date.now() - startTime;
  await logToolTrace(supabase, {
    run_id: input.run_id,
    agent_type: 'knowledge',
    tool_type: 'llm_call',
    query: `chunk-content for unit: ${unit?.title ?? input.unit_id}`,
    raw_output: JSON.stringify({ chunk_count: allChunks.length }),
    summary: `Created ${allChunks.length} chunks (${codeChunks.length} code, ${quizChunks.length} quiz, ${handsOnChunks.length} hands-on, ${preparedRegularChunks.length} explanation)`,
    raw_output_truncated: false,
    input_tokens: 0,
    output_tokens: 0,
    estimated_cost_usd: 0,
    duration_ms: duration,
    confidence_score: null,
    related_chunk_ids: null,
  });
}
