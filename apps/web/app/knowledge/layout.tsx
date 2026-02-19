import { CommandMenu } from '@/components/layout/command-menu';

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CommandMenu />
      {children}
    </>
  );
}
