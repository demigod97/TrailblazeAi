'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { FC } from 'react';

interface RunControlPanelProps {
  initialPaused: boolean;
}

export const RunControlPanel: FC<RunControlPanelProps> = ({ initialPaused }) => {
  const [isPaused, setIsPaused] = useState(initialPaused);
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const callPipelineEndpoint = async (endpoint: string, onSuccess: () => void) => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/pipeline/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to ${endpoint} pipeline`);
      }

      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${endpoint} pipeline`;
      toast.error(message, { duration: Infinity });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    await callPipelineEndpoint('pause', () => {
      setIsPaused(true);
      toast.success('Pipeline paused');
    });
  };

  const handleResume = async () => {
    await callPipelineEndpoint('resume', () => {
      setIsPaused(false);
      toast.success('Pipeline resumed');
    });
  };

  const handleCancel = async () => {
    await callPipelineEndpoint('cancel', () => {
      setShowCancelDialog(false);
      toast.success('Run cancelled');
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Run Control</h2>

        <div className="space-y-3">
          {!isPaused ? (
            <>
              <Button onClick={handlePause} disabled={isLoading} variant="outline" className="w-full">
                {isLoading ? 'Pausing...' : 'Pause Pipeline'}
              </Button>
              <Button onClick={() => setShowCancelDialog(true)} disabled={isLoading} variant="destructive" className="w-full">
                Cancel Run
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleResume} disabled={isLoading} className="w-full">
                {isLoading ? 'Resuming...' : 'Resume Pipeline'}
              </Button>
              <Button onClick={() => setShowCancelDialog(true)} disabled={isLoading} variant="destructive" className="w-full">
                Cancel Run
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Pipeline Run</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the current pipeline run? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
              {isLoading ? 'Cancelling...' : 'Cancel Run'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
