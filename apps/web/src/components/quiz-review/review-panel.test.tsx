import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewPanel } from './review-panel';

// Mock Supabase browser client — vi.hoisted() required for factory closure references
const { mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  };
  const mockFrom = vi.fn();
  const mockSupabase = {
    from: mockFrom,
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
  };
  return { mockFrom, mockSupabase };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue(mockSupabase),
}));

// Mock router — vi.hoisted() for mockRefresh reference
const { mockRefresh } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockResult = {
  id: 'result-1',
  quiz_item_id: 'item-1',
  selected_answer: 'Answer A',
  confidence_score: 0.85,
  reasoning: 'Test reasoning',
  attempt_number: 1,
  is_approved: null,
  user_note: null,
  quiz_items: {
    id: 'item-1',
    question_text: 'What is X?',
    options: ['Answer A', 'Answer B', 'Answer C'],
    display_order: 1,
    units: {
      id: 'unit-1',
      title: 'Unit 1',
      modules: { id: 'mod-1', name: 'Test Module' },
    },
  },
};

describe('ReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [mockResult], error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  it('Test 1: ConfidenceBar renders green for >=90% (confidence=0.95)', async () => {
    // Override mock to use confidence_score: 0.95 (above the 0.90 green threshold)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ ...mockResult, confidence_score: 0.95 }],
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    render(
      <div>
        <ReviewPanel />
      </div>
    );

    await waitFor(() => {
      // getByRole throws if not found — no vacuous pass
      const progressBar = screen.getByRole('progressbar');
      const filledDiv = progressBar.querySelector('div');
      expect(filledDiv).not.toBeNull();
      expect(filledDiv!.style.backgroundColor).toBe('#22c55e');
    }, { timeout: 600 });
  });

  it('Test 2: ConfidenceBar renders amber for 70-89% (confidence=0.75)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{
              ...mockResult,
              confidence_score: 0.75,
            }],
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    render(
      <div>
        <ReviewPanel />
      </div>
    );

    await waitFor(() => {
      // getByRole throws if not found — no vacuous pass
      const progressBar = screen.getByRole('progressbar');
      const filledDiv = progressBar.querySelector('div');
      expect(filledDiv).not.toBeNull();
      expect(filledDiv!.style.backgroundColor).toBe('#f59e0b');
    }, { timeout: 600 });
  });

  it('Test 3: ConfidenceBar renders red for <70% (confidence=0.65) AND shows "Low confidence — review carefully" label', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{
              ...mockResult,
              confidence_score: 0.65,
            }],
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    render(
      <div>
        <ReviewPanel />
      </div>
    );

    await waitFor(() => {
      // getByRole throws if not found — no vacuous pass
      const progressBar = screen.getByRole('progressbar');
      const filledDiv = progressBar.querySelector('div');
      expect(filledDiv).not.toBeNull();
      expect(filledDiv!.style.backgroundColor).toBe('#ef4444');
      // Check for warning label
      expect(screen.getByText('Low confidence — review carefully')).toBeTruthy();
    }, { timeout: 600 });
  });

  it('Test 4: ReviewPanel renders null when no pending quiz results (empty array from Supabase)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { container: testContainer } = render(
      <div>
        <ReviewPanel />
      </div>
    );

    await waitFor(() => {
      // When empty, ReviewPanel returns null, so container should have no content from ReviewPanel
      expect(testContainer.textContent).not.toContain('Test Module');
    }, { timeout: 600 });
  });

  it('Test 5: ReviewPanel shows module name and "X/Y reviewed" progress counter', async () => {
    render(
      <div>
        <ReviewPanel />
      </div>
    );

    await waitFor(() => {
      // Should display module name and progress counter like "Test Module — 0/1 reviewed"
      expect(screen.getByText(/Test Module/)).toBeTruthy();
      expect(screen.getByText(/reviewed/)).toBeTruthy();
    }, { timeout: 600 });
  });

  it('Test 6: ReviewPanel advances to next question on approve (button click)', async () => {
    // Setup two quiz results
    const result2 = {
      ...mockResult,
      id: 'result-2',
      quiz_item_id: 'item-2',
      quiz_items: {
        ...mockResult.quiz_items,
        question_text: 'What is Y?',
      },
    };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [mockResult, result2],
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    render(
      <div>
        <ReviewPanel />
      </div>
    );

    // Wait for first question to render
    await waitFor(() => {
      expect(screen.queryByText('What is X?')).toBeTruthy();
    }, { timeout: 600 });

    // Find and click Approve button
    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    // Wait for second question to render
    await waitFor(() => {
      expect(screen.queryByText('What is Y?')).toBeTruthy();
    }, { timeout: 600 });
  });

  it('Test 7: ReviewPanel enters edit mode on E keypress', async () => {
    render(
      <div>
        <ReviewPanel />
      </div>
    );

    // Wait for ReviewPanel to render
    await waitFor(() => {
      expect(screen.queryByText('What is X?')).toBeTruthy();
    }, { timeout: 600 });

    // Press 'e' key
    fireEvent.keyDown(window, { key: 'e', code: 'KeyE' });

    // Should see edit-mode UI (Save/Cancel buttons for edit)
    await waitFor(() => {
      const saveButton = screen.queryByRole('button', { name: /save/i });
      const cancelButton = screen.queryByRole('button', { name: /cancel/i });
      expect(saveButton || cancelButton).toBeTruthy();
    }, { timeout: 600 });
  });

  it('Test 7b: Save writes correct payload to Supabase (selected_answer, is_approved, user_note)', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [mockResult], error: null }),
        }),
      }),
      update: mockUpdate,
    });

    render(
      <div>
        <ReviewPanel />
      </div>
    );

    // Wait for question to render
    await waitFor(() => {
      expect(screen.queryByText('What is X?')).toBeTruthy();
    }, { timeout: 600 });

    // Enter edit mode via 'e' key
    fireEvent.keyDown(window, { key: 'e', code: 'KeyE' });

    // Wait for Save button to appear
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /save/i })).toBeTruthy();
    }, { timeout: 600 });

    // Click Save without changing selection (uses AI answer: 'Answer A', empty note)
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    // Verify Supabase update called with correct payload
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        selected_answer: 'Answer A',
        is_approved: true,
        user_note: null,
      });
    }, { timeout: 600 });
  });

  it('Test 8: ReviewPanel shows "Ready to submit" and calls router.refresh() when all reviews complete', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [mockResult],
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    render(
      <div>
        <ReviewPanel />
      </div>
    );

    // Wait for question to render
    await waitFor(() => {
      expect(screen.queryByText('What is X?')).toBeTruthy();
    }, { timeout: 600 });

    // Click Approve on the last item
    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    // Verify "Ready to submit" banner appears and router.refresh() was called
    await waitFor(() => {
      expect(screen.queryByText('Ready to submit')).toBeTruthy();
      expect(mockRefresh).toHaveBeenCalled();
    }, { timeout: 600 });
  });

  it('Test 9: ReviewPanel shows "Submit to Trailhead" button when module is complete (all approved)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [mockResult],
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    render(
      <div>
        <ReviewPanel />
      </div>
    );

    // Wait for question to render
    await waitFor(() => {
      expect(screen.queryByText('What is X?')).toBeTruthy();
    }, { timeout: 600 });

    // Click Approve to complete the module
    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    // Wait for "Submit to Trailhead" button to appear
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /submit to trailhead/i })).toBeTruthy();
    }, { timeout: 600 });
  });

  it('Test 10: ReviewPanel calls POST /api/quiz-results/submit on Submit button click', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { queued: true } }),
    });
    global.fetch = mockFetch;

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [mockResult],
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    render(
      <div>
        <ReviewPanel />
      </div>
    );

    // Wait for question to render
    await waitFor(() => {
      expect(screen.queryByText('What is X?')).toBeTruthy();
    }, { timeout: 600 });

    // Click Approve to complete the module
    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    // Wait for Submit button
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /submit to trailhead/i })).toBeTruthy();
    }, { timeout: 600 });

    // Click Submit
    const submitButton = screen.getByRole('button', { name: /submit to trailhead/i });
    fireEvent.click(submitButton);

    // Verify fetch was called with correct endpoint and module_id
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/quiz-results/submit'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ module_id: 'mod-1' }),
        }),
      );
    }, { timeout: 600 });
  });
});
