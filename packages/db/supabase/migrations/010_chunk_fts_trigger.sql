-- Auto-populate fts tsvector from chunk_text on insert or update
-- This ensures fts is always in sync with chunk_text
-- The trigger fires on embedding updates too, backfilling fts for existing chunks

CREATE OR REPLACE FUNCTION update_chunk_fts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fts := to_tsvector('english', COALESCE(NEW.chunk_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chunk_fts_trigger ON sf_knowledge_chunks;

CREATE TRIGGER chunk_fts_trigger
  BEFORE INSERT OR UPDATE
  ON sf_knowledge_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_chunk_fts();
