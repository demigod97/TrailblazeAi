import type { Module } from '@trailblaze/shared';
import { createClient } from '@/lib/supabase/server';
import { PipelineToolbar, StatCard, DashboardRealtimeWrapper, DashboardClientControls } from '@/components/dashboard';

function hasTrailmixId(data: unknown): data is { trailmix_id: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'trailmix_id' in data &&
    typeof (data as { trailmix_id: unknown }).trailmix_id === 'string'
  );
}

// Runtime guard for Supabase module rows — avoids `as Module[]` cast over the `never` placeholder type
function isModuleArray(data: unknown): data is Module[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>)['id'] === 'string' &&
        typeof (item as Record<string, unknown>)['status'] === 'string',
    )
  );
}

function formatEstimatedTime(totalMinutes: number): string {
  if (totalMinutes === 0) return '—';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function sortModules(modules: Module[]): Module[] {
  // Sort order: ready → active → pending → completed
  const statusOrder: Record<Module['status'], number> = {
    ready: 0,
    scraping: 1,
    scraped: 1,
    processing: 1,
    pending: 2,
    completed: 3,
    quizzing: 1,
    failed: 2,
  };

  return [...modules].sort((a, b) => {
    const aOrder = statusOrder[a.status];
    const bOrder = statusOrder[b.status];
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    // Within same group, sort by priority ASC
    return a.priority - b.priority;
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get active trailmix (most recent non-completed run)
  const { data: activeRun } = await supabase
    .from('runs')
    .select('trailmix_id')
    .in('status', ['active', 'paused'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Escape the Supabase `never` placeholder type before applying the runtime type guard
  const activeRunData: unknown = activeRun as unknown;
  const activeTrailmixId = hasTrailmixId(activeRunData) ? activeRunData.trailmix_id : null;

  // Fetch modules - only for the active trailmix to avoid mixing historical data
  let moduleList: Module[] = [];
  if (activeTrailmixId) {
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('*')
      .eq('trailmix_id', activeTrailmixId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (modulesError) {
      console.error('Failed to fetch modules:', modulesError);
    }
    moduleList = (!modulesError && isModuleArray(modules)) ? modules : [];
  }

  // Sort modules per AC5 order
  const sortedModules = sortModules(moduleList);

  // Check for session expiry
  const sessionExpired = moduleList.some((m) => m.failure_reason === 'session_expired');

  // Calculate stat card values
  const totalCount = moduleList.length;
  const activeCount = moduleList.filter((m) => ['scraping', 'scraped', 'processing'].includes(m.status)).length;
  const completedCount = moduleList.filter((m) => m.status === 'completed').length;
  const estimatedMinutes = moduleList.reduce((sum, m) => sum + (m.estimated_minutes ?? 0), 0);

  const badgeCount = moduleList.filter((m) => m.badge_earned).length;

  const statCounts = {
    all: totalCount,
    active: activeCount,
    error: moduleList.filter((m) => m.status === 'failed').length,
    done: completedCount,
  };

  return (
    <DashboardRealtimeWrapper trailmixId={activeTrailmixId} sessionExpired={sessionExpired}>
      <div className="space-y-6">
        {moduleList.length === 0 ? (
          // Empty state with centered toolbar
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Get Started</h2>
              <p className="text-muted-foreground">
                Import a Trailmix to begin your journey
              </p>
            </div>
            <PipelineToolbar />
          </div>
        ) : (
          // Modules exist - show stats, toolbar, and list
          <>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Modules</h2>
              <PipelineToolbar />
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <StatCard label="Total Modules" value={totalCount} />
              <StatCard label="Active" value={activeCount} />
              <StatCard label="Completed" value={completedCount} />
              <StatCard label="Badges Earned" value={badgeCount} />
              <StatCard label="Estimated Time" value={formatEstimatedTime(estimatedMinutes)} />
            </div>

            {/* Client-side filtering and module list */}
            <DashboardClientControls modules={sortedModules} statCounts={statCounts} />
          </>
        )}
      </div>
    </DashboardRealtimeWrapper>
  );
}
