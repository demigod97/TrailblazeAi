import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGenerateText, mockStepCountIs } = vi.hoisted(() => {
  const mockGenerateText = vi.fn().mockResolvedValue({
    text: 'Page content loaded successfully',
    steps: [],
    usage: { inputTokens: 100, outputTokens: 50 },
  });
  const mockStepCountIs = vi.fn().mockReturnValue({});
  return { mockGenerateText, mockStepCountIs };
});
vi.mock('ai', () => ({ generateText: mockGenerateText, stepCountIs: mockStepCountIs }));

const { mockAnthropic } = vi.hoisted(() => {
  const mockAnthropic = vi.fn().mockReturnValue({ id: 'claude-haiku-4-5-20251001' });
  return { mockAnthropic };
});
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: mockAnthropic }));

const { mockReadFile } = vi.hoisted(() => {
  const mockReadFile = vi.fn().mockResolvedValue(`system: "You are a scraper"
navigate: "Navigate to {{url}}"
extract: "Extract content"`);
  return { mockReadFile };
});
vi.mock('fs/promises', () => ({ readFile: mockReadFile }));

const { mockLogToolTrace } = vi.hoisted(() => {
  const mockLogToolTrace = vi.fn().mockResolvedValue(undefined);
  return { mockLogToolTrace };
});
vi.mock('../lib/agent-logger.js', () => ({ logToolTrace: mockLogToolTrace }));

import { loadScraperPrompts, runScraperAgent } from './scraper-agent.js';
import { PipelineError, SessionExpiredError } from '../lib/errors.js';

describe('Scraper Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadScraperPrompts', () => {
    it('loads and parses scraper prompts from YAML', async () => {
      const prompts = await loadScraperPrompts();
      expect(prompts).toEqual({
        system: 'You are a scraper',
        navigate: 'Navigate to {{url}}',
        extract: 'Extract content',
      });
    });

    it('reads the YAML file from the correct path', async () => {
      await loadScraperPrompts();
      expect(mockReadFile).toHaveBeenCalled();
      const callArg = mockReadFile.mock.calls[0]?.[0];
      expect(typeof callArg).toBe('string');
      expect(callArg).toContain('scraper-agent.yaml');
    });

    it('throws on invalid YAML structure', async () => {
      mockReadFile.mockResolvedValueOnce('invalid: yaml: structure: here');
      await expect(loadScraperPrompts()).rejects.toThrow();
    });
  });

  describe('runScraperAgent', () => {
    const mockSupabase = {} as unknown as ReturnType<typeof import('@trailblaze/db').createClient>;

    const mockUnit = {
      id: 'unit-1',
      title: 'Test Unit',
      url: 'https://example.com/unit',
      module_id: 'module-1',
      unit_index: 0,
      raw_html: null,
      content_markdown: null,
      user_id: null,
      created_at: '2026-01-01T00:00:00Z',
    };

    let mockPlaywrightMCP: any;

    beforeEach(() => {
      mockPlaywrightMCP = {
        tools: vi.fn().mockResolvedValue({}),
        callTool: vi.fn().mockImplementation((toolName, args) => {
          if (toolName === 'browser_evaluate' && (args as any).expression === 'window.location.href') {
            // Default: return a valid URL
            return Promise.resolve({
              content: [{ type: 'text', text: 'https://trailhead.salesforce.com/en/content/learn/modules/unit' }],
            });
          }
          // Default: return HTML
          return Promise.resolve({
            content: [{ type: 'text', text: '<html><body><h1>Test</h1></body></html>' }],
          });
        }),
      };
    });

    it('calls generateText with stopWhen step condition and correct model', async () => {
      await runScraperAgent(
        {
          unit: mockUnit,
          playwrightMCP: mockPlaywrightMCP as any,
          supabase: mockSupabase,
          run_id: 'run-1',
        },
      );
      expect(mockGenerateText).toHaveBeenCalled();
      const call = mockGenerateText.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.stopWhen).toBeDefined();
      expect(mockStepCountIs).toHaveBeenCalledWith(20);
    });

    it('calls playwrightMCP.tools() to get available tools', async () => {
      await runScraperAgent(
        {
          unit: mockUnit,
          playwrightMCP: mockPlaywrightMCP as any,
          supabase: mockSupabase,
          run_id: 'run-1',
        },
      );
      expect(mockPlaywrightMCP.tools).toHaveBeenCalled();
    });

    it('calls playwrightMCP.callTool with browser_evaluate to capture HTML', async () => {
      await runScraperAgent(
        {
          unit: mockUnit,
          playwrightMCP: mockPlaywrightMCP as any,
          supabase: mockSupabase,
          run_id: 'run-1',
        },
      );
      expect(mockPlaywrightMCP.callTool).toHaveBeenCalledWith(
        'browser_evaluate',
        expect.objectContaining({
          expression: 'document.documentElement.outerHTML',
        }),
      );
    });

    it('returns object with raw_html and duration_ms', async () => {
      const result = await runScraperAgent(
        {
          unit: mockUnit,
          playwrightMCP: mockPlaywrightMCP as any,
          supabase: mockSupabase,
          run_id: 'run-1',
        },
      );
      expect(result).toHaveProperty('raw_html');
      expect(result).toHaveProperty('duration_ms');
      expect(typeof result.raw_html).toBe('string');
      expect(typeof result.duration_ms).toBe('number');
      expect(result.raw_html).toContain('<html>');
    });

    it('throws PipelineError if browser_evaluate returns empty content', async () => {
      mockPlaywrightMCP.callTool.mockImplementation((toolName: string, args: unknown) => {
        if (toolName === 'browser_evaluate' && (args as any).expression === 'window.location.href') {
          // URL check: return a valid URL
          return Promise.resolve({
            content: [{ type: 'text', text: 'https://trailhead.salesforce.com/en/content/learn/modules/unit' }],
          });
        }
        // HTML extraction: return empty content
        return Promise.resolve({
          content: [],
        });
      });
      await expect(
        runScraperAgent(
          {
            unit: mockUnit,
            playwrightMCP: mockPlaywrightMCP as any,
            supabase: mockSupabase,
            run_id: 'run-1',
          },
        ),
      ).rejects.toThrow(PipelineError);
    });

    it('replaces {{url}} placeholder in navigate prompt', async () => {
      await runScraperAgent(
        {
          unit: mockUnit,
          playwrightMCP: mockPlaywrightMCP as any,
          supabase: mockSupabase,
          run_id: 'run-1',
        },
      );
      const call = mockGenerateText.mock.calls[0]?.[0];
      const messages = call?.messages as any[];
      expect(messages?.[0]?.content).toContain('https://example.com/unit');
      expect(messages?.[0]?.content).not.toContain('{{url}}');
    });

    it('extracts text from tool result with content array format', async () => {
      mockPlaywrightMCP.callTool.mockImplementation((toolName: string, args: unknown) => {
        if (toolName === 'browser_evaluate' && (args as any).expression === 'window.location.href') {
          // URL check: return a valid URL
          return Promise.resolve({
            content: [{ type: 'text', text: 'https://trailhead.salesforce.com/en/content/learn/modules/unit' }],
          });
        }
        // HTML extraction: return multi-block content
        return Promise.resolve({
          content: [
            { type: 'text', text: '<html>' },
            { type: 'text', text: '<body>' },
            { type: 'text', text: 'content' },
            { type: 'text', text: '</body></html>' },
          ],
        });
      });
      const result = await runScraperAgent(
        {
          unit: mockUnit,
          playwrightMCP: mockPlaywrightMCP as any,
          supabase: mockSupabase,
          run_id: 'run-1',
        },
      );
      expect(result.raw_html).toBe('<html><body>content</body></html>');
    });

    it('calls logToolTrace with agent_type: scraper and tool_type: playwright_mcp', async () => {
      await runScraperAgent(
        {
          unit: mockUnit,
          playwrightMCP: mockPlaywrightMCP as any,
          supabase: mockSupabase,
          run_id: 'run-1',
        },
      );
      expect(mockLogToolTrace).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          agent_type: 'scraper',
          tool_type: 'playwright_mcp',
          input_tokens: 100,
          output_tokens: 50,
        }),
      );
    });

    it('throws SessionExpiredError when browser_evaluate detects login redirect URL', async () => {
      mockPlaywrightMCP.callTool.mockImplementation((toolName: string, args: unknown) => {
        if (toolName === 'browser_evaluate' && (args as any).expression === 'window.location.href') {
          // URL check: return a login redirect URL
          return Promise.resolve({
            content: [{ type: 'text', text: 'https://login.salesforce.com/services/oauth2/authorize' }],
          });
        }
        // HTML extraction: should not be called
        return Promise.resolve({
          content: [{ type: 'text', text: '<html><body>Should not reach here</body></html>' }],
        });
      });

      await expect(
        runScraperAgent(
          {
            unit: mockUnit,
            playwrightMCP: mockPlaywrightMCP as any,
            supabase: mockSupabase,
            run_id: 'run-1',
          },
        ),
      ).rejects.toThrow(SessionExpiredError);
    });
  });
});
