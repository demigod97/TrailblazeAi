-- Add correct_answer field to quiz_results for submission tracking
-- Stores the actual correct answer as returned by Trailhead after submission
-- Initially NULL; populated when submit-answers stage verifies answers

ALTER TABLE quiz_results
  ADD COLUMN IF NOT EXISTS correct_answer TEXT;

-- correct_answer: The actual correct answer from Trailhead
--   NULL = not yet submitted
--   Text value = answer confirmed by Trailhead feedback
-- This differs from quiz_items.correct_answer which comes from extraction
