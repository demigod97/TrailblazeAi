import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    <a href={href} {...props}>{children}</a>,
}));

// Import after mocks
import { Sidebar } from './sidebar';
import { LayoutContext } from './layout-context';
import { usePathname } from 'next/navigation';

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation links', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /knowledge base/i })).toHaveAttribute('href', '/knowledge');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });

  it('marks active page with aria-current', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
    render(<Sidebar />);

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark inactive links with aria-current', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
    render(<Sidebar />);

    const knowledgeLink = screen.getByRole('link', { name: /knowledge base/i });
    expect(knowledgeLink).not.toHaveAttribute('aria-current');
  });

  it('uses aria-label for collapsed mode via prop', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
    render(<Sidebar collapsed={true} />);

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('aria-label', 'Dashboard');
  });

  it('shows labels when context sidebarCollapsed is false', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
    render(
      <LayoutContext.Provider value={{ sidebarCollapsed: false }}>
        <Sidebar />
      </LayoutContext.Provider>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('hides labels when context sidebarCollapsed is true', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
    render(
      <LayoutContext.Provider value={{ sidebarCollapsed: true }}>
        <Sidebar />
      </LayoutContext.Provider>
    );

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Knowledge Base')).not.toBeInTheDocument();
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('aria-label', 'Dashboard');
  });
});
