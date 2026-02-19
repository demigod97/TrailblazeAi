import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreateClient, mockDbFrom, mockDbUpdate, mockDbNot } = vi.hoisted(() => {
  const mockDbUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const mockDbUpdate = vi.fn().mockReturnValue({ eq: mockDbUpdateEq });
  const mockDbNot = vi.fn().mockResolvedValue({ error: null, data: [] });
  const mockDbFrom = vi.fn().mockReturnValue({
    update: mockDbUpdate,
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        not: mockDbNot,
      }),
    }),
  });
  const mockCreateClient = vi.fn().mockReturnValue({ from: mockDbFrom });
  return { mockCreateClient, mockDbFrom, mockDbUpdate, mockDbNot };
});
vi.mock('@trailblaze/db', () => ({ createClient: mockCreateClient }));

const { mockScrapeModule } = vi.hoisted(() => {
  const mockScrapeModule = vi.fn().mockResolvedValue(undefined);
  return { mockScrapeModule };
});
vi.mock('./stages/scrape-unit.js', () => ({ scrapeModule: mockScrapeModule }));

const { mockExtractUnitContent } = vi.hoisted(() => {
  const mockExtractUnitContent = vi.fn().mockResolvedValue(undefined);
  return { mockExtractUnitContent };
});
vi.mock('./stages/extract-content.js', () => ({ extractUnitContent: mockExtractUnitContent }));

const { mockIdentifyUnitConcepts } = vi.hoisted(() => {
  const mockIdentifyUnitConcepts = vi.fn().mockResolvedValue(undefined);
  return { mockIdentifyUnitConcepts };
});
vi.mock('./stages/identify-concepts.js', () => ({ identifyUnitConcepts: mockIdentifyUnitConcepts }));

const { mockChunkUnitContent } = vi.hoisted(() => {
  const mockChunkUnitContent = vi.fn().mockResolvedValue(undefined);
  return { mockChunkUnitContent };
});
vi.mock('./stages/chunk-content.js', () => ({ chunkUnitContent: mockChunkUnitContent }));

const { mockGenerateUnitEmbeddings } = vi.hoisted(() => {
  const mockGenerateUnitEmbeddings = vi.fn().mockResolvedValue(undefined);
  return { mockGenerateUnitEmbeddings };
});
vi.mock('./stages/generate-embeddings.js', () => ({ generateUnitEmbeddings: mockGenerateUnitEmbeddings }));

const { mockBuildUnitRelationships } = vi.hoisted(() => {
  const mockBuildUnitRelationships = vi.fn().mockResolvedValue(undefined);
  return { mockBuildUnitRelationships };
});
vi.mock('./stages/build-relationships.js', () => ({ buildUnitRelationships: mockBuildUnitRelationships }));

import PgBoss from 'pg-boss';
import { registerQueueHandlers } from './queue-handlers.js';
import { SessionExpiredError, PipelineError } from '../lib/errors.js';

describe('Queue Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockDbFrom to its default implementation
    mockDbFrom.mockImplementation((_table: string) => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: mockDbNot,
          }),
        }),
        update: mockDbUpdate,
      };
    });
  });

  describe('registerQueueHandlers', () => {
    it('registers scrape-module queue worker', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const scrapeModuleCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'scrape-module');
      expect(scrapeModuleCall).toBeDefined();
    });

    it('registers scrape-module with teamSize: 2 and teamConcurrency: 2', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const scrapeModuleCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'scrape-module');
      expect(scrapeModuleCall?.[1]).toEqual({
        teamSize: 2,
        teamConcurrency: 2,
      });
    });

    it('registers extract-content queue worker', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const extractContentCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'extract-content');
      expect(extractContentCall).toBeDefined();
    });

    it('registers extract-content with teamSize: 5 and teamConcurrency: 5', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const extractContentCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'extract-content');
      expect(extractContentCall?.[1]).toEqual({
        teamSize: 5,
        teamConcurrency: 5,
      });
    });

    it('scrape-module handler calls scrapeModule with job data', async () => {
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          if (queue === 'scrape-module') {
            await handler({
              data: { module_id: 'mod-1', run_id: 'run-1' },
            });
          }
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      expect(mockScrapeModule).toHaveBeenCalledWith(
        expect.objectContaining({
          module_id: 'mod-1',
          run_id: 'run-1',
        }),
        expect.anything(),
      );
    });

    it('extract-content handler calls extractUnitContent with job data', async () => {
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          if (queue === 'extract-content') {
            await handler({
              data: { unit_id: 'unit-1', run_id: 'run-1' },
            });
          }
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      expect(mockExtractUnitContent).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_id: 'unit-1',
          run_id: 'run-1',
        }),
        expect.anything(),
      );
    });

    it('scrape-module handler rethrows errors for pg-boss retry mechanism', async () => {
      const testError = new Error('Scrape failed');
      mockScrapeModule.mockRejectedValueOnce(testError);

      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const scrapeHandler = handlers.find((h) => h.queue === 'scrape-module')?.handler;
      expect(scrapeHandler).toBeDefined();

      if (scrapeHandler) {
        await expect(
          scrapeHandler({
            data: { module_id: 'mod-1', run_id: 'run-1' },
          }),
        ).rejects.toThrow('Scrape failed');
      }
    });

    it('scrape-module handler updates module retry_count when scrapeModule throws', async () => {
      mockScrapeModule.mockRejectedValueOnce(new Error('Scrape failed'));

      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const scrapeHandler = handlers.find((h) => h.queue === 'scrape-module')?.handler;
      if (scrapeHandler) {
        await expect(
          scrapeHandler({ data: { module_id: 'mod-1', run_id: 'run-1' }, retryCount: 1 }),
        ).rejects.toThrow('Scrape failed');

        expect(mockDbFrom).toHaveBeenCalledWith('modules');
        expect(mockDbUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ retry_count: 1 }),
        );
      }
    });

    it('scrape-module handler sends extract-content jobs for each scraped unit', async () => {
      // Configure mock to return a scraped unit for the chaining query
      mockDbNot.mockResolvedValueOnce({ error: null, data: [{ id: 'unit-1' }] });

      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const scrapeHandler = handlers.find((h) => h.queue === 'scrape-module')?.handler;
      if (scrapeHandler) {
        await scrapeHandler({ data: { module_id: 'mod-1', run_id: 'run-1' } });
        expect(mockBoss.send).toHaveBeenCalledWith('extract-content', { unit_id: 'unit-1', module_id: 'mod-1', run_id: 'run-1' });
      }
    });

    it('scrape-module handler throws PipelineError if chaining query fails', async () => {
      mockDbNot.mockResolvedValueOnce({ error: { message: 'DB error' }, data: null });

      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const scrapeHandler = handlers.find((h) => h.queue === 'scrape-module')?.handler;
      if (scrapeHandler) {
        await expect(
          scrapeHandler({ data: { module_id: 'mod-1', run_id: 'run-1' } }),
        ).rejects.toThrow('Failed to query scraped units');
      }
    });

    it('scrape-module handler updates retry_count when catch fires', async () => {
      mockScrapeModule.mockRejectedValueOnce(new Error('Scrape failed'));

      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const scrapeHandler = handlers.find((h) => h.queue === 'scrape-module')?.handler;
      if (scrapeHandler) {
        await expect(
          scrapeHandler({ data: { module_id: 'mod-1', run_id: 'run-1' }, retryCount: 1 }),
        ).rejects.toThrow('Scrape failed');

        expect(mockDbFrom).toHaveBeenCalledWith('modules');
        expect(mockDbUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ retry_count: 1 }),
        );
      }
    });

    it('scrape-module handler does NOT update status to failed on transient failure', async () => {
      mockScrapeModule.mockRejectedValueOnce(new Error('Scrape failed'));

      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const scrapeHandler = handlers.find((h) => h.queue === 'scrape-module')?.handler;
      if (scrapeHandler) {
        await expect(
          scrapeHandler({ data: { module_id: 'mod-1', run_id: 'run-1' }, retryCount: 1 }),
        ).rejects.toThrow('Scrape failed');

        const updateCalls = mockDbUpdate.mock.calls;
        const hasFailedStatus = updateCalls.some((call: any) =>
          call[0]?.status === 'failed'
        );
        expect(hasFailedStatus).toBe(false);
      }
    });

    it('registers dead-letter-scrape-module handler', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const deadLetterCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'dead-letter-scrape-module');
      expect(deadLetterCall).toBeDefined();
    });

    it('dead-letter-scrape-module handler updates module status to failed with retry_count: 3', async () => {
      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const deadLetterHandler = handlers.find((h) => h.queue === 'dead-letter-scrape-module')?.handler;
      expect(deadLetterHandler).toBeDefined();

      if (deadLetterHandler) {
        await deadLetterHandler({
          data: { module_id: 'mod-1', run_id: null },
          retryCount: 3,
        });

        expect(mockDbFrom).toHaveBeenCalledWith('modules');
        expect(mockDbUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'failed',
            retry_count: 3,
          }),
        );
      }
    });

    it('scrape-module handler calls boss.pause when SessionExpiredError is thrown', async () => {
      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn().mockResolvedValue(undefined),
      };

      mockScrapeModule.mockRejectedValueOnce(new SessionExpiredError('Session expired'));

      await registerQueueHandlers(mockBoss as any);

      const scrapeModuleHandler = handlers.find((h) => h.queue === 'scrape-module')?.handler;
      expect(scrapeModuleHandler).toBeDefined();

      if (scrapeModuleHandler) {
        await scrapeModuleHandler({
          data: { module_id: 'mod-1', run_id: 'run-1' },
          retryCount: 0,
        });

        expect(mockBoss.pause).toHaveBeenCalledWith('scrape-module');
      }
    });

    it('scrape-module handler updates module with status failed and failure_reason when SessionExpiredError is thrown', async () => {
      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn().mockResolvedValue(undefined),
      };

      mockScrapeModule.mockRejectedValueOnce(new SessionExpiredError('Session expired'));

      await registerQueueHandlers(mockBoss as any);

      const scrapeModuleHandler = handlers.find((h) => h.queue === 'scrape-module')?.handler;
      expect(scrapeModuleHandler).toBeDefined();

      if (scrapeModuleHandler) {
        await scrapeModuleHandler({
          data: { module_id: 'mod-1', run_id: 'run-1' },
          retryCount: 0,
        });

        expect(mockDbUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'failed',
            failure_reason: 'session_expired',
          }),
        );
      }
    });

    it('scrape-module handler does NOT throw when SessionExpiredError is caught (returns normally)', async () => {
      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn().mockResolvedValue(undefined),
      };

      mockScrapeModule.mockRejectedValueOnce(new SessionExpiredError('Session expired'));

      await registerQueueHandlers(mockBoss as any);

      const scrapeModuleHandler = handlers.find((h) => h.queue === 'scrape-module')?.handler;
      expect(scrapeModuleHandler).toBeDefined();

      if (scrapeModuleHandler) {
        // Should not throw — session expiry is handled gracefully
        await expect(
          scrapeModuleHandler({
            data: { module_id: 'mod-1', run_id: 'run-1' },
            retryCount: 0,
          }),
        ).resolves.toBeUndefined();
      }
    });

    it('scrape-module handler still throws and calls pause is NOT called for non-session errors', async () => {
      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn().mockResolvedValue(undefined),
      };

      mockScrapeModule.mockRejectedValueOnce(new PipelineError('scrape-module', 'Some other error'));

      await registerQueueHandlers(mockBoss as any);

      const scrapeModuleHandler = handlers.find((h) => h.queue === 'scrape-module')?.handler;
      expect(scrapeModuleHandler).toBeDefined();

      if (scrapeModuleHandler) {
        // Non-session errors should still throw and not call pause
        await expect(
          scrapeModuleHandler({
            data: { module_id: 'mod-1', run_id: 'run-1' },
            retryCount: 0,
          }),
        ).rejects.toThrow(PipelineError);
        expect(mockBoss.pause).not.toHaveBeenCalled();
      }
    });

    it('registers identify-concepts queue worker', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const identifyConceptsCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'identify-concepts');
      expect(identifyConceptsCall).toBeDefined();
    });

    it('registers identify-concepts with teamSize: 5 and teamConcurrency: 5', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const identifyConceptsCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'identify-concepts');
      expect(identifyConceptsCall?.[1]).toEqual({
        teamSize: 5,
        teamConcurrency: 5,
      });
    });

    it('identify-concepts handler calls identifyUnitConcepts with job data', async () => {
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          if (queue === 'identify-concepts') {
            await handler({
              data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
            });
          }
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      expect(mockIdentifyUnitConcepts).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_id: 'unit-1',
          run_id: 'run-1',
        }),
        expect.anything(),
      );
    });

    it('identify-concepts handler chains to chunk-content via boss.send', async () => {
      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const identifyConceptsHandler = handlers.find((h) => h.queue === 'identify-concepts')?.handler;
      if (identifyConceptsHandler) {
        await identifyConceptsHandler({
          data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
        });
        expect(mockBoss.send).toHaveBeenCalledWith('chunk-content', {
          unit_id: 'unit-1',
          module_id: 'module-1',
          run_id: 'run-1',
        });
      }
    });

    it('identify-concepts handler rethrows on error', async () => {
      const testError = new Error('Identify concepts failed');
      mockIdentifyUnitConcepts.mockRejectedValueOnce(testError);

      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const identifyConceptsHandler = handlers.find((h) => h.queue === 'identify-concepts')?.handler;
      expect(identifyConceptsHandler).toBeDefined();

      if (identifyConceptsHandler) {
        await expect(
          identifyConceptsHandler({
            data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
          }),
        ).rejects.toThrow('Identify concepts failed');
      }
    });

    it('registers chunk-content queue worker', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const chunkContentCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'chunk-content');
      expect(chunkContentCall).toBeDefined();
    });

    it('registers chunk-content with teamSize: 5 and teamConcurrency: 5', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const chunkContentCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'chunk-content');
      expect(chunkContentCall?.[1]).toEqual({
        teamSize: 5,
        teamConcurrency: 5,
      });
    });

    it('chunk-content handler calls chunkUnitContent with job data', async () => {
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          if (queue === 'chunk-content') {
            await handler({
              data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
            });
          }
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      expect(mockChunkUnitContent).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_id: 'unit-1',
          module_id: 'module-1',
          run_id: 'run-1',
        }),
        expect.anything(),
      );
    });

    it('chunk-content handler chains to generate-embeddings via boss.send', async () => {
      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const chunkContentHandler = handlers.find((h) => h.queue === 'chunk-content')?.handler;
      if (chunkContentHandler) {
        await chunkContentHandler({
          data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
        });
        expect(mockBoss.send).toHaveBeenCalledWith('generate-embeddings', {
          unit_id: 'unit-1',
          module_id: 'module-1',
          run_id: 'run-1',
        });
      }
    });

    it('chunk-content handler rethrows on error', async () => {
      const testError = new Error('Chunk content failed');
      mockChunkUnitContent.mockRejectedValueOnce(testError);

      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const chunkContentHandler = handlers.find((h) => h.queue === 'chunk-content')?.handler;
      expect(chunkContentHandler).toBeDefined();

      if (chunkContentHandler) {
        await expect(
          chunkContentHandler({
            data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
          }),
        ).rejects.toThrow('Chunk content failed');
      }
    });

    it('identify-concepts handler updates module status to processing if first unit', async () => {
      const handlers: unknown[] = [];
      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const mockSelectEq = vi.fn().mockResolvedValue({
        data: [{ status: 'scraped' }],
        error: null,
      });

      // Override the mockDbFrom to handle both modules and units queries
      const originalMockDbFrom = mockDbFrom;
      mockDbFrom.mockImplementation((table: string) => {
        if (table === 'modules') {
          return {
            select: vi.fn().mockReturnValue({
              eq: mockSelectEq,
            }),
            update: mockUpdateFn,
          };
        }
        return originalMockDbFrom.call(this, table);
      });

      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: unknown) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as unknown as PgBoss);

      const identifyConceptsHandler = (handlers as Array<{ queue: string; handler: (job: unknown) => Promise<void> }>).find((h) => h.queue === 'identify-concepts')?.handler;
      if (identifyConceptsHandler) {
        await identifyConceptsHandler({
          data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
        });

        // Assert that update was called with { status: 'processing' } — not just that eq() was called
        expect(mockUpdateFn).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'processing' }),
        );
      }
    });

    it('registers generate-embeddings queue worker', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const generateEmbeddingsCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'generate-embeddings');
      expect(generateEmbeddingsCall).toBeDefined();
    });

    it('registers generate-embeddings with teamSize: 5 and teamConcurrency: 5', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const generateEmbeddingsCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'generate-embeddings');
      expect(generateEmbeddingsCall?.[1]).toEqual({
        teamSize: 5,
        teamConcurrency: 5,
      });
    });

    it('generate-embeddings handler calls generateUnitEmbeddings with job data', async () => {
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          if (queue === 'generate-embeddings') {
            await handler({
              data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
            });
          }
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      expect(mockGenerateUnitEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_id: 'unit-1',
          module_id: 'module-1',
          run_id: 'run-1',
        }),
        expect.anything(),
      );
    });

    it('generate-embeddings handler chains to build-relationships via boss.send', async () => {
      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const generateEmbeddingsHandler = handlers.find((h) => h.queue === 'generate-embeddings')?.handler;
      if (generateEmbeddingsHandler) {
        await generateEmbeddingsHandler({
          data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
        });
        expect(mockBoss.send).toHaveBeenCalledWith('build-relationships', {
          unit_id: 'unit-1',
          module_id: 'module-1',
          run_id: 'run-1',
        });
      }
    });

    it('generate-embeddings handler rethrows on error', async () => {
      const testError = new Error('Embeddings generation failed');
      mockGenerateUnitEmbeddings.mockRejectedValueOnce(testError);

      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const generateEmbeddingsHandler = handlers.find((h) => h.queue === 'generate-embeddings')?.handler;
      expect(generateEmbeddingsHandler).toBeDefined();

      if (generateEmbeddingsHandler) {
        await expect(
          generateEmbeddingsHandler({
            data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
          }),
        ).rejects.toThrow('Embeddings generation failed');
      }
    });

    it('registers build-relationships queue worker', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const buildRelationshipsCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'build-relationships');
      expect(buildRelationshipsCall).toBeDefined();
    });

    it('registers build-relationships with teamSize: 5 and teamConcurrency: 5', async () => {
      const mockBoss = {
        work: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const buildRelationshipsCall = mockBoss.work.mock.calls.find((call: unknown[]) => call[0] === 'build-relationships');
      expect(buildRelationshipsCall?.[1]).toEqual({ teamSize: 5, teamConcurrency: 5 });
    });

    it('build-relationships handler calls buildUnitRelationships with job data', async () => {
      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const buildRelationshipsHandler = handlers.find((h) => h.queue === 'build-relationships')?.handler;
      expect(buildRelationshipsHandler).toBeDefined();

      if (buildRelationshipsHandler) {
        await buildRelationshipsHandler({
          data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
        });
        expect(mockBuildUnitRelationships).toHaveBeenCalledWith(
          { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
          expect.anything(),
        );
      }
    });

    it('build-relationships handler rethrows on error', async () => {
      const testError = new Error('Build relationships failed');
      mockBuildUnitRelationships.mockRejectedValueOnce(testError);

      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const buildRelationshipsHandler = handlers.find((h) => h.queue === 'build-relationships')?.handler;
      expect(buildRelationshipsHandler).toBeDefined();

      if (buildRelationshipsHandler) {
        await expect(
          buildRelationshipsHandler({
            data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
          }),
        ).rejects.toThrow('Build relationships failed');
      }
    });

    it('build-relationships handler succeeds without error when all db calls succeed', async () => {
      const handlers: any[] = [];
      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const buildRelationshipsHandler = handlers.find((h) => h.queue === 'build-relationships')?.handler;
      expect(buildRelationshipsHandler).toBeDefined();

      if (buildRelationshipsHandler) {
        // Should not throw with default mocks
        await expect(
          buildRelationshipsHandler({
            data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
          }),
        ).resolves.not.toThrow();
      }
    });

    it('build-relationships handler updates module status to ready when all units have embeddings', async () => {
      const handlers: any[] = [];
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockModuleUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      mockDbFrom.mockImplementation((table: string) => {
        if (table === 'units') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'unit-1' }], error: null }),
            }),
          };
        }
        if (table === 'sf_knowledge_chunks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({ data: [{ unit_id: 'unit-1' }], error: null }),
              }),
            }),
          };
        }
        // 'modules' and others
        return { select: vi.fn(), update: mockModuleUpdate };
      });

      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const buildRelationshipsHandler = handlers.find((h) => h.queue === 'build-relationships')?.handler;
      if (buildRelationshipsHandler) {
        await buildRelationshipsHandler({
          data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
        });
        expect(mockModuleUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'ready' }),
        );
      }
    });

    it('build-relationships handler does NOT update module status when not all units have embeddings', async () => {
      const handlers: any[] = [];
      const mockModuleUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockDbFrom.mockImplementation((table: string) => {
        if (table === 'units') {
          return {
            select: vi.fn().mockReturnValue({
              // 2 total units in module
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'unit-1' }, { id: 'unit-2' }], error: null }),
            }),
          };
        }
        if (table === 'sf_knowledge_chunks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                // Only 1 unit has embeddings — pipeline not complete
                not: vi.fn().mockResolvedValue({ data: [{ unit_id: 'unit-1' }], error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn(), update: mockModuleUpdate };
      });

      const mockBoss = {
        work: vi.fn().mockImplementation(async (queue: string, _options: unknown, handler: any) => {
          handlers.push({ queue, handler });
        }),
        send: vi.fn().mockResolvedValue(undefined),
      };

      await registerQueueHandlers(mockBoss as any);

      const buildRelationshipsHandler = handlers.find((h) => h.queue === 'build-relationships')?.handler;
      if (buildRelationshipsHandler) {
        await buildRelationshipsHandler({
          data: { unit_id: 'unit-1', module_id: 'module-1', run_id: 'run-1' },
        });
        // update should NOT have been called with { status: 'ready' }
        const readyCalls = (mockModuleUpdate as ReturnType<typeof vi.fn>).mock.calls.filter(
          (call: any[]) => (call[0] as Record<string, unknown>)?.['status'] === 'ready',
        );
        expect(readyCalls.length).toBe(0);
      }
    });
  });
});
