export interface TrailMix {
  id: string;
  name: string;
  url: string;
  modules: Module[];
  createdAt: string;
}

export interface Module {
  id: string;
  trailMixId: string;
  name: string;
  url: string;
  estimatedMinutes: number;
  units: Unit[];
  status: ModuleStatus;
}

export type ModuleStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Unit {
  id: string;
  moduleId: string;
  name: string;
  url: string;
  type: UnitType;
  content: string | null;
  status: ModuleStatus;
}

export type UnitType = "reading" | "hands_on" | "quiz";

export interface Quiz {
  id: string;
  unitId: string;
  questions: Question[];
  attempts: number;
  passed: boolean;
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  options: string[];
  correctAnswer: string | null;
  selectedAnswer: string | null;
}

export interface KnowledgeEntry {
  id: string;
  moduleId: string;
  topic: string;
  content: string;
  embedding: number[] | null;
}

export interface ProgressSummary {
  totalModules: number;
  completedModules: number;
  totalUnits: number;
  completedUnits: number;
  quizzesPassed: number;
  quizzesFailed: number;
  accuracy: number;
}
