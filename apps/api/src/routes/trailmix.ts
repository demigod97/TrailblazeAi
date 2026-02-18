import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createClient } from '@trailblaze/db';
import { config } from '../config.js';
import { success, error } from '../lib/response.js';
import type { ApiResponse } from '../types/api.js';
import type { Module, Run } from '@trailblaze/shared';

interface DiscoveredModule {
  name: string;
  url: string;
  type: string | null;
  track: string | null;
  estimated_minutes: number | null;
  unit_count: number | null;
}

// Zod schemas for Supabase response validation (avoids unsafe `as T` casts)
const runSchema = z.object({
  id: z.string(),
  trailmix_id: z.string(),
  status: z.enum(['active', 'paused', 'cancelled', 'completed', 'failed']),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  total_cost: z.number().nullable(),
  user_id: z.string().nullable(),
});

const moduleSchema = z.object({
  id: z.string(),
  trailmix_id: z.string(),
  name: z.string(),
  url: z.string(),
  status: z.enum(['pending', 'scraping', 'scraped', 'processing', 'ready', 'quizzing', 'completed', 'failed']),
  priority: z.number(),
  badge_url: z.string().nullable(),
  badge_earned: z.boolean(),
  retry_count: z.number(),
  failure_reason: z.string().nullable().optional().default(null),
  type: z.string().nullable(),
  track: z.string().nullable(),
  estimated_minutes: z.number().nullable(),
  unit_count: z.number().nullable(),
  user_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Allowed Trailhead hostnames for SSRF protection
const ALLOWED_TRAILHEAD_HOSTS = ['trailhead.salesforce.com', 'trailhead.com'];

function isTrailheadUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    return ALLOWED_TRAILHEAD_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export async function discoverModules(trailmixUrl: string): Promise<DiscoveredModule[]> {
  let html: string;
  try {
    const response = await fetch(trailmixUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrailBlazeAI/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) return [];
    html = await response.text();
  } catch {
    return [];
  }

  const { parse } = await import('node-html-parser');
  const root = parse(html);

  // Look for anchor tags with Trailhead module URL patterns
  const moduleLinks = root.querySelectorAll('a[href*="/modules/"], a[href*="/trails/"]');
  const seen = new Set<string>();
  const modules: DiscoveredModule[] = [];

  for (const link of moduleLinks) {
    const href = link.getAttribute('href') ?? '';
    if (!href || seen.has(href)) continue;
    seen.add(href);

    const url = href.startsWith('http') ? href : `https://trailhead.salesforce.com${href}`;
    // Extract name from link text or URL slug
    const name = link.text.trim() || href.split('/').pop()?.replace(/-/g, ' ') || 'Unknown Module';

    modules.push({
      name,
      url,
      type: null,
      track: null,
      estimated_minutes: null,
      unit_count: null,
    });
  }

  return modules;
}

interface TrailmixImportRequest {
  url: string;
}

interface TrailmixImportResponse {
  run: Run;
  modules: Module[];
}

export const trailmixRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: TrailmixImportRequest; Reply: ApiResponse<TrailmixImportResponse> }>(
    '/api/trailmix/import',
    async (request, reply) => {
      try {
        // Validate URL format
        const bodySchema = z.object({
          url: z.string().url('URL must be a valid URL'),
        });

        const parseResult = bodySchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply
            .code(400)
            .send(error('VALIDATION_ERROR', 'URL must be a valid URL'));
        }

        const { url } = parseResult.data;

        // Validate Trailhead domain via hostname (prevents SSRF via substring bypass)
        if (!isTrailheadUrl(url)) {
          return reply
            .code(400)
            .send(error('VALIDATION_ERROR', 'Enter a valid Trailhead URL'));
        }

        // Create Supabase client
        const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey) as unknown;
        const supabaseTyped = supabase as {
          from: (table: string) => {
            insert: (obj: unknown) => {
              select: (col: string) => {
                single: () => Promise<{ data: unknown; error: unknown }>;
              };
            };
          };
        };

        // Discover modules from the Trailmix page
        const discoveredModules = await discoverModules(url);

        // Create run record
        const trailmixId = randomUUID();
        const { data: runData, error: runError } = await supabaseTyped
          .from('runs')
          .insert({
            trailmix_id: trailmixId,
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .select('*')
          .single();

        if (runError || !runData) {
          return reply
            .code(500)
            .send(error('PIPELINE_ERROR', 'Failed to create run record'));
        }

        const runParsed = runSchema.safeParse(runData);
        if (!runParsed.success) {
          app.log.error({ parseError: runParsed.error }, 'Run record failed schema validation');
          return reply
            .code(500)
            .send(error('PIPELINE_ERROR', 'Failed to create run record'));
        }
        const run: Run = runParsed.data;

        // Insert discovered modules and enqueue jobs
        const insertedModules: Module[] = [];

        for (const module of discoveredModules) {
          const { data: moduleData, error: moduleError } = await supabaseTyped
            .from('modules')
            .insert({
              trailmix_id: trailmixId,
              name: module.name,
              url: module.url,
              status: 'pending',
              type: module.type,
              track: module.track,
              estimated_minutes: module.estimated_minutes,
              unit_count: module.unit_count,
              priority: 5,
            })
            .select('*')
            .single();

          if (moduleError || !moduleData) {
            app.log.error({ error: moduleError, moduleName: module.name }, 'Failed to insert module');
            continue;
          }

          const moduleParsed = moduleSchema.safeParse(moduleData);
          if (!moduleParsed.success) {
            app.log.error({ parseError: moduleParsed.error, moduleName: module.name }, 'Module record failed schema validation');
            continue;
          }

          const insertedModule: Module = moduleParsed.data;
          insertedModules.push(insertedModule);

          // Enqueue scrape-module job
          await app.boss.send('scrape-module', {
            module_id: insertedModule.id,
          });
        }

        return reply.code(201).send(success({ run, modules: insertedModules }));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );
};
