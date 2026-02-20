import { ThreeColumnShell } from '@/components/layout';
import { Sidebar } from '@/components/layout';
import { CommandMenu } from '@/components/layout/command-menu';
import { createClient } from '@/lib/supabase/server';
import { ReviewPanel } from '@/components/quiz-review';
import { PausedBanner } from '@/components/dashboard/paused-banner';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { count } = await supabase
    .from('quiz_results')
    .select('*', { count: 'exact', head: true })
    .is('is_approved', null);

  const hasPendingReviews = (count ?? 0) > 0;

  // Fetch pipeline paused state
  const { data: pipelineConfig } = await supabase
    .from('pipeline_config')
    .select('pipeline_paused')
    .limit(1);

  const isPipelinePaused = (pipelineConfig as unknown as Array<{ pipeline_paused: boolean }> | null)?.[0]?.pipeline_paused ?? false;

  return (
    <>
      <CommandMenu />
      <PausedBanner isPaused={isPipelinePaused} />
      <ThreeColumnShell
        sidebar={<Sidebar />}
        reviewPanel={hasPendingReviews ? <ReviewPanel /> : undefined}
      >
        {children}
      </ThreeColumnShell>
    </>
  );
}
