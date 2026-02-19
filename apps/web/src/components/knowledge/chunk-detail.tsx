'use client';

import type { KnowledgeSearchResult } from './knowledge-search-panel';

interface Props {
  chunk: KnowledgeSearchResult;
  onRelatedChunkClick: (chunkId: string) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function ChunkDetail({ chunk, onRelatedChunkClick }: Props) {
  const difficultyColor =
    DIFFICULTY_COLORS[chunk.difficulty ?? ''] ?? 'bg-muted text-muted-foreground';

  return (
    <div className="p-6 max-w-3xl">
      {/* Metadata */}
      <div className="mb-4 space-y-2">
        {chunk.module_name && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{chunk.module_name}</span>
            {chunk.unit_title && <span> › {chunk.unit_title}</span>}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {chunk.content_type && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
              {chunk.content_type.replaceAll('_', ' ')}
            </span>
          )}
          {chunk.difficulty && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColor}`}
            >
              {chunk.difficulty}
            </span>
          )}
          {chunk.sf_topics.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Section header */}
      {chunk.section_header && (
        <h2 className="text-base font-semibold mb-3">{chunk.section_header}</h2>
      )}

      {/* Full content */}
      <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono bg-muted/30 rounded-md p-4 mb-4">
        {chunk.chunk_text}
      </div>

      {/* Related chunks */}
      {chunk.related_chunk_ids.length > 0 && (
        <div className="border-t border-border pt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Related Concepts
          </h3>
          <div className="flex flex-wrap gap-2">
            {chunk.related_chunk_ids.map((relId) => (
              <button
                key={relId}
                onClick={() => onRelatedChunkClick(relId)}
                className="text-xs text-primary hover:underline font-mono"
              >
                {relId.slice(0, 8)}…
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
