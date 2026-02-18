import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { createClient } from '@trailblaze/db';
import { logToolTrace } from './agent-logger.js';

export interface ExtractWithStagehandParams<T> {
  url: string;
  schema: z.ZodSchema<T>;
  instruction: string;
  supabase: ReturnType<typeof createClient>;
  runId: string | null;
}

export async function extractWithStagehand<T>(
  params: ExtractWithStagehandParams<T>,
): Promise<T> {
  const startTime = Date.now();
  const stagehand = new Stagehand({
    env: 'LOCAL',
    model: 'claude-haiku-4-5-20251001',
    verbose: 0,
    disablePino: true,
  });

  try {
    await stagehand.init();
    const page = stagehand.context.activePage();
    if (!page) throw new Error('Stagehand: no active page after init()');
    await page.goto(params.url);
    const result = await stagehand.extract(params.instruction, params.schema);

    const rawOutput = JSON.stringify(result);
    const rawOutputTruncated = rawOutput.length > 50000;

    await logToolTrace(params.supabase, {
      tool_type: 'stagehand',
      agent_type: 'scraper',
      query: params.instruction,
      raw_output: rawOutput.substring(0, 50000),
      raw_output_truncated: rawOutputTruncated,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_usd: 0,
      duration_ms: Date.now() - startTime,
      confidence_score: null,
      related_chunk_ids: null,
      run_id: params.runId,
      summary: 'Stagehand extraction',
    });

    return result;
  } finally {
    await stagehand.close();
  }
}
