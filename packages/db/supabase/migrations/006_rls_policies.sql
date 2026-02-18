-- Row Level Security (RLS) policies
-- Enforce user-level data isolation using auth.uid()

-- Enable RLS on all tables
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_concept_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- Modules: users can see their own modules
CREATE POLICY "modules_select" ON modules FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "modules_insert" ON modules FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "modules_update" ON modules FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "modules_delete" ON modules FOR DELETE
  USING (user_id = auth.uid());

-- Units: inherit permissions from modules
CREATE POLICY "units_select" ON units FOR SELECT
  USING (EXISTS(SELECT 1 FROM modules WHERE modules.id = units.module_id AND modules.user_id = auth.uid()));

CREATE POLICY "units_insert" ON units FOR INSERT
  WITH CHECK (EXISTS(SELECT 1 FROM modules WHERE modules.id = units.module_id AND modules.user_id = auth.uid()));

CREATE POLICY "units_update" ON units FOR UPDATE
  USING (EXISTS(SELECT 1 FROM modules WHERE modules.id = units.module_id AND modules.user_id = auth.uid()));

CREATE POLICY "units_delete" ON units FOR DELETE
  USING (EXISTS(SELECT 1 FROM modules WHERE modules.id = units.module_id AND modules.user_id = auth.uid()));

-- Runs: users can see their own runs
CREATE POLICY "runs_select" ON runs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "runs_insert" ON runs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "runs_update" ON runs FOR UPDATE
  USING (user_id = auth.uid());

-- Knowledge chunks: inherit permissions from modules
CREATE POLICY "knowledge_chunks_select" ON sf_knowledge_chunks FOR SELECT
  USING (EXISTS(SELECT 1 FROM modules WHERE modules.id = sf_knowledge_chunks.module_id AND modules.user_id = auth.uid()));

CREATE POLICY "knowledge_chunks_insert" ON sf_knowledge_chunks FOR INSERT
  WITH CHECK (EXISTS(SELECT 1 FROM modules WHERE modules.id = sf_knowledge_chunks.module_id AND modules.user_id = auth.uid()));

-- Concept relationships: inherit from source chunk
CREATE POLICY "concept_relationships_select" ON sf_concept_relationships FOR SELECT
  USING (EXISTS(
    SELECT 1 FROM sf_knowledge_chunks
    WHERE sf_knowledge_chunks.id = sf_concept_relationships.source_chunk_id
    AND EXISTS(SELECT 1 FROM modules WHERE modules.id = sf_knowledge_chunks.module_id AND modules.user_id = auth.uid())
  ));

-- Quiz items: inherit permissions from units
CREATE POLICY "quiz_items_select" ON quiz_items FOR SELECT
  USING (EXISTS(
    SELECT 1 FROM units
    WHERE units.id = quiz_items.unit_id
    AND EXISTS(SELECT 1 FROM modules WHERE modules.id = units.module_id AND modules.user_id = auth.uid())
  ));

-- Quiz results: users can see their own results
CREATE POLICY "quiz_results_select" ON quiz_results FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "quiz_results_insert" ON quiz_results FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Agent logs: inherit permissions from runs
CREATE POLICY "agent_logs_select" ON agent_logs FOR SELECT
  USING (EXISTS(
    SELECT 1 FROM runs
    WHERE runs.id = agent_logs.run_id
    AND runs.user_id = auth.uid()
  ));
