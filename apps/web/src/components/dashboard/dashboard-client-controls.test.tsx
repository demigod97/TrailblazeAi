import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardClientControls } from './dashboard-client-controls';
import type { Module } from '@trailblaze/shared';

// Mock child components to isolate DashboardClientControls logic
vi.mock('./filter-chips', () => ({
  default: ({
    value,
    counts,
    onChange,
  }: {
    value: string;
    counts: Record<string, number>;
    onChange: (v: string) => void;
  }) => (
    <div data-testid="filter-chips" data-value={value}>
      <button onClick={() => onChange('all')}>All ({counts.all})</button>
      <button onClick={() => onChange('active')}>Active ({counts.active})</button>
      <button onClick={() => onChange('error')}>Error ({counts.error})</button>
      <button onClick={() => onChange('done')}>Done ({counts.done})</button>
    </div>
  ),
}));

vi.mock('./module-row', () => ({
  default: ({ module }: { module: Module }) => (
    <div data-testid="module-row" data-status={module.status}>
      {module.name}
    </div>
  ),
}));

function makeModule(overrides: Partial<Module> & { id: string; name: string; status: Module['status'] }): Module {
  return {
    trailmix_id: 'trailmix-1',
    url: 'https://example.com',
    priority: 1,
    badge_url: null,
    badge_earned: false,
    retry_count: 0,
    failure_reason: null,
    type: null,
    track: null,
    estimated_minutes: null,
    unit_count: null,
    user_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const defaultCounts = { all: 4, active: 1, error: 1, done: 1 };

const testModules: Module[] = [
  makeModule({ id: '1', name: 'Pending Module', status: 'pending' }),
  makeModule({ id: '2', name: 'Scraping Module', status: 'scraping' }),
  makeModule({ id: '3', name: 'Failed Module', status: 'failed' }),
  makeModule({ id: '4', name: 'Completed Module', status: 'completed' }),
];

describe('DashboardClientControls', () => {
  it('renders all modules when filter is "all" (default)', () => {
    render(<DashboardClientControls modules={testModules} statCounts={defaultCounts} />);

    const rows = screen.getAllByTestId('module-row');
    expect(rows).toHaveLength(4);
  });

  it('renders FilterChips with initial "all" filter', () => {
    render(<DashboardClientControls modules={testModules} statCounts={defaultCounts} />);

    const chips = screen.getByTestId('filter-chips');
    expect(chips).toHaveAttribute('data-value', 'all');
  });

  it('shows only active modules (scraping/scraped/processing) when "active" filter selected', () => {
    render(<DashboardClientControls modules={testModules} statCounts={defaultCounts} />);

    fireEvent.click(screen.getByText(/Active/));

    const rows = screen.getAllByTestId('module-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Scraping Module');
  });

  it('does NOT show quizzing modules under "active" filter (AC1/AC3 spec: active = scraping+scraped+processing only)', () => {
    const modulesWithQuizzing: Module[] = [
      makeModule({ id: '1', name: 'Scraping Module', status: 'scraping' }),
      makeModule({ id: '2', name: 'Quizzing Module', status: 'quizzing' }),
    ];
    render(<DashboardClientControls modules={modulesWithQuizzing} statCounts={{ all: 2, active: 1, error: 0, done: 0 }} />);

    fireEvent.click(screen.getByText(/Active/));

    const rows = screen.getAllByTestId('module-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Scraping Module');
  });

  it('shows only failed modules when "error" filter selected', () => {
    render(<DashboardClientControls modules={testModules} statCounts={defaultCounts} />);

    fireEvent.click(screen.getByText(/Error/));

    const rows = screen.getAllByTestId('module-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Failed Module');
  });

  it('shows only completed modules when "done" filter selected', () => {
    render(<DashboardClientControls modules={testModules} statCounts={defaultCounts} />);

    fireEvent.click(screen.getByText(/Done/));

    const rows = screen.getAllByTestId('module-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Completed Module');
  });

  it('switching back to "all" shows all modules again', () => {
    render(<DashboardClientControls modules={testModules} statCounts={defaultCounts} />);

    fireEvent.click(screen.getByText(/Error/));
    expect(screen.getAllByTestId('module-row')).toHaveLength(1);

    fireEvent.click(screen.getByText(/All/));
    expect(screen.getAllByTestId('module-row')).toHaveLength(4);
  });

  it('renders empty list when no modules match the active filter', () => {
    const modules = [makeModule({ id: '1', name: 'Pending Module', status: 'pending' })];
    render(<DashboardClientControls modules={modules} statCounts={{ all: 1, active: 0, error: 0, done: 0 }} />);

    fireEvent.click(screen.getByText(/Error/));

    expect(screen.queryAllByTestId('module-row')).toHaveLength(0);
  });
});
