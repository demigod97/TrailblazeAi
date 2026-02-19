'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChunkCard } from './chunk-card';
import { ChunkDetail } from './chunk-detail';

export interface KnowledgeSearchResult {
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

interface ApiSuccessBody {
  data: KnowledgeSearchResponse;
  error: null;
}

interface Props {
  initialQuery?: string;
}

export function KnowledgeSearchPanel({ initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [selectedChunk, setSelectedChunk] = useState<KnowledgeSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Debounce: wait 300ms after last keystroke before updating debouncedQuery
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch when debouncedQuery changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/knowledge/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`, {
      cache: 'no-store' as RequestCache,
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError('Search failed. Please try again.');
          setResults([]);
          return;
        }
        const body = (await res.json()) as ApiSuccessBody;
        if (!cancelled) {
          setResults(body.data?.results ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Search failed. Please try again.');
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleRelatedChunkClick = useCallback(
    (chunkId: string) => {
      const found = results.find((r) => r.id === chunkId);
      if (found) {
        setSelectedChunk(found);
      }
    },
    [results],
  );

  const isEmpty = !debouncedQuery.trim() && results.length === 0 && !isLoading;
  const hasNoResults =
    debouncedQuery.trim().length > 0 && results.length === 0 && !isLoading && !error;

  // Filter related_chunk_ids to only IDs present in the current results — prevents
  // rendering non-functional UUID buttons for chunks not available in the current search.
  const enrichedSelectedChunk = selectedChunk
    ? {
        ...selectedChunk,
        related_chunk_ids: selectedChunk.related_chunk_ids.filter((id) =>
          results.some((r) => r.id === id),
        ),
      }
    : null;

  return (
    <div className="flex h-full gap-0">
      {/* Left panel: search input + results */}
      <div className="flex flex-col w-[380px] min-w-[280px] border-r border-border h-full">
        {/* Search input */}
        <div className="p-4 border-b border-border">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search knowledge base..."
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md
                       focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                       placeholder:text-muted-foreground"
            aria-label="Search knowledge base"
          />
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Search results">
          {isLoading && (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 text-sm text-destructive">{error}</div>
          )}

          {isEmpty && !error && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Process some Trailhead modules to build your knowledge base.
            </div>
          )}

          {hasNoResults && !error && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </div>
          )}

          {results.map((chunk) => (
            <ChunkCard
              key={chunk.id}
              chunk={chunk}
              isSelected={selectedChunk?.id === chunk.id}
              onClick={() => setSelectedChunk(chunk)}
            />
          ))}
        </div>
      </div>

      {/* Right panel: detail view */}
      <div className="flex-1 h-full overflow-y-auto">
        {enrichedSelectedChunk ? (
          <ChunkDetail
            chunk={enrichedSelectedChunk}
            onRelatedChunkClick={handleRelatedChunkClick}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            {results.length > 0
              ? 'Select a result to view details'
              : 'Search to explore the knowledge base'}
          </div>
        )}
      </div>
    </div>
  );
}
