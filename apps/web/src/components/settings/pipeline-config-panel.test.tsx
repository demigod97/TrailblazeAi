import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { PipelineConfigPanel } from './pipeline-config-panel';
import { toast } from 'sonner';

const mockConfig = {
  id: '00000000-0000-0000-0000-000000000001',
  quiz_only_mode: true,
  skip_completed: false,
  priority_track: 'Admin',
  pipeline_paused: false,
  created_at: '2026-02-20T00:00:00Z',
  updated_at: '2026-02-20T00:00:00Z',
};

describe('PipelineConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: mockConfig }),
    });
  });

  it('renders quiz-only mode toggle reflecting initial config', () => {
    render(<PipelineConfigPanel initialConfig={mockConfig} />);
    const switches = screen.getAllByRole('switch');
    // First switch = quiz-only mode (quiz_only_mode=true → aria-checked="true")
    expect(switches[0]).toBeInTheDocument();
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('renders skip-completed toggle reflecting initial config', () => {
    render(<PipelineConfigPanel initialConfig={mockConfig} />);
    const switches = screen.getAllByRole('switch');
    // Second switch = skip-completed (skip_completed=false → aria-checked="false")
    expect(switches[1]).toBeInTheDocument();
    expect(switches[1]).toHaveAttribute('aria-checked', 'false');
  });

  it('renders priority track input with initial value', () => {
    render(<PipelineConfigPanel initialConfig={mockConfig} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Admin');
  });

  it('renders Save Settings button', () => {
    render(<PipelineConfigPanel initialConfig={mockConfig} />);
    expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
  });

  it('shows "Pipeline mode updated" toast on successful save', async () => {
    render(<PipelineConfigPanel initialConfig={mockConfig} />);
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Pipeline mode updated', { duration: 3000 });
    });
  });

  it('shows error toast when save fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: { message: 'Server error' } }),
    });

    render(<PipelineConfigPanel initialConfig={mockConfig} />);
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Server error', { duration: Infinity });
    });
  });

  it('renders with null config using safe defaults (all unchecked, empty track)', () => {
    render(<PipelineConfigPanel initialConfig={null} />);
    const switches = screen.getAllByRole('switch');
    // Both toggles default to false when config is null
    expect(switches[0]).toHaveAttribute('aria-checked', 'false');
    expect(switches[1]).toHaveAttribute('aria-checked', 'false');
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('');
  });
});
