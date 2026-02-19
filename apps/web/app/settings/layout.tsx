import { CommandMenu } from '@/components/layout/command-menu';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CommandMenu />
      {children}
    </>
  );
}
