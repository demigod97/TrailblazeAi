-- Add failure_reason column to modules table
-- Task 1.1: Add failure_reason to track session expiry and other failures

ALTER TABLE modules ADD COLUMN failure_reason TEXT;
