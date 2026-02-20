import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { RunControlPanel } from './run-control-panel';
import { toast } from 'sonner';

describe('RunControlPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: { paused: true } }),
    });
  });

  it('renders Pause Pipeline button when not paused', () => {
    render(<RunControlPanel initialPaused={false} />);
    expect(screen.getByRole('button', { name: /pause pipeline/i })).toBeInTheDocument();
  });

  it('does not render Resume Pipeline button when not paused', () => {
    render(<RunControlPanel initialPaused={false} />);
    expect(screen.queryByRole('button', { name: /resume pipeline/i })).not.toBeInTheDocument();
  });

  it('renders Resume Pipeline button when paused', () => {
    render(<RunControlPanel initialPaused={true} />);
    expect(screen.getByRole('button', { name: /resume pipeline/i })).toBeInTheDocument();
  });

  it('does not render Pause Pipeline button when paused', () => {
    render(<RunControlPanel initialPaused={true} />);
    expect(screen.queryByRole('button', { name: /pause pipeline/i })).not.toBeInTheDocument();
  });

  it('renders Cancel Run button regardless of paused state', () => {
    render(<RunControlPanel initialPaused={false} />);
    // The "Cancel Run" button that opens the dialog (not the confirm button inside dialog)
    const cancelButtons = screen.getAllByRole('button', { name: /cancel run/i });
    expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows confirmation AlertDialog when Cancel Run is clicked', () => {
    render(<RunControlPanel initialPaused={false} />);
    // Click the outer "Cancel Run" button to open the dialog
    const cancelButtons = screen.getAllByRole('button', { name: /cancel run/i });
    fireEvent.click(cancelButtons[0]!);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/cancel pipeline run/i)).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });

  it('calls cancel endpoint and shows toast on dialog confirmation', async () => {
    render(<RunControlPanel initialPaused={false} />);

    // Open the dialog
    const cancelButtons = screen.getAllByRole('button', { name: /cancel run/i });
    fireEvent.click(cancelButtons[0]!);

    // Confirm inside the alertdialog
    const dialog = screen.getByRole('alertdialog');
    const confirmButton = within(dialog).getByRole('button', { name: /cancel run/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pipeline/cancel'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(toast.success).toHaveBeenCalledWith('Run cancelled');
    });
  });

  it('calls pause endpoint and shows "Pipeline paused" toast', async () => {
    render(<RunControlPanel initialPaused={false} />);
    fireEvent.click(screen.getByRole('button', { name: /pause pipeline/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pipeline/pause'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(toast.success).toHaveBeenCalledWith('Pipeline paused');
    });
  });

  it('calls resume endpoint and shows "Pipeline resumed" toast', async () => {
    render(<RunControlPanel initialPaused={true} />);
    fireEvent.click(screen.getByRole('button', { name: /resume pipeline/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pipeline/resume'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(toast.success).toHaveBeenCalledWith('Pipeline resumed');
    });
  });
});
