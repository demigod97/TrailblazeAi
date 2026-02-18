// Application constants matching the architecture specification

export const MODULE_STATUS = {
  PENDING: 'pending',
  SCRAPING: 'scraping',
  SCRAPED: 'scraped',
  PROCESSING: 'processing',
  READY: 'ready',
  QUIZZING: 'quizzing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ModuleStatusValue = (typeof MODULE_STATUS)[keyof typeof MODULE_STATUS];

export const RUN_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type RunStatusValue = (typeof RUN_STATUS)[keyof typeof RUN_STATUS];

export const JOB_TYPES = {
  SCRAPE_MODULE: 'scrape-module',
  EXTRACT_CONTENT: 'extract-content',
  IDENTIFY_CONCEPTS: 'identify-concepts',
  CHUNK_CONTENT: 'chunk-content',
  GENERATE_EMBEDDINGS: 'generate-embeddings',
  BUILD_RELATIONSHIPS: 'build-relationships',
  ANSWER_QUIZ: 'answer-quiz',
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export const API_ROUTES = {
  HEALTH: '/health',
  MODULES: '/api/modules',
  UNITS: '/api/units',
  RUNS: '/api/runs',
  QUIZ_ITEMS: '/api/quiz-items',
  QUIZ_RESULTS: '/api/quiz-results',
  KNOWLEDGE: '/api/knowledge',
  AGENT_LOGS: '/api/agent-logs',
} as const;

export type ApiRoute = (typeof API_ROUTES)[keyof typeof API_ROUTES];
