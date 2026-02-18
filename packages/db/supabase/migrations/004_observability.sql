-- Observability table: agent_logs (ToolTrace schema)
-- Tracks AI agent tool calls and performance metrics

CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id),
  agent_type TEXT NOT NULL CHECK (agent_type IN ('scraper','knowledge','quiz','documentation')),
  tool_type TEXT NOT NULL CHECK (tool_type IN ('playwright_mcp','rag_search','llm_call','embedding','sf_mcp','stagehand')),
  query TEXT NOT NULL,
  raw_output TEXT,
  summary TEXT,
  raw_output_truncated BOOLEAN NOT NULL DEFAULT false,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  confidence_score NUMERIC(4,3),
  related_chunk_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
