-- Indexes for performance optimization
-- Decision 12: Database Schema Strategy

-- HNSW for vector similarity (inner product distance)
CREATE INDEX ON sf_knowledge_chunks
  USING hnsw (embedding vector_ip_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN for full-text search
CREATE INDEX ON sf_knowledge_chunks USING gin(fts);

-- Composite indexes for common queries
CREATE INDEX idx_modules_status ON modules(status);
CREATE INDEX idx_modules_trailmix_id ON modules(trailmix_id);
CREATE INDEX idx_units_module_id ON units(module_id);
CREATE INDEX idx_agent_logs_run_id ON agent_logs(run_id);
CREATE INDEX idx_knowledge_chunks_module_id ON sf_knowledge_chunks(module_id);
CREATE INDEX idx_quiz_items_unit_id ON quiz_items(unit_id);
CREATE INDEX idx_quiz_results_unit_id ON quiz_results(unit_id);
CREATE INDEX idx_quiz_results_user_id ON quiz_results(user_id);
