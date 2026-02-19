-- Story 3.3: Add concept-level columns to sf_concept_relationships
-- Architecture Decision 12: concept-level relationships (source_concept, target_concept)
-- Makes source_chunk_id/target_chunk_id nullable (concept relationships may not map to specific chunks)
-- Adds module_id for cross-module relationship queries
-- Expands CHECK constraint to include epic-required relationship types

-- Add concept name columns
ALTER TABLE sf_concept_relationships ADD COLUMN IF NOT EXISTS source_concept TEXT;
ALTER TABLE sf_concept_relationships ADD COLUMN IF NOT EXISTS target_concept TEXT;

-- Add module_id for cross-module relationship queries
ALTER TABLE sf_concept_relationships ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE CASCADE;

-- Make chunk references nullable
ALTER TABLE sf_concept_relationships ALTER COLUMN source_chunk_id DROP NOT NULL;
ALTER TABLE sf_concept_relationships ALTER COLUMN target_chunk_id DROP NOT NULL;

-- Update CHECK constraint to include epic-required relationship types
ALTER TABLE sf_concept_relationships DROP CONSTRAINT IF EXISTS sf_concept_relationships_relationship_type_check;
ALTER TABLE sf_concept_relationships ADD CONSTRAINT sf_concept_relationships_relationship_type_check
  CHECK (relationship_type IN ('prerequisite', 'related', 'related_to', 'part_of', 'contradicts', 'clarifies', 'extends'));
