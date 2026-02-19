import { ThreeColumnShell } from '@/components/layout';
import { Sidebar } from '@/components/layout';
import { CommandMenu } from '@/components/layout/command-menu';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <CommandMenu />
      <ThreeColumnShell sidebar={<Sidebar />}>{children}</ThreeColumnShell>
    </>
  );
}
