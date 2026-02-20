import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import type { Module } from '@trailblaze/shared';

// Chainable mock factory: supports method chaining AND direct await (thenable)
function makeChain(result: { data: unknown; error: unknown }) {
  const p = Promise.resolve(result);
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve(result),
    // Make the chain thenable so `await query` works
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return chain;
}

// vi.hoisted() ensures these are available when the vi.mock factory runs (factories are hoisted)
const { mockSupabase, getFromImpl } = vi.hoisted(() => {
  let fromImpl: (table: string) => unknown = () => ({ data: null, error: null });
  const mockSupabase = { from: vi.fn((table: string) => fromImpl(table)) };
  const getFromImpl = { set: (fn: (table: string) => unknown) => { fromImpl = fn; } };
  return { mockSupabase, getFromImpl };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Stub heavy client components so the async RSC renders synchronously
vi.mock('@/components/dashboard', () => ({
  PipelineToolbar: () => <div data-testid="pipeline-toolbar" />,
  StatCard: ({ label, value }: { label: string; value: string | number }) => (
    <div data-testid="stat-card" data-label={label}>
      {String(value)}
    </div>
  ),
  // Exposes sessionExpired via data attribute so tests can assert prop propagation
  DashboardRealtimeWrapper: vi.fn(
    ({ children, sessionExpired }: { children: React.ReactNode; sessionExpired?: boolean }) => (
      <div data-testid="realtime-wrapper" data-session-expired={String(sessionExpired ?? false)}>
        {children}
      </div>
    ),
  ),
  DashboardClientControls: ({
    modules,
    statCounts,
  }: {
    modules: Module[];
    statCounts: { all: number; active: number; error: number; done: number };
  }) => (
    <div
      data-testid="dashboard-client-controls"
      data-module-count={modules.length}
      data-stat-all={statCounts.all}
      data-stat-active={statCounts.active}
      data-stat-error={statCounts.error}
      data-stat-done={statCounts.done}
      data-first-module-status={modules[0]?.status ?? ''}
    />
  ),
}));

// Import AFTER mocks so that the module uses mocked versions
import DashboardPage from './page';

function makeModule(overrides: { id: string; name: string; status: Module['status'] } & Partial<Module>): Module {
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

const testModules: Module[] = [
  makeModule({ id: '1', name: 'Ready Module', status: 'ready', estimated_minutes: 30 }),
  makeModule({ id: '2', name: 'Scraping Module', status: 'scraping', estimated_minutes: 60 }),
  makeModule({ id: '3', name: 'Quizzing Module', status: 'quizzing', estimated_minutes: 15 }),
  makeModule({ id: '4', name: 'Failed Module', status: 'failed', estimated_minutes: 20 }),
  makeModule({ id: '5', name: 'Completed Module', status: 'completed', estimated_minutes: 45 }),
];

beforeEach(() => {
  vi.clearAllMocks();
  // Default: active run + modules
  getFromImpl.set((table: string) => {
    if (table === 'runs') return makeChain({ data: { trailmix_id: 'trailmix-1' }, error: null });
    if (table === 'modules') return makeChain({ data: testModules, error: null });
    return makeChain({ data: null, error: null });
  });
});

describe('DashboardPage', () => {
  it('renders 5 StatCards when modules are loaded', async () => {
    const jsx = await DashboardPage();
    render(jsx);

    const cards = screen.getAllByTestId('stat-card');
    expect(cards).toHaveLength(5);
  });

  it('renders Total Modules StatCard with correct count', async () => {
    const jsx = await DashboardPage();
    render(jsx);

    const cards = screen.getAllByTestId('stat-card');
    const totalCard = cards.find((c) => c.getAttribute('data-label') === 'Total Modules');
    expect(totalCard).toBeDefined();
    expect(totalCard!.textContent).toBe('5');
  });

  it('counts scraping + scraped + processing in Active StatCard (not quizzing)', async () => {
    const jsx = await DashboardPage();
    render(jsx);

    const cards = screen.getAllByTestId('stat-card');
    const activeCard = cards.find((c) => c.getAttribute('data-label') === 'Active');
    // scraping (1) only — quizzing is NOT counted per AC1 spec
    expect(activeCard?.textContent).toBe('1');
  });

  it('counts completed modules in Completed StatCard', async () => {
    const jsx = await DashboardPage();
    render(jsx);

    const cards = screen.getAllByTestId('stat-card');
    const completedCard = cards.find((c) => c.getAttribute('data-label') === 'Completed');
    expect(completedCard?.textContent).toBe('1');
  });

  it('renders Estimated Time StatCard with formatted total minutes', async () => {
    const jsx = await DashboardPage();
    render(jsx);

    const cards = screen.getAllByTestId('stat-card');
    const timeCard = cards.find((c) => c.getAttribute('data-label') === 'Estimated Time');
    // testModules: 30 + 60 + 15 + 20 + 45 = 170 min = 2h 50m
    expect(timeCard?.textContent).toBe('2h 50m');
  });

  it('renders empty state with PipelineToolbar when no active trailmix', async () => {
    getFromImpl.set((table: string) => {
      if (table === 'runs') return makeChain({ data: null, error: null });
      return makeChain({ data: [], error: null });
    });

    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByTestId('pipeline-toolbar')).toBeInTheDocument();
    expect(screen.queryAllByTestId('stat-card')).toHaveLength(0);
  });

  it('passes all modules and correct statCounts to DashboardClientControls', async () => {
    const jsx = await DashboardPage();
    render(jsx);

    const controls = screen.getByTestId('dashboard-client-controls');
    expect(controls).toHaveAttribute('data-module-count', '5');
    expect(controls).toHaveAttribute('data-stat-all', '5');
    expect(controls).toHaveAttribute('data-stat-active', '1'); // scraping only (AC1: scraping+scraped+processing)
    expect(controls).toHaveAttribute('data-stat-error', '1'); // failed
    expect(controls).toHaveAttribute('data-stat-done', '1'); // completed
  });

  it('sorts modules so ready appears before pending (AC5 sort order)', async () => {
    // Provide modules in reverse-priority order: pending first, then ready
    const scrambled = [
      makeModule({ id: 'p1', name: 'Pending First', status: 'pending' }),
      makeModule({ id: 'r1', name: 'Ready Second', status: 'ready' }),
    ];
    getFromImpl.set((table: string) => {
      if (table === 'runs') return makeChain({ data: { trailmix_id: 'trailmix-1' }, error: null });
      if (table === 'modules') return makeChain({ data: scrambled, error: null });
      return makeChain({ data: null, error: null });
    });

    const jsx = await DashboardPage();
    render(jsx);

    const controls = screen.getByTestId('dashboard-client-controls');
    // After sortModules: ready (order=0) must come before pending (order=2)
    expect(controls).toHaveAttribute('data-first-module-status', 'ready');
  });

  it('skips modules DB query when activeTrailmixId is null', async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === 'runs') return makeChain({ data: null, error: null });
      return makeChain({ data: [], error: null });
    });
    mockSupabase.from = mockFrom;

    const jsx = await DashboardPage();
    render(jsx);

    const modulesCalls = mockFrom.mock.calls.filter(([t]: [string]) => t === 'modules');
    expect(modulesCalls).toHaveLength(0);
  });

  it('passes sessionExpired=true to DashboardRealtimeWrapper when a module has failure_reason=session_expired', async () => {
    const sessionExpiredModule = makeModule({
      id: 'se-1',
      name: 'Session Expired Module',
      status: 'failed',
      failure_reason: 'session_expired',
    });

    // Override from directly (pattern from "skips modules DB query" test) to ensure isolation
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'runs') return makeChain({ data: { trailmix_id: 'trailmix-1' }, error: null });
      if (table === 'modules') return makeChain({ data: [sessionExpiredModule], error: null });
      return makeChain({ data: null, error: null });
    });

    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByTestId('realtime-wrapper')).toHaveAttribute('data-session-expired', 'true');
  });

  it('renders Badges Earned StatCard with correct count', async () => {
    const modulesWithBadges = [
      makeModule({ id: '1', name: 'Module 1', status: 'completed', badge_earned: true }),
      makeModule({ id: '2', name: 'Module 2', status: 'completed', badge_earned: true }),
      makeModule({ id: '3', name: 'Module 3', status: 'ready', badge_earned: false }),
    ];

    // Use direct mockSupabase.from override (prior test may have replaced the from reference)
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'runs') return makeChain({ data: { trailmix_id: 'trailmix-1' }, error: null });
      if (table === 'modules') return makeChain({ data: modulesWithBadges, error: null });
      return makeChain({ data: null, error: null });
    });

    const jsx = await DashboardPage();
    render(jsx);

    const cards = screen.getAllByTestId('stat-card');
    const badgesCard = cards.find((c) => c.getAttribute('data-label') === 'Badges Earned');
    expect(badgesCard).toBeDefined();
    expect(badgesCard!.textContent).toBe('2');
  });
});
