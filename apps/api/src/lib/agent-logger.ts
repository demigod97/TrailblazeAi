import { createClient } from '@trailblaze/db';
import type { AgentType, ToolType } from '@trailblaze/shared';

export interface ToolTraceParams {
  run_id: string | null;
  agent_type: AgentType;
  tool_type: ToolType;
  query: string;
  raw_output: string | null;
  summary: string | null;
  raw_output_truncated: boolean;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  duration_ms: number;
  confidence_score: number | null;
  related_chunk_ids: string[] | null;
}

export async function logToolTrace(
  supabase: ReturnType<typeof createClient>,
  params: ToolTraceParams,
): Promise<void> {
  // Structural type for the subset of the Supabase client API we use here.
  // The `agent_logs` table will be in the generated DB schema; until then we
  // bypass the generic type via `unknown` instead of using a banned `any` cast.
  type InsertClient = {
    from(table: string): { insert(data: unknown): Promise<{ error?: { message: string } | null }> };
  };
  try {
    const result = await (supabase as unknown as InsertClient).from('agent_logs').insert(params);
    if (result?.error) {
      console.error('Failed to log tool trace to agent_logs:', result.error.message);
    }
  } catch (err) {
    console.error(
      'Failed to log tool trace to agent_logs:',
      err instanceof Error ? err.message : String(err),
    );
  }
}
