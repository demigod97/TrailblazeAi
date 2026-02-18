-- Hybrid search function combining vector and full-text search
-- Decision 6: Hybrid Search Strategy — RRF with configurable weights
-- Matches architecture.md Decision 6 signature exactly

CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10,
  full_text_weight FLOAT DEFAULT 1.5,  -- Higher weight for Salesforce terminology
  semantic_weight FLOAT DEFAULT 1.0,
  rrf_k INT DEFAULT 50
) RETURNS SETOF sf_knowledge_chunks AS $$
  WITH full_text AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(fts, websearch_to_tsquery(query_text)) DESC) AS rank
    FROM sf_knowledge_chunks
    WHERE fts @@ websearch_to_tsquery(query_text)
    ORDER BY rank LIMIT match_count * 2
  ),
  semantic AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <#> query_embedding) AS rank
    FROM sf_knowledge_chunks
    ORDER BY rank LIMIT match_count * 2
  )
  SELECT c.*
  FROM sf_knowledge_chunks c
  JOIN (
    SELECT COALESCE(f.id, s.id) AS id,
      COALESCE(1.0 / (rrf_k + f.rank), 0.0) * full_text_weight +
      COALESCE(1.0 / (rrf_k + s.rank), 0.0) * semantic_weight AS score
    FROM full_text f FULL OUTER JOIN semantic s ON f.id = s.id
  ) ranked ON c.id = ranked.id
  ORDER BY ranked.score DESC
  LIMIT match_count;
$$ LANGUAGE sql;

-- Maintain fts tsvector column on insert/update
CREATE OR REPLACE FUNCTION update_fts_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fts := to_tsvector('english', NEW.chunk_text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_fts_vector_trigger
BEFORE INSERT OR UPDATE ON sf_knowledge_chunks
FOR EACH ROW
EXECUTE FUNCTION update_fts_vector();
