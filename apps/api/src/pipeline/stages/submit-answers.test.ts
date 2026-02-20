import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitModuleAnswers } from './submit-answers.js';
import { PipelineError, SessionExpiredError } from '../../lib/errors.js';

// Mock MCP client — vi.hoisted() required for factory closure references
const { mockCreatePlaywrightMCP, mockCallTool } = vi.hoisted(() => {
  const mockCallTool = vi.fn();
  const mockCreatePlaywrightMCP = vi.fn().mockResolvedValue({
    callTool: mockCallTool,
    tools: vi.fn().mockResolvedValue({}),
  });
  return { mockCreatePlaywrightMCP, mockCallTool };
});

vi.mock('../../lib/mcp-client.js', () => ({
  createPlaywrightMCP: mockCreatePlaywrightMCP,
}));

// Mock session validator
vi.mock('../../lib/session-validator.js', () => ({
  detectLoginRedirect: vi.fn((url: string) => url.includes('login')),
}));


describe('submitModuleAnswers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws PipelineError when module has no approved results', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    };

    await expect(
      submitModuleAnswers(
        { module_id: 'mod-1', run_id: null },
        mockSupabase as unknown as ReturnType<typeof import('@trailblaze/db').createClient>,
      ),
    ).rejects.toThrow(PipelineError);
  });

  it('calls MCP navigate to quiz URL for each unit', async () => {
    const mockResult = {
      id: 'result-1',
      unit_id: 'unit-1',
      quiz_item_id: 'item-1',
      selected_answer: 'Option A',
      is_approved: true,
      quiz_items: {
        id: 'item-1',
        options: ['Option A', 'Option B', 'Option C'],
      },
      units: {
        id: 'unit-1',
        url: 'https://trailhead.salesforce.com/unit/test',
      },
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [mockResult], error: null }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    mockCallTool.mockResolvedValue({ content: [{ text: '{"url":"https://trailhead.salesforce.com/unit/test"}' }] });

    await submitModuleAnswers(
      { module_id: 'mod-1', run_id: null },
      mockSupabase as unknown as ReturnType<typeof import('@trailblaze/db').createClient>,
    );

    expect(mockCallTool).toHaveBeenCalledWith('browser_navigate', expect.objectContaining({ url: expect.any(String) }));
  });

  it('updates quiz_results with correct_answer and is_correct after submission', async () => {
    const mockResult = {
      id: 'result-1',
      unit_id: 'unit-1',
      quiz_item_id: 'item-1',
      selected_answer: 'Option A',
      is_approved: true,
      quiz_items: {
        id: 'item-1',
        options: ['Option A', 'Option B', 'Option C'],
      },
      units: {
        id: 'unit-1',
        url: 'https://trailhead.salesforce.com/unit/test',
      },
    };

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'quiz_results') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [mockResult], error: null }),
                }),
              }),
            }),
            update: updateMock,
          };
        }
        if (table === 'modules') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn() }) };
      }),
    };

    // Return "Correct answer: Option A" in result snapshot so parseCorrectAnswerFromSnapshot returns non-null
    mockCallTool
      .mockResolvedValueOnce({ content: [{ text: 'navigated' }] }) // browser_navigate
      .mockResolvedValueOnce({ url: 'https://trailhead.salesforce.com/unit/test', content: [] }) // browser_snapshot (session check)
      .mockResolvedValueOnce({ content: [{ text: 'clicked' }] }) // browser_click (answer)
      .mockResolvedValueOnce({ content: [{ text: 'submitted' }] }) // browser_click (Check)
      .mockResolvedValueOnce({ content: [{ text: 'Correct answer: Option A' }] }); // browser_snapshot (result)

    await submitModuleAnswers(
      { module_id: 'mod-1', run_id: null },
      mockSupabase as unknown as ReturnType<typeof import('@trailblaze/db').createClient>,
    );

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        correct_answer: 'Option A',
        is_correct: true,
      }),
    );
  });

  it('sets badge_earned=true when all answers correct', async () => {
    const mockResult = {
      id: 'result-1',
      unit_id: 'unit-1',
      quiz_item_id: 'item-1',
      selected_answer: 'Option A',
      is_approved: true,
      quiz_items: {
        id: 'item-1',
        options: ['Option A', 'Option B', 'Option C'],
      },
      units: {
        id: 'unit-1',
        url: 'https://trailhead.salesforce.com/unit/test',
      },
    };

    const modulesUpdateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'quiz_results') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [mockResult], error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'modules') {
          return {
            update: modulesUpdateMock,
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn() }) };
      }),
    };

    // Return "Correct answer: Option A" in result snapshot so allCorrect stays true
    mockCallTool
      .mockResolvedValueOnce({ content: [{ text: 'navigated' }] }) // browser_navigate
      .mockResolvedValueOnce({ url: 'https://trailhead.salesforce.com/unit/test', content: [] }) // browser_snapshot (session check)
      .mockResolvedValueOnce({ content: [{ text: 'clicked' }] }) // browser_click (answer)
      .mockResolvedValueOnce({ content: [{ text: 'submitted' }] }) // browser_click (Check)
      .mockResolvedValueOnce({ content: [{ text: 'Correct answer: Option A' }] }); // browser_snapshot (result)

    await submitModuleAnswers(
      { module_id: 'mod-1', run_id: null },
      mockSupabase as unknown as ReturnType<typeof import('@trailblaze/db').createClient>,
    );

    expect(modulesUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        badge_earned: true,
        status: 'completed',
      }),
    );
  });

  it('transitions module status to completed on success', async () => {
    const mockResult = {
      id: 'result-1',
      unit_id: 'unit-1',
      quiz_item_id: 'item-1',
      selected_answer: 'Option A',
      is_approved: true,
      quiz_items: {
        id: 'item-1',
        options: ['Option A', 'Option B', 'Option C'],
      },
      units: {
        id: 'unit-1',
        url: 'https://trailhead.salesforce.com/unit/test',
      },
    };

    const modulesUpdateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'quiz_results') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [mockResult], error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'modules') {
          return {
            update: modulesUpdateMock,
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn() }) };
      }),
    };

    // Return "Correct answer: Option A" in result snapshot so allCorrect stays true
    mockCallTool
      .mockResolvedValueOnce({ content: [{ text: 'navigated' }] }) // browser_navigate
      .mockResolvedValueOnce({ url: 'https://trailhead.salesforce.com/unit/test', content: [] }) // browser_snapshot (session check)
      .mockResolvedValueOnce({ content: [{ text: 'clicked' }] }) // browser_click (answer)
      .mockResolvedValueOnce({ content: [{ text: 'submitted' }] }) // browser_click (Check)
      .mockResolvedValueOnce({ content: [{ text: 'Correct answer: Option A' }] }); // browser_snapshot (result)

    await submitModuleAnswers(
      { module_id: 'mod-1', run_id: null },
      mockSupabase as unknown as ReturnType<typeof import('@trailblaze/db').createClient>,
    );

    expect(modulesUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
      }),
    );
  });

  it('does not update module status when any answer is wrong (allCorrect=false)', async () => {
    const mockResult = {
      id: 'result-1',
      unit_id: 'unit-1',
      quiz_item_id: 'item-1',
      selected_answer: 'Option A',
      is_approved: true,
      quiz_items: {
        id: 'item-1',
        options: ['Option A', 'Option B', 'Option C'],
      },
      units: {
        id: 'unit-1',
        url: 'https://trailhead.salesforce.com/unit/test',
      },
    };

    const modulesUpdateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'quiz_results') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [mockResult], error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'modules') {
          return { update: modulesUpdateMock };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn() }) };
      }),
    };

    // Result snapshot returns "Correct answer: Option B" — different from selected "Option A"
    mockCallTool
      .mockResolvedValueOnce({ content: [{ text: 'navigated' }] }) // browser_navigate
      .mockResolvedValueOnce({ url: 'https://trailhead.salesforce.com/unit/test', content: [] }) // browser_snapshot (session check)
      .mockResolvedValueOnce({ content: [{ text: 'clicked' }] }) // browser_click (answer)
      .mockResolvedValueOnce({ content: [{ text: 'submitted' }] }) // browser_click (Check)
      .mockResolvedValueOnce({ content: [{ text: 'Correct answer: Option B' }] }); // browser_snapshot (result)

    await submitModuleAnswers(
      { module_id: 'mod-1', run_id: null },
      mockSupabase as unknown as ReturnType<typeof import('@trailblaze/db').createClient>,
    );

    // Module status must NOT be updated when any answer is wrong
    expect(modulesUpdateMock).not.toHaveBeenCalled();
  });

  it('throws SessionExpiredError when login redirect detected', async () => {
    const mockResult = {
      id: 'result-1',
      unit_id: 'unit-1',
      quiz_item_id: 'item-1',
      selected_answer: 'Option A',
      is_approved: true,
      quiz_items: {
        id: 'item-1',
        options: ['Option A', 'Option B', 'Option C'],
      },
      units: {
        id: 'unit-1',
        url: 'https://trailhead.salesforce.com/unit/test',
      },
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [mockResult], error: null }),
            }),
          }),
        }),
      }),
    };

    // browser_navigate returns normal response; browser_snapshot returns login URL
    mockCallTool
      .mockResolvedValueOnce({ content: [{ text: 'navigated' }] }) // browser_navigate
      .mockResolvedValueOnce({ url: 'https://login.salesforce.com', content: [] }); // browser_snapshot

    await expect(
      submitModuleAnswers(
        { module_id: 'mod-1', run_id: null },
        mockSupabase as unknown as ReturnType<typeof import('@trailblaze/db').createClient>,
      ),
    ).rejects.toThrow(SessionExpiredError);
  });
});
