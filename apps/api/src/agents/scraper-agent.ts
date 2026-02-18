import { generateText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { parse } from 'yaml';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';
import { createClient } from '@trailblaze/db';
import type { Unit } from '@trailblaze/shared';
import type { PlaywrightMCPClient } from '../lib/mcp-client.js';
import { logToolTrace } from '../lib/agent-logger.js';
import { PipelineError, SessionExpiredError } from '../lib/errors.js';
import { detectLoginRedirect } from '../lib/session-validator.js';

export interface ScraperPrompts {
  system: string;
  navigate: string;
  extract: string;
}

export interface ScraperAgentParams {
  unit: Unit;
  playwrightMCP: PlaywrightMCPClient;
  supabase: ReturnType<typeof createClient>;
  run_id: string | null;
}

const promptSchema = z.object({
  system: z.string(),
  navigate: z.string(),
  extract: z.string(),
});

// ESM __dirname pattern
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadScraperPrompts(): Promise<ScraperPrompts> {
  const yamlPath = join(__dirname, '../prompts/scraper-agent.yaml');
  const content = await readFile(yamlPath, 'utf-8');
  const parsed = parse(content) as unknown;
  return promptSchema.parse(parsed);
}

function extractTextFromToolResult(result: unknown): string {
  if (
    result !== null &&
    typeof result === 'object' &&
    'content' in result &&
    Array.isArray((result as { content: unknown }).content)
  ) {
    return (result as { content: Array<{ type?: string; text?: string }> }).content
      .filter((item) => item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text ?? '')
      .join('');
  }
  return '';
}

export async function runScraperAgent(params: ScraperAgentParams): Promise<{ raw_html: string; duration_ms: number }> {
  const startTime = Date.now();
  const prompts = await loadScraperPrompts();
  const tools = await params.playwrightMCP.tools();

  const result = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    tools: tools as unknown as import('ai').ToolSet,
    stopWhen: stepCountIs(20),
    system: prompts.system,
    messages: [{ role: 'user', content: prompts.navigate.replace('{{url}}', params.unit.url) }],
  });

  // Check URL after navigation to detect session expiry (AC1: URL pattern matching)
  const urlResult = await params.playwrightMCP.callTool('browser_evaluate', {
    expression: 'window.location.href',
  });
  const currentUrl = extractTextFromToolResult(urlResult);
  if (detectLoginRedirect(currentUrl)) {
    throw new SessionExpiredError(`Session expired navigating to unit: ${params.unit.id}`);
  }

  const htmlResult = await params.playwrightMCP.callTool('browser_evaluate', {
    expression: 'document.documentElement.outerHTML',
  });
  const rawHtml = extractTextFromToolResult(htmlResult);

  if (!rawHtml) {
    throw new PipelineError('scrape-agent', `Failed to extract HTML from unit: ${params.unit.id}`);
  }

  const duration_ms = Date.now() - startTime;

  await logToolTrace(params.supabase, {
    run_id: params.run_id,
    agent_type: 'scraper',
    tool_type: 'playwright_mcp',
    query: params.unit.url,
    raw_output: rawHtml.substring(0, 50000),
    summary: `Scraped unit: ${params.unit.title}`,
    raw_output_truncated: rawHtml.length > 50000,
    input_tokens: result.usage.inputTokens ?? 0,
    output_tokens: result.usage.outputTokens ?? 0,
    estimated_cost_usd: 0,
    duration_ms,
    confidence_score: null,
    related_chunk_ids: null,
  });

  return { raw_html: rawHtml, duration_ms };
}
