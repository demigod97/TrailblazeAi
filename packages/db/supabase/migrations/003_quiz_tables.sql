-- Quiz tables: quiz_items, quiz_results
-- Tracks quiz interactions and results

CREATE TABLE quiz_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice','true_false','short_answer')),
  options TEXT[],
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  related_chunk_ids UUID[] DEFAULT '{}',
  display_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  quiz_item_id UUID NOT NULL REFERENCES quiz_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  selected_answer TEXT,
  is_correct BOOLEAN,
  confidence_score NUMERIC(4,3),
  reasoning TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
