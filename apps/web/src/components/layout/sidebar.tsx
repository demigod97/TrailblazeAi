'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, Settings } from 'lucide-react';
import { useLayout } from './layout-context';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ collapsed: collapsedProp }: { collapsed?: boolean }) {
  const { sidebarCollapsed } = useLayout();
  const collapsed = collapsedProp ?? sidebarCollapsed;
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1 p-2">
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            aria-label={collapsed ? label : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors
              ${isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
