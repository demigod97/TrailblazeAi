import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

// Mock Sonner (toast library)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Default pipeline config returned by the API
const mockPipelineConfig = {
  id: '00000000-0000-0000-0000-000000000001',
  quiz_only_mode: true,
  skip_completed: false,
  priority_track: 'Admin',
  pipeline_paused: false,
  created_at: '2026-02-20T00:00:00Z',
  updated_at: '2026-02-20T00:00:00Z',
};

// Mock the client components with data-testids so the page tests can verify rendering and prop propagation.
// The actual component behaviour is tested in component-level tests.
vi.mock('@/components/settings/pipeline-config-panel', () => ({
  PipelineConfigPanel: ({ initialConfig }: { initialConfig: Record<string, unknown> | null }) => (
    <div data-testid="pipeline-config-panel">
      <input
        data-testid="quiz-only-mode"
        type="checkbox"
        defaultChecked={!!initialConfig?.quiz_only_mode}
        readOnly
      />
      <input
        data-testid="skip-completed"
        type="checkbox"
        defaultChecked={!!initialConfig?.skip_completed}
        readOnly
      />
      <input
        data-testid="priority-track"
        defaultValue={(initialConfig?.priority_track as string) ?? ''}
        readOnly
      />
      <button data-testid="save-settings">Save</button>
    </div>
  ),
}));

vi.mock('@/components/settings/run-control-panel', () => ({
  RunControlPanel: () => (
    <div data-testid="run-control-panel">
      <button data-testid="pause-pipeline">Pause Pipeline</button>
      <button data-testid="resume-pipeline">Resume Pipeline</button>
      <button data-testid="cancel-run">Cancel Run</button>
    </div>
  ),
}));

// Import AFTER mocks so the module uses mocked dependencies
import SettingsPage from './page';

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global.fetch to return pipeline config (used by fetchPipelineConfig in the Server Component)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: mockPipelineConfig }),
    });
  });

  it('renders Settings heading', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('renders quiz-only mode toggle reflecting fetched config', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    const toggle = screen.getByTestId('quiz-only-mode') as HTMLInputElement;
    expect(toggle).toBeInTheDocument();
    // mockPipelineConfig.quiz_only_mode = true → toggle is checked
    expect(toggle.checked).toBe(true);
  });

  it('renders skip-completed toggle', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByTestId('skip-completed')).toBeInTheDocument();
  });

  it('renders priority track input with value from fetched config', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    const input = screen.getByTestId('priority-track') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Admin');
  });

  it('renders pause pipeline button', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByTestId('pause-pipeline')).toBeInTheDocument();
  });

  it('renders resume pipeline button', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByTestId('resume-pipeline')).toBeInTheDocument();
  });

  it('renders cancel run button', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByTestId('cancel-run')).toBeInTheDocument();
  });
});
