import { experimental_createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';
import { randomUUID } from 'crypto';

// Infer the tool set type from the MCP client to keep it in sync with @ai-sdk/mcp
type MCPClient = Awaited<ReturnType<typeof experimental_createMCPClient>>;
type MCPToolSet = Awaited<ReturnType<MCPClient['tools']>>;

// Simplified interface for Playwright MCP interactions.
// Wraps the AI SDK MCPClient to expose a direct callTool() method
// for session validation and tool invocations without requiring an LLM in the loop.
// tools() exposes the full tool set for AI SDK agent loops (e.g. generateText({ tools })).
export interface PlaywrightMCPClient {
  callTool(name: string, input: Record<string, unknown>): Promise<unknown>;
  tools(): Promise<MCPToolSet>;
}

// Internal type for AI SDK tool execute signature (mcp-tool wrapper)
interface AiSdkMcpTool {
  execute?: (
    args: Record<string, unknown>,
    opts: { toolCallId: string; messages: unknown[] },
  ) => Promise<unknown>;
}

// Creates a Playwright MCP client connected via stdio transport.
// Uses @playwright/mcp with a persistent profile at /data/playwright-profiles/trailhead
// so Trailhead sessions survive container restarts.
export async function createPlaywrightMCP(): Promise<PlaywrightMCPClient> {
  const transport = new Experimental_StdioMCPTransport({
    command: 'npx',
    args: ['@playwright/mcp@latest', '--profile-dir', '/data/playwright-profiles/trailhead'],
  });

  const client = await experimental_createMCPClient({ transport });

  return {
    callTool: async (name: string, input: Record<string, unknown>): Promise<unknown> => {
      const toolSet = (await client.tools()) as unknown as Record<string, AiSdkMcpTool>;
      const tool = toolSet[name];
      if (!tool?.execute) {
        throw new Error(`Playwright MCP tool '${name}' is not available`);
      }
      return tool.execute(input, { toolCallId: randomUUID(), messages: [] });
    },
    tools: () => client.tools(),
  };
}
