-- Add review workflow fields to quiz_results
-- Enables quiz review panel: approve/edit workflow

ALTER TABLE quiz_results
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS user_note TEXT;

-- NULL = pending review, TRUE = approved (approve or edit+save)
-- user_note: optional explanation for user-edited answers

-- Update RLS SELECT policy to include AI-generated (user_id IS NULL) rows
DROP POLICY IF EXISTS "quiz_results_select" ON quiz_results;
CREATE POLICY "quiz_results_select" ON quiz_results
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    (user_id IS NULL OR user_id = auth.uid())
  );

-- Create RLS UPDATE policy for approve/edit workflow
DROP POLICY IF EXISTS "quiz_results_update" ON quiz_results;
CREATE POLICY "quiz_results_update" ON quiz_results
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    (user_id IS NULL OR user_id = auth.uid())
  );
