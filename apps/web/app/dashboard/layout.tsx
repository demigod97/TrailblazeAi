import { ThreeColumnShell } from '@/components/layout';
import { Sidebar } from '@/components/layout';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThreeColumnShell sidebar={<Sidebar />}>
      {children}
    </ThreeColumnShell>
  );
}
