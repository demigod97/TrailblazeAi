import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@trailblaze/db';
import { config } from '../config.js';
import { success, error } from '../lib/response.js';
import type { ApiResponse } from '../types/api.js';
import { AppError } from '../lib/errors.js';

// Structural type for knowledge_search() RPC (not in generated types)
type KnowledgeRpcClient = {
  rpc(
    fn: string,
    params: Record<string, unknown>,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>;
};

// Structural type for batch enrichment queries (.in() pattern)
type BatchSelectClient = {
  from(table: string): {
    select(cols: string): {
      in(col: string, vals: string[]): Promise<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
    };
  };
};

// Zod schema for raw rows from knowledge_search() RPC
const chunkRowSchema = z.object({
  id: z.string(),
  module_id: z.string().nullable(),
  unit_id: z.string().nullable(),
  chunk_text: z.string(),
  content_type: z.string().nullable(),
  difficulty: z.string().nullable(),
  sf_topics: z.array(z.string()).nullish().transform((v) => v ?? []),
  section_header: z.string().nullable(),
  relevance_score: z.number(),
});

// Zod schema for query params
const searchQuerySchema = z.object({
  q: z.string().min(1, 'Query text is required'),
  content_type: z.string().optional(),
  sf_topics: z.string().optional(), // comma-separated
  difficulty: z.string().optional(),
  module_name: z.string().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

interface KnowledgeSearchResult {
  id: string;
  chunk_text: string;
  content_type: string | null;
  difficulty: string | null;
  sf_topics: string[];
  section_header: string | null;
  module_id: string | null;
  unit_id: string | null;
  module_name: string | null;
  unit_title: string | null;
  relevance_score: number;
  related_chunk_ids: string[];
}

interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[];
  count: number;
  offset: number;
  limit: number;
}

export const knowledgeRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/knowledge/search
  app.get<{ Querystring: z.infer<typeof searchQuerySchema>; Reply: ApiResponse<KnowledgeSearchResponse> }>(
    '/api/knowledge/search',
    async (request, reply) => {
      try {
        // 1. Validate query params
        const parsed = searchQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          return reply.code(400).send(error('VALIDATION_ERROR', 'Invalid query params', parsed.error.flatten()));
        }
        const { q, content_type, sf_topics, difficulty, module_name, offset, limit } = parsed.data;

        // 2. Generate query embedding
        let queryEmbedding: number[];
        try {
          const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: q,
            maxRetries: 3,
          });
          queryEmbedding = embedding;
        } catch (embedErr) {
          const msg = embedErr instanceof Error ? embedErr.message : 'Embedding failed';
          app.log.error({ error: msg }, 'Failed to generate query embedding');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Failed to generate query embedding'));
        }

        // 3. Call knowledge_search() RPC with large match_count for filtering headroom
        const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
        const rpcClient = supabase as unknown as KnowledgeRpcClient;

        const { data: rawResults, error: rpcError } = await rpcClient.rpc('knowledge_search', {
          query_text: q,
          query_embedding: queryEmbedding,
          match_count: 50,
          full_text_weight: 1.5,
          semantic_weight: 1.0,
          rrf_k: 50,
        });

        if (rpcError) {
          app.log.error({ error: rpcError.message }, 'knowledge_search RPC failed');
          return reply.code(500).send(error('PIPELINE_ERROR', 'Search failed'));
        }

        // 4. Parse and validate raw results
        const rowsResult = z.array(chunkRowSchema).safeParse(rawResults ?? []);
        const rows = rowsResult.success ? rowsResult.data : [];

        // 5. Post-filter in TypeScript
        let filtered = rows;

        if (content_type) {
          filtered = filtered.filter(c => c.content_type === content_type);
        }
        if (difficulty) {
          filtered = filtered.filter(c => c.difficulty === difficulty);
        }
        if (sf_topics) {
          const topicsList = sf_topics.split(',').map(t => t.trim()).filter(Boolean);
          if (topicsList.length > 0) {
            filtered = filtered.filter(c =>
              topicsList.some(topic => (c.sf_topics ?? []).includes(topic)),
            );
          }
        }

        // 6. Batch-fetch units and modules for enrichment
        const batchClient = supabase as unknown as BatchSelectClient;

        const unitIds = [...new Set(filtered.map(c => c.unit_id).filter((id): id is string => id !== null))];
        const moduleIds = [...new Set(filtered.map(c => c.module_id).filter((id): id is string => id !== null))];

        const [unitsRes, modulesRes] = await Promise.all([
          unitIds.length > 0
            ? batchClient.from('units').select('id, title').in('id', unitIds)
            : Promise.resolve({ data: [], error: null }),
          moduleIds.length > 0
            ? batchClient.from('modules').select('id, name').in('id', moduleIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (unitsRes.error) {
          app.log.warn({ error: unitsRes.error.message }, 'Failed to batch-fetch units');
        }
        if (modulesRes.error) {
          app.log.warn({ error: modulesRes.error.message }, 'Failed to batch-fetch modules');
        }

        const unitMap = new Map<string, string>();
        for (const u of (unitsRes.data ?? [])) {
          const row = u as { id: string; title: string };
          unitMap.set(row.id, row.title);
        }

        const moduleMap = new Map<string, string>();
        for (const m of (modulesRes.data ?? [])) {
          const row = m as { id: string; name: string };
          moduleMap.set(row.id, row.name);
        }

        // 7. Apply module_name filter (after fetching module data)
        if (module_name) {
          const moduleNameLower = module_name.toLowerCase();
          filtered = filtered.filter(c => {
            if (!c.module_id) return false;
            const name = moduleMap.get(c.module_id) ?? '';
            return name.toLowerCase().includes(moduleNameLower);
          });
        }

        // 8. Batch-fetch related_chunk_ids
        const chunkIds = filtered.map(c => c.id);
        const relMap = new Map<string, string[]>();

        if (chunkIds.length > 0) {
          const [sourceRelsRes, targetRelsRes] = await Promise.all([
            batchClient
              .from('sf_concept_relationships')
              .select('source_chunk_id, target_chunk_id')
              .in('source_chunk_id', chunkIds),
            batchClient
              .from('sf_concept_relationships')
              .select('source_chunk_id, target_chunk_id')
              .in('target_chunk_id', chunkIds),
          ]);

          if (sourceRelsRes.error) {
            app.log.warn({ error: sourceRelsRes.error.message }, 'Failed to batch-fetch source relationships');
          }
          if (targetRelsRes.error) {
            app.log.warn({ error: targetRelsRes.error.message }, 'Failed to batch-fetch target relationships');
          }

          for (const rel of (sourceRelsRes.data ?? [])) {
            const row = rel as { source_chunk_id: string; target_chunk_id: string };
            if (!row.source_chunk_id || !row.target_chunk_id) continue;
            const existing = relMap.get(row.source_chunk_id) ?? [];
            relMap.set(row.source_chunk_id, [...existing, row.target_chunk_id]);
          }
          for (const rel of (targetRelsRes.data ?? [])) {
            const row = rel as { source_chunk_id: string; target_chunk_id: string };
            if (!row.source_chunk_id || !row.target_chunk_id) continue;
            const existing = relMap.get(row.target_chunk_id) ?? [];
            relMap.set(row.target_chunk_id, [...existing, row.source_chunk_id]);
          }
        }

        // 9. Paginate and assemble results
        const totalCount = filtered.length;
        const paginated = filtered.slice(offset, offset + limit);

        const results: KnowledgeSearchResult[] = paginated.map(c => ({
          id: c.id,
          chunk_text: c.chunk_text,
          content_type: c.content_type,
          difficulty: c.difficulty,
          sf_topics: c.sf_topics ?? [],
          section_header: c.section_header,
          module_id: c.module_id,
          unit_id: c.unit_id,
          module_name: c.module_id ? (moduleMap.get(c.module_id) ?? null) : null,
          unit_title: c.unit_id ? (unitMap.get(c.unit_id) ?? null) : null,
          relevance_score: c.relevance_score,
          related_chunk_ids: relMap.get(c.id) ?? [],
        }));

        return reply.send(success({ results, count: totalCount, offset, limit }));
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.status_code).send(error(err.code, err.message, err.details));
        }
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        app.log.error({ error: errMsg }, 'GET /api/knowledge/search error');
        return reply.code(500).send(error('INTERNAL_SERVER_ERROR', errMsg));
      }
    },
  );
};
