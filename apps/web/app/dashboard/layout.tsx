import { ThreeColumnShell } from '@/components/layout';
import { Sidebar } from '@/components/layout';
import { CommandMenu } from '@/components/layout/command-menu';
import { createClient } from '@/lib/supabase/server';
import { ReviewPanel } from '@/components/quiz-review';

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

  return (
    <>
      <CommandMenu />
      <ThreeColumnShell
        sidebar={<Sidebar />}
        reviewPanel={hasPendingReviews ? <ReviewPanel /> : undefined}
      >
        {children}
      </ThreeColumnShell>
    </>
  );
}
