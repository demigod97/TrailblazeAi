import { describe, it, expect, vi } from 'vitest';

// vi.hoisted() required: vi.mock() factories run before module imports
const { mockExperimentalCreateMCPClient, MockStdioTransport } = vi.hoisted(() => {
  const mockExecuteBrowserNavigate = vi.fn().mockResolvedValue({});
  const mockExecuteBrowserSnapshot = vi.fn().mockResolvedValue({
    content: [{ text: 'Trailhead - Welcome back' }],
  });
  const mockTools = vi.fn().mockResolvedValue({
    browser_navigate: { execute: mockExecuteBrowserNavigate },
    browser_snapshot: { execute: mockExecuteBrowserSnapshot },
  });
  const mockExperimentalCreateMCPClient = vi.fn().mockResolvedValue({ tools: mockTools });
  const MockStdioTransport = vi.fn().mockImplementation((config: unknown) => ({ config }));
  return { mockExperimentalCreateMCPClient, MockStdioTransport, mockTools };
});

vi.mock('@ai-sdk/mcp', () => ({
  experimental_createMCPClient: mockExperimentalCreateMCPClient,
}));

vi.mock('@ai-sdk/mcp/mcp-stdio', () => ({
  Experimental_StdioMCPTransport: MockStdioTransport,
}));

describe('createPlaywrightMCP', () => {
  it('creates MCP client with stdio transport and playwright profile dir arg', async () => {
    const { createPlaywrightMCP } = await import('./mcp-client.js');
    await createPlaywrightMCP();

    // Verify StdioMCPTransport was constructed with correct command/args for playwright MCP
    expect(MockStdioTransport).toHaveBeenCalledWith({
      command: 'npx',
      args: ['@playwright/mcp@latest', '--profile-dir', '/data/playwright-profiles/trailhead'],
    });

    // Verify experimental_createMCPClient was called with the transport
    expect(mockExperimentalCreateMCPClient).toHaveBeenCalledWith(
      expect.objectContaining({ transport: expect.any(Object) }),
    );
  });

  it('returned client callTool delegates to the tool execute function from MCP toolset', async () => {
    const { createPlaywrightMCP } = await import('./mcp-client.js');
    const client = await createPlaywrightMCP();

    // browser_navigate should be available in the mocked tool set
    const result = await client.callTool('browser_navigate', {
      url: 'https://trailhead.salesforce.com/en/home',
    });

    expect(result).toBeDefined();
  });

  it('returned client exposes tools() method for AI SDK agent loops', async () => {
    const { createPlaywrightMCP } = await import('./mcp-client.js');
    const client = await createPlaywrightMCP();

    // tools() must be callable and return the MCP tool set
    const toolSet = await client.tools();

    expect(toolSet).toBeDefined();
    expect(typeof toolSet).toBe('object');
    expect(toolSet).toHaveProperty('browser_navigate');
    expect(toolSet).toHaveProperty('browser_snapshot');
  });
});
