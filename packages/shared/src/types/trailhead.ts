// Domain types matching database schema (snake_case)
// All interfaces use snake_case to match database column names

export type ModuleStatus = 'pending' | 'scraping' | 'scraped' | 'processing' | 'ready' | 'quizzing' | 'completed' | 'failed';
export type RunStatus = 'active' | 'paused' | 'cancelled' | 'completed' | 'failed';
export type UnitType = 'reading' | 'hands_on' | 'quiz';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';
export type RelationshipType = 'prerequisite' | 'related' | 'related_to' | 'part_of' | 'contradicts' | 'clarifies' | 'extends';
export type AgentType = 'scraper' | 'knowledge' | 'quiz' | 'documentation';
export type ToolType = 'playwright_mcp' | 'rag_search' | 'llm_call' | 'embedding' | 'sf_mcp' | 'stagehand';

export interface TrailMix {
  id: string;
  name: string;
  url: string;
  modules: Module[];
  created_at: string;
}

export interface Module {
  id: string;
  trailmix_id: string;
  name: string;
  url: string;
  status: ModuleStatus;
  priority: number;
  badge_url: string | null;
  badge_earned: boolean;
  retry_count: number;
  failure_reason: string | null;
  type: string | null;
  track: string | null;
  estimated_minutes: number | null;
  unit_count: number | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  module_id: string;
  title: string;
  url: string;
  unit_index: number;
  raw_html: string | null;
  content_markdown: string | null;
  user_id: string | null;
  created_at: string;
  sf_concepts?: unknown | null;
}

export interface Run {
  id: string;
  trailmix_id: string;
  status: RunStatus;
  started_at: string;
  completed_at: string | null;
  total_cost: number | null;
  user_id: string | null;
}

export interface SfKnowledgeChunk {
  id: string;
  module_id: string | null;
  unit_id?: string | null;
  chunk_text: string;
  content_type?: 'explanation' | 'code' | 'quiz' | 'hands_on' | 'reference' | 'definition' | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
  sf_topics?: string[];
  section_header?: string | null;
  embedding: number[] | null;
  confidence_score: number | null;
  source_url: string | null;
  chunk_index: number | null;
  fts: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface SfConceptRelationship {
  id: string;
  source_chunk_id: string | null;
  target_chunk_id: string | null;
  relationship_type: RelationshipType;
  strength: number;
  source_concept: string | null;
  target_concept: string | null;
  module_id: string | null;
  created_at: string;
}

export interface QuizItem {
  id: string;
  unit_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  related_chunk_ids: string[];
  display_order: number | null;
  created_at: string;
}

export interface QuizResult {
  id: string;
  unit_id: string;
  quiz_item_id: string;
  user_id: string | null;
  selected_answer: string | null;
  is_correct: boolean | null;
  confidence_score: number | null;
  reasoning: string | null;
  attempt_number: number;
  answered_at: string;
  created_at: string;
}

export interface AgentLog {
  id: string;
  run_id: string | null;
  agent_type: AgentType;
  tool_type: ToolType;
  query: string;
  raw_output: string | null;
  summary: string | null;
  raw_output_truncated: boolean;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  duration_ms: number;
  confidence_score: number | null;
  related_chunk_ids: string[] | null;
  created_at: string;
}
