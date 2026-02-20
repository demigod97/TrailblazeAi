-- Pipeline configuration table
-- Stores global pipeline settings: quiz-only mode, skip completed, priority track, pause state

CREATE TABLE IF NOT EXISTS pipeline_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_only_mode BOOLEAN NOT NULL DEFAULT false,
  skip_completed BOOLEAN NOT NULL DEFAULT false,
  priority_track TEXT,
  pipeline_paused BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default row (single-row config pattern)
INSERT INTO pipeline_config (id, quiz_only_mode, skip_completed, priority_track, pipeline_paused)
VALUES ('00000000-0000-0000-0000-000000000001', false, false, NULL, false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE pipeline_config ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can SELECT and UPDATE
CREATE POLICY "Authenticated users can read pipeline config"
  ON pipeline_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update pipeline config"
  ON pipeline_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
