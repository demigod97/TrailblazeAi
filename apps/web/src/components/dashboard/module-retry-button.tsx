'use client';

import { useState } from 'react';
import { retryModule } from '../../../app/dashboard/actions';

export default function ModuleRetryButton({ moduleId }: { moduleId: string }) {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    await retryModule(moduleId);
    setLoading(false);
  };

  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      className="text-xs font-medium px-2 py-1 rounded border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Retrying...' : 'Retry'}
    </button>
  );
}
