'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { FC } from 'react';

interface PipelineConfig {
  id: string;
  quiz_only_mode: boolean;
  skip_completed: boolean;
  priority_track: string | null;
  pipeline_paused: boolean;
  created_at: string;
  updated_at: string;
}

interface PipelineConfigPanelProps {
  initialConfig: PipelineConfig | null;
}

export const PipelineConfigPanel: FC<PipelineConfigPanelProps> = ({ initialConfig }) => {
  const [quizOnlyMode, setQuizOnlyMode] = useState(initialConfig?.quiz_only_mode ?? false);
  const [skipCompleted, setSkipCompleted] = useState(initialConfig?.skip_completed ?? false);
  const [priorityTrack, setPriorityTrack] = useState(initialConfig?.priority_track ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/pipeline/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          quiz_only_mode: quizOnlyMode,
          skip_completed: skipCompleted,
          priority_track: priorityTrack || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save settings');
      }

      toast.success('Pipeline mode updated', { duration: 3000 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      toast.error(message, { duration: Infinity });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Pipeline Configuration</h2>

        <div className="space-y-4">
          {/* Quiz-only Mode Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm font-medium">Quiz-only Mode</label>
              <p className="text-xs text-gray-500">Skip content scraping and only process quizzes</p>
            </div>
            <Switch checked={quizOnlyMode} onCheckedChange={setQuizOnlyMode} />
          </div>

          {/* Skip Completed Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm font-medium">Skip Completed</label>
              <p className="text-xs text-gray-500">Skip modules that are already marked as completed</p>
            </div>
            <Switch checked={skipCompleted} onCheckedChange={setSkipCompleted} />
          </div>

          {/* Priority Track Input */}
          <div className="py-2">
            <label className="text-sm font-medium block mb-2">Priority Track</label>
            <Input
              type="text"
              placeholder="e.g., Admin, Developer, Architect"
              value={priorityTrack}
              onChange={(e) => setPriorityTrack(e.target.value)}
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500 mt-1">
              Modules with this track will be processed with higher priority
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
