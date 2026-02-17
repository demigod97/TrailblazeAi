export const JOB_TYPES = {
  SCRAPE_MODULE: "scrape-module",
  SCRAPE_UNIT: "scrape-unit",
  PROCESS_CONTENT: "process-content",
  ANSWER_QUIZ: "answer-quiz",
  BUILD_KNOWLEDGE: "build-knowledge",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export const MODULE_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type StatusValue = (typeof MODULE_STATUS)[keyof typeof MODULE_STATUS];

export const API_ROUTES = {
  HEALTH: "/health",
  TRAILMIX_IMPORT: "/api/trailmix/import",
  MODULES: "/api/modules",
  QUIZ_ANSWER: "/api/quiz/answer",
  PROGRESS: "/api/progress",
  KNOWLEDGE: "/api/knowledge",
} as const;
