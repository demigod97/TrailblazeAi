import { PipelineConfigPanel } from '@/components/settings/pipeline-config-panel';
import { RunControlPanel } from '@/components/settings/run-control-panel';

interface PipelineConfig {
  id: string;
  quiz_only_mode: boolean;
  skip_completed: boolean;
  priority_track: string | null;
  pipeline_paused: boolean;
  created_at: string;
  updated_at: string;
}

async function fetchPipelineConfig(): Promise<PipelineConfig | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const response = await fetch(`${apiUrl}/api/pipeline/config`, {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  const config = await fetchPipelineConfig();

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="space-y-8">
        <div className="border rounded-lg p-6">
          <PipelineConfigPanel initialConfig={config} />
        </div>

        <div className="border rounded-lg p-6">
          <RunControlPanel initialPaused={config?.pipeline_paused ?? false} />
        </div>
      </div>
    </div>
  );
}
