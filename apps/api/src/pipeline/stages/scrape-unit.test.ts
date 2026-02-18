import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';

const { mockRunScraperAgent } = vi.hoisted(() => {
  const mockRunScraperAgent = vi.fn().mockResolvedValue({
    raw_html: '<html><body><h1>Test Unit</h1></body></html>',
    duration_ms: 1234,
  });
  return { mockRunScraperAgent };
});
vi.mock('../../agents/scraper-agent.js', () => ({ runScraperAgent: mockRunScraperAgent }));

const { mockCreatePlaywrightMCP } = vi.hoisted(() => {
  const mockClient = { callTool: vi.fn(), tools: vi.fn() };
  const mockCreatePlaywrightMCP = vi.fn().mockResolvedValue(mockClient);
  return { mockCreatePlaywrightMCP, mockClient };
});
vi.mock('../../lib/mcp-client.js', () => ({ createPlaywrightMCP: mockCreatePlaywrightMCP }));

vi.mock('../../lib/session-validator.js', () => ({
  checkTrailheadSession: vi.fn().mockResolvedValue({ valid: true }),
  detectLoginRedirect: vi.fn().mockReturnValue(false),
}));

import { scrapeModule, randomDelay, SCRAPE_DELAY_MS } from './scrape-unit.js';
import { PipelineError, SessionExpiredError } from '../../lib/errors.js';

describe('Scrape Unit Stage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('randomDelay', () => {
    it('delays between min and max milliseconds', async () => {
      const startTime = Date.now();
      await randomDelay();
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(SCRAPE_DELAY_MS.min);
      expect(elapsed).toBeLessThanOrEqual(SCRAPE_DELAY_MS.max + 2000); // Allow overhead for OS scheduling jitter (WSL2 can overshoot by ~900ms)
    }, { timeout: 8000 });
  });

  describe('scrapeModule', () => {
    const mockUnit1 = {
      id: 'unit-1',
      module_id: 'module-1',
      title: 'Unit 1',
      url: 'https://example.com/unit-1',
      unit_index: 0,
      raw_html: null,
      content_markdown: null,
      user_id: null,
      created_at: '2026-01-01T00:00:00Z',
    };

    const mockUnit2 = {
      id: 'unit-2',
      module_id: 'module-1',
      title: 'Unit 2',
      url: 'https://example.com/unit-2',
      unit_index: 1,
      raw_html: null,
      content_markdown: null,
      user_id: null,
      created_at: '2026-01-01T00:00:00Z',
    };

    // Separate references needed to support .eq().order() chain and per-test overrides
    const mockOrderFn = vi.fn().mockResolvedValue({ data: [mockUnit1, mockUnit2], error: null });
    const mockSelectEqFn = vi.fn().mockReturnValue({ order: mockOrderFn });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockSelectEqFn,
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    };

    // Mock setTimeout to resolve instantly so scrapeModule tests don't wait real delays.
    // The randomDelay describe block above uses real timers.
    let setTimeoutSpy: MockInstance;

    beforeEach(() => {
      setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: unknown) => {
        if (typeof fn === 'function') (fn as () => void)();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      });
    });

    afterEach(() => {
      setTimeoutSpy.mockRestore();
    });

    it('fetches all units for the module from Supabase', async () => {
      await scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabase as any);
      expect(mockSupabase.from).toHaveBeenCalledWith('units');
    });

    it('updates module status to scraping before processing', async () => {
      await scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabase as any);
      const updateCalls = mockSupabase.from('modules').update.mock.calls;
      expect(updateCalls.length).toBeGreaterThan(0);
      expect(updateCalls[0]?.[0]).toMatchObject({ status: 'scraping' });
    });

    it('calls runScraperAgent for each unit', async () => {
      await scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabase as any);
      expect(mockRunScraperAgent).toHaveBeenCalledTimes(2);
    });

    it('stores raw_html in units table after each agent call', async () => {
      await scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabase as any);
      const unitUpdateCalls = mockSupabase.from('units').update.mock.calls;
      expect(unitUpdateCalls.length).toBeGreaterThanOrEqual(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(unitUpdateCalls.some((call: any) => call[0]?.raw_html)).toBe(true);
    });

    it('applies delay between units but not after the last unit', async () => {
      const mockSupabaseWithSingleUnit = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [mockUnit1], error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
      // Reset spy call count before this test (spy already active from beforeEach)
      setTimeoutSpy.mockClear();
      await scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabaseWithSingleUnit as any);
      // With only 1 unit, should NOT call setTimeout (no delay after last unit)
      expect(setTimeoutSpy).not.toHaveBeenCalled();
    });

    it('updates module status to scraped after all units complete', async () => {
      await scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabase as any);
      const updateCalls = mockSupabase.from('modules').update.mock.calls;
      expect(updateCalls[updateCalls.length - 1]?.[0]).toMatchObject({ status: 'scraped' });
    });

    it('throws PipelineError if no units found for module', async () => {
      mockOrderFn.mockResolvedValueOnce({ data: [], error: null });
      await expect(
        scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabase as any),
      ).rejects.toThrow(PipelineError);
    });

    it('throws PipelineError if Supabase returns an error', async () => {
      mockOrderFn.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });
      await expect(
        scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabase as any),
      ).rejects.toThrow(PipelineError);
    });

    it('calls delay between multiple units (unitCount - 1 times)', async () => {
      // Reset spy call count before this test (spy already active from beforeEach)
      setTimeoutSpy.mockClear();
      await scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabase as any);
      // With 2 units, should call setTimeout exactly once (between unit 1 and unit 2)
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from runScraperAgent', async () => {
      mockRunScraperAgent.mockRejectedValueOnce(new Error('Scraper failed'));
      await expect(
        scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabase as any),
      ).rejects.toThrow('Scraper failed');
    });

    it('creates Playwright MCP client for browser automation', async () => {
      await scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabase as any);
      expect(mockCreatePlaywrightMCP).toHaveBeenCalled();
    });

    it('throws SessionExpiredError when checkTrailheadSession returns invalid', async () => {
      const { checkTrailheadSession } = await import('../../lib/session-validator.js');
      vi.mocked(checkTrailheadSession).mockResolvedValueOnce({ valid: false });
      await expect(
        scrapeModule({ module_id: 'module-1', run_id: 'run-1' }, mockSupabase as any),
      ).rejects.toThrow(SessionExpiredError);
    });
  });
});
