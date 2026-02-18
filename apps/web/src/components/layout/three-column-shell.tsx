'use client';

import { useEffect, useState } from 'react';
import { LayoutContext } from './layout-context';

type BreakpointState = 'desktop' | 'tablet' | 'mobile';

function getBreakpoint(width: number): BreakpointState {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getGridColumns(isHidden: boolean, isCollapsed: boolean, hasPanel: boolean): string {
  if (isHidden) return hasPanel ? '1fr 340px' : '1fr';
  if (isCollapsed) return hasPanel ? '48px 1fr 340px' : '48px 1fr';
  return hasPanel ? '220px 1fr 340px' : '220px 1fr';
}

export function ThreeColumnShell({ sidebar, children, reviewPanel }: {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  reviewPanel?: React.ReactNode;
}) {
  const [breakpoint, setBreakpoint] = useState<BreakpointState>('desktop');

  useEffect(() => {
    let raf: ReturnType<typeof requestAnimationFrame>;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setBreakpoint(getBreakpoint(window.innerWidth)));
    };
    check();
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('resize', check);
      cancelAnimationFrame(raf);
    };
  }, []);

  const isCollapsed = breakpoint === 'tablet';
  const isHidden = breakpoint === 'mobile';

  return (
    <LayoutContext.Provider value={{ sidebarCollapsed: isCollapsed }}>
      <div
        className="grid min-h-screen"
        style={{
          gridTemplateColumns: getGridColumns(isHidden, isCollapsed, !!reviewPanel),
          transition: 'grid-template-columns 200ms ease',
        }}
      >
        {!isHidden && sidebar && (
          <aside className="border-r bg-card">{sidebar}</aside>
        )}
        <main className="overflow-auto p-6">{children}</main>
        {reviewPanel && (
          <div className="border-l bg-card">{reviewPanel}</div>
        )}
      </div>
    </LayoutContext.Provider>
  );
}
