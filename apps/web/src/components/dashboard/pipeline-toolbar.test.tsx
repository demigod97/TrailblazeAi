import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server action
vi.mock('../../../app/dashboard/actions', () => ({
  importTrailmix: vi.fn(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Import after mocks
import PipelineToolbar from './pipeline-toolbar';
import { importTrailmix } from '../../../app/dashboard/actions';
import { toast } from 'sonner';

describe('PipelineToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders URL input with correct placeholder', () => {
    render(<PipelineToolbar />);
    const input = screen.getByPlaceholderText(/Paste a Trailhead trail or module URL/i);
    expect(input).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<PipelineToolbar />);
    const button = screen.getByRole('button', { name: /Import/i });
    expect(button).toBeInTheDocument();
  });

  it('shows validation error when submitted with non-Trailhead URL', async () => {
    const user = userEvent.setup();
    render(<PipelineToolbar />);

    const input = screen.getByPlaceholderText(/Paste a Trailhead trail or module URL/i);
    await user.type(input, 'https://google.com');
    await user.click(screen.getByRole('button', { name: /Import/i }));

    expect(await screen.findByText(/valid Trailhead URL/i)).toBeInTheDocument();
    expect(vi.mocked(importTrailmix)).not.toHaveBeenCalled();
  });

  it('calls importTrailmix on valid URL submit', async () => {
    vi.mocked(importTrailmix).mockResolvedValue({ modules: [] });
    const user = userEvent.setup();
    render(<PipelineToolbar />);

    const input = screen.getByPlaceholderText(/Paste a Trailhead trail or module URL/i);
    await user.type(input, 'https://trailhead.salesforce.com/trails/test');
    await user.click(screen.getByRole('button', { name: /Import/i }));

    expect(vi.mocked(importTrailmix)).toHaveBeenCalledOnce();
  });

  it('shows spinner in button while loading', async () => {
    vi.mocked(importTrailmix).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ modules: [] }), 100)),
    );
    const user = userEvent.setup();
    render(<PipelineToolbar />);

    const input = screen.getByPlaceholderText(/Paste a Trailhead trail or module URL/i);
    await user.type(input, 'https://trailhead.salesforce.com/trails/test');
    await user.click(screen.getByRole('button', { name: /Import/i }));

    // Look for the spinner SVG element with animate-spin class
    const spinnerSvg = document.querySelector('svg.animate-spin');
    expect(spinnerSvg).toBeInTheDocument();
  });

  it('shows toast error when action returns error', async () => {
    vi.mocked(importTrailmix).mockResolvedValue({
      error: 'Import failed — check URL',
    });
    const user = userEvent.setup();
    render(<PipelineToolbar />);

    const input = screen.getByPlaceholderText(/Paste a Trailhead trail or module URL/i);
    await user.type(input, 'https://trailhead.salesforce.com/trails/test');
    await user.click(screen.getByRole('button', { name: /Import/i }));

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Import failed — check URL');
  });

  it('resets form on successful submit', async () => {
    vi.mocked(importTrailmix).mockResolvedValue({ modules: [] });
    const user = userEvent.setup();
    render(<PipelineToolbar />);

    const input = screen.getByPlaceholderText(/Paste a Trailhead trail or module URL/i) as HTMLInputElement;
    await user.type(input, 'https://trailhead.salesforce.com/trails/test');
    await user.click(screen.getByRole('button', { name: /Import/i }));

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(input.value).toBe('');
  });

  it('clears validation error on successful submit', async () => {
    vi.mocked(importTrailmix).mockResolvedValue({ modules: [] });
    const user = userEvent.setup();
    render(<PipelineToolbar />);

    // First submit with invalid URL to show error
    const input = screen.getByPlaceholderText(/Paste a Trailhead trail or module URL/i);
    await user.type(input, 'https://google.com');
    await user.click(screen.getByRole('button', { name: /Import/i }));

    expect(await screen.findByText(/valid Trailhead URL/i)).toBeInTheDocument();

    // Clear and submit with valid URL
    await user.clear(input);
    await user.type(input, 'https://trailhead.salesforce.com/trails/test');
    await user.click(screen.getByRole('button', { name: /Import/i }));

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.queryByText(/valid Trailhead URL/i)).not.toBeInTheDocument();
  });
});
