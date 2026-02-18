import { createClient } from '@trailblaze/db';
import type { Unit } from '@trailblaze/shared';
import { PipelineError, SessionExpiredError } from '../../lib/errors.js';
import { runScraperAgent } from '../../agents/scraper-agent.js';
import { createPlaywrightMCP } from '../../lib/mcp-client.js';
import { checkTrailheadSession } from '../../lib/session-validator.js';

export interface ScrapeModuleInput {
  module_id: string;
  run_id: string | null;
}

export const SCRAPE_DELAY_MS = { min: 2000, max: 5000 };

export async function randomDelay(): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, SCRAPE_DELAY_MS.min + Math.random() * (SCRAPE_DELAY_MS.max - SCRAPE_DELAY_MS.min)),
  );
}

// Structural type for the Supabase client operations used in this stage.
// The generated types lag behind the actual schema until `supabase gen types` is re-run.
type PipelineClient = {
  from(table: string): {
    update(data: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function scrapeModule(
  input: ScrapeModuleInput,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  // Fetch units for this module
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('*')
    .eq('module_id', input.module_id)
    .order('unit_index');

  if (unitsError) {
    throw new PipelineError('scrape-module', `Failed to fetch units: ${unitsError.message}`);
  }

  if (!units || units.length === 0) {
    throw new PipelineError('scrape-module', `No units found for module ${input.module_id}`);
  }

  // Update module status to 'scraping'
  const { error: statusError } = await (supabase as unknown as PipelineClient)
    .from('modules')
    .update({ status: 'scraping', updated_at: new Date().toISOString() })
    .eq('id', input.module_id);

  if (statusError) {
    throw new PipelineError('scrape-module', `Failed to update module status: ${statusError.message}`);
  }

  // Create Playwright MCP client
  const playwrightMCP = await createPlaywrightMCP();

  // Validate session before scraping (AC3: validates via browser_snapshot before each job)
  const sessionCheck = await checkTrailheadSession(playwrightMCP);
  if (!sessionCheck.valid) {
    throw new SessionExpiredError('Session invalid before scraping module');
  }

  // Process each unit
  for (let i = 0; i < units.length; i++) {
    const unit = units[i] as unknown as Unit;

    const result = await runScraperAgent({
      unit,
      playwrightMCP,
      supabase,
      run_id: input.run_id,
    });

    // Update unit with raw_html (units table has no updated_at column)
    const { error: updateError } = await (supabase as unknown as PipelineClient)
      .from('units')
      .update({ raw_html: result.raw_html })
      .eq('id', unit.id);

    if (updateError) {
      throw new PipelineError('scrape-module', `Failed to update unit ${unit.id}: ${updateError.message}`);
    }

    // Apply delay between units (but not after last unit)
    if (i < units.length - 1) {
      await randomDelay();
    }
  }

  // Update module status to 'scraped'
  const { error: finalStatusError } = await (supabase as unknown as PipelineClient)
    .from('modules')
    .update({ status: 'scraped', updated_at: new Date().toISOString() })
    .eq('id', input.module_id);

  if (finalStatusError) {
    throw new PipelineError('scrape-module', `Failed to update module final status: ${finalStatusError.message}`);
  }
}
