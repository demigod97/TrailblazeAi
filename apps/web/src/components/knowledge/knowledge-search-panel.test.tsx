import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KnowledgeSearchPanel } from './knowledge-search-panel';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockResult = {
  id: 'chunk-1',
  chunk_text: 'Apex triggers allow custom actions before or after DML events on specific objects.',
  content_type: 'explanation',
  difficulty: 'intermediate',
  sf_topics: ['Apex', 'Triggers'],
  section_header: 'Understanding Apex Triggers',
  module_id: 'module-1',
  unit_id: 'unit-1',
  module_name: 'Apex Fundamentals',
  unit_title: 'Apex Triggers Deep Dive',
  relevance_score: 0.95,
  related_chunk_ids: [],
};

const mockResponse = {
  data: { results: [mockResult], count: 1, offset: 0, limit: 20 },
  error: null,
};

describe('KnowledgeSearchPanel', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input that is focused on mount', () => {
    render(<KnowledgeSearchPanel />);
    const input = screen.getByRole('searchbox', { name: /search knowledge base/i });
    expect(input).toBeInTheDocument();
    expect(input).toBe(document.activeElement);
  });

  it('shows empty state when no query', () => {
    render(<KnowledgeSearchPanel />);
    expect(screen.getByText(/process some trailhead modules/i)).toBeInTheDocument();
  });

  it('does not call fetch immediately when user types', () => {
    render(<KnowledgeSearchPanel />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'apex' } });
    // No debounce elapsed yet — fetch should NOT be called
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls fetch after 300ms debounce when user types', async () => {
    render(<KnowledgeSearchPanel />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'apex' } });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/knowledge/search?q=apex'),
          expect.any(Object),
        );
      },
      { timeout: 600 },
    );
  });

  it('renders result cards from API response', async () => {
    render(<KnowledgeSearchPanel />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'apex triggers' } });

    await waitFor(
      () => {
        expect(screen.getByText('Understanding Apex Triggers')).toBeInTheDocument();
        expect(screen.getByText('Apex Fundamentals')).toBeInTheDocument();
        expect(screen.getByText('0.950')).toBeInTheDocument();
      },
      { timeout: 600 },
    );
  });

  it('shows detail panel when a result is clicked', async () => {
    render(<KnowledgeSearchPanel />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'apex' } });

    await waitFor(
      () => {
        screen.getByText('Understanding Apex Triggers');
      },
      { timeout: 600 },
    );

    fireEvent.click(screen.getByText('Understanding Apex Triggers'));
    // section_header rendered as <h2> only in ChunkDetail — confirms detail panel opened
    expect(screen.getByRole('heading', { name: 'Understanding Apex Triggers' })).toBeInTheDocument();
  });

  it('shows loading state while fetch is in progress', async () => {
    // Fetch never resolves — component stays in loading state
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<KnowledgeSearchPanel />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'apex' } });

    await waitFor(
      () => {
        expect(document.querySelector('.animate-pulse')).toBeTruthy();
      },
      { timeout: 600 },
    );
  });

  it('shows error state when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    render(<KnowledgeSearchPanel />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'apex' } });

    await waitFor(
      () => {
        expect(screen.getByText(/search failed/i)).toBeInTheDocument();
      },
      { timeout: 600 },
    );
  });

  it('does not call fetch if query is whitespace only', async () => {
    render(<KnowledgeSearchPanel />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  ' } });

    // Wait longer than debounce to confirm fetch never fires
    await new Promise((r) => setTimeout(r, 400));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
