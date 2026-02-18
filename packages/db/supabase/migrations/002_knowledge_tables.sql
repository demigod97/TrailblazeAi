-- Knowledge tables: sf_knowledge_chunks, sf_concept_relationships
-- Supports hybrid search with embeddings and full-text search

CREATE TABLE sf_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),
  confidence_score NUMERIC(4,3),
  source_url TEXT,
  chunk_index INTEGER,
  fts tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sf_concept_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_chunk_id UUID NOT NULL REFERENCES sf_knowledge_chunks(id) ON DELETE CASCADE,
  target_chunk_id UUID NOT NULL REFERENCES sf_knowledge_chunks(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('prerequisite','related','contradicts','clarifies','extends')),
  strength NUMERIC(4,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
