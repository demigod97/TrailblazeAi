'use client';

import { Code2, HelpCircle, BookOpen, Wrench, Link2, AlignLeft } from 'lucide-react';
import type { KnowledgeSearchResult } from './knowledge-search-panel';

interface Props {
  chunk: KnowledgeSearchResult;
  isSelected: boolean;
  onClick: () => void;
}

function ContentTypeIcon({ type }: { type: string | null }) {
  const cls = 'h-3.5 w-3.5 shrink-0';
  switch (type) {
    case 'code':
      return <Code2 className={cls} />;
    case 'quiz':
      return <HelpCircle className={cls} />;
    case 'explanation':
      return <BookOpen className={cls} />;
    case 'hands_on':
      return <Wrench className={cls} />;
    case 'reference':
      return <Link2 className={cls} />;
    case 'definition':
      return <AlignLeft className={cls} />;
    default:
      return <AlignLeft className={cls} />;
  }
}

function getTitle(chunk: KnowledgeSearchResult): string {
  if (chunk.section_header) return chunk.section_header;
  const labels: Record<string, string> = {
    explanation: 'Explanation',
    code: 'Code Example',
    quiz: 'Quiz Question',
    hands_on: 'Hands-On Step',
    reference: 'Reference',
    definition: 'Definition',
  };
  return labels[chunk.content_type ?? ''] ?? 'Knowledge Entry';
}

export function ChunkCard({ chunk, isSelected, onClick }: Props) {
  const title = getTitle(chunk);
  const snippet = chunk.chunk_text.slice(0, 120) + (chunk.chunk_text.length > 120 ? '…' : '');
  const score = chunk.relevance_score.toFixed(3);

  return (
    <button
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border hover:bg-accent/50
                  transition-colors cursor-pointer
                  ${isSelected ? 'border-l-2 border-l-primary bg-accent/30' : 'border-l-2 border-l-transparent'}`}
    >
      {/* Header row: icon + title + score */}
      <div className="flex items-start gap-2 mb-1">
        <span className="text-muted-foreground mt-0.5">
          <ContentTypeIcon type={chunk.content_type} />
        </span>
        <span className="flex-1 text-sm font-medium leading-tight line-clamp-1">{title}</span>
        <span className="font-mono text-xs text-muted-foreground shrink-0">{score}</span>
      </div>

      {/* Source module */}
      {chunk.module_name && (
        <div className="text-xs text-muted-foreground mb-1 ml-5 truncate">{chunk.module_name}</div>
      )}

      {/* Snippet */}
      <div className="text-xs text-muted-foreground ml-5 line-clamp-2 leading-relaxed">{snippet}</div>
    </button>
  );
}
