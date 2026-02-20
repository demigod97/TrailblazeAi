'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { FC } from 'react';

interface PausedBannerProps {
  isPaused: boolean;
}

export const PausedBanner: FC<PausedBannerProps> = ({ isPaused }) => {
  const router = useRouter();
  const [isResuming, setIsResuming] = useState(false);

  const handleResume = async () => {
    setIsResuming(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/pipeline/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to resume pipeline');
      }

      toast.success('Pipeline resumed');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume pipeline';
      toast.error(message);
    } finally {
      setIsResuming(false);
    }
  };

  if (!isPaused) {
    return null;
  }

  return (
    <div className="w-full bg-amber-100 dark:bg-amber-900/20 border-b border-amber-300 dark:border-amber-700 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">⚠</span>
        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Pipeline paused</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleResume}
        disabled={isResuming}
        className="text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800/40"
      >
        {isResuming ? 'Resuming...' : 'Resume'}
      </Button>
    </div>
  );
};
