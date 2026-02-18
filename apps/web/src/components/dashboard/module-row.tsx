import type { Module, ModuleStatus } from '@trailblaze/shared';
import ModuleRetryButton from './module-retry-button';

interface ModuleRowProps {
  module: Module;
}

const SCRAPE_MODULE_RETRY_LIMIT = 3;

const statusColorMap: Record<ModuleStatus, string> = {
  pending: 'var(--status-queued)',
  scraping: 'var(--status-scraping)',
  scraped: 'var(--status-embedding)',
  processing: 'var(--status-processing)',
  ready: 'var(--status-quiz-ready)',
  quizzing: 'var(--status-processing)',
  completed: 'var(--status-completed)',
  failed: 'var(--status-error)',
};

const statusTextMap: Record<ModuleStatus, string> = {
  pending: 'Queued',
  scraping: 'Scraping',
  scraped: 'Scraped',
  processing: 'Processing',
  ready: 'Quiz Ready',
  quizzing: 'Quizzing',
  completed: 'Completed',
  failed: 'Failed',
};

export default function ModuleRow({ module }: ModuleRowProps) {
  const statusColor = statusColorMap[module.status];
  const isFailed = module.status === 'failed';
  const isCompleted = module.status === 'completed';
  const isSessionExpired = module.failure_reason === 'session_expired';

  const statusText = isFailed && isSessionExpired
    ? 'Session Expired'
    : isFailed
      ? `Failed (attempt ${module.retry_count}/${SCRAPE_MODULE_RETRY_LIMIT})`
      : statusTextMap[module.status];

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-md border ${isCompleted ? 'opacity-60' : ''}`}
    >
      <div className="flex-1">
        <p className="font-medium">{module.name}</p>
        {module.track && (
          <p className="text-sm text-muted-foreground">{module.track}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full border transition-colors duration-150 ease"
          style={{
            color: statusColor,
            borderColor: statusColor,
          }}
        >
          {statusText}
        </span>
        {isFailed && <ModuleRetryButton moduleId={module.id} />}
      </div>
    </div>
  );
}
