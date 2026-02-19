-- Knowledge search function that exposes RRF relevance score
-- Separate from hybrid_search() (migration 007) which returns SETOF sf_knowledge_chunks
-- Uses RETURNS TABLE to include relevance_score without a composite TYPE

CREATE OR REPLACE FUNCTION knowledge_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 50,
  full_text_weight FLOAT DEFAULT 1.5,
  semantic_weight FLOAT DEFAULT 1.0,
  rrf_k INT DEFAULT 50
) RETURNS TABLE(
  id UUID,
  module_id UUID,
  unit_id UUID,
  chunk_text TEXT,
  content_type TEXT,
  difficulty TEXT,
  sf_topics TEXT[],
  section_header TEXT,
  relevance_score FLOAT
) AS $$
  WITH full_text AS (
    SELECT c.id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(c.fts, websearch_to_tsquery(query_text)) DESC) AS rank
    FROM sf_knowledge_chunks c
    WHERE c.fts @@ websearch_to_tsquery(query_text)
    ORDER BY rank LIMIT match_count * 2
  ),
  semantic AS (
    SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.embedding <#> query_embedding) AS rank
    FROM sf_knowledge_chunks c
    ORDER BY rank LIMIT match_count * 2
  ),
  ranked AS (
    SELECT COALESCE(f.id, s.id) AS id,
      COALESCE(1.0 / (rrf_k + f.rank), 0.0) * full_text_weight +
      COALESCE(1.0 / (rrf_k + s.rank), 0.0) * semantic_weight AS rrf_score
    FROM full_text f FULL OUTER JOIN semantic s ON f.id = s.id
    ORDER BY rrf_score DESC
    LIMIT match_count
  )
  SELECT
    c.id,
    c.module_id,
    c.unit_id,
    c.chunk_text,
    c.content_type,
    c.difficulty,
    c.sf_topics,
    c.section_header,
    r.rrf_score AS relevance_score
  FROM sf_knowledge_chunks c
  JOIN ranked r ON c.id = r.id
  ORDER BY r.rrf_score DESC;
$$ LANGUAGE sql;
