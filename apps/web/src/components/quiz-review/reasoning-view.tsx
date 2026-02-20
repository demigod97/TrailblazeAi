'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReasoningView({ reasoning }: { reasoning: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-start text-sm"
      >
        <ChevronDown
          className="mr-2 h-4 w-4 transition-transform"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
        {isExpanded ? 'Hide reasoning' : 'Show reasoning'}
      </Button>

      {isExpanded && (
        <pre className="rounded border border-border bg-muted p-3 text-xs overflow-auto max-h-32 whitespace-pre-wrap break-words">
          {reasoning}
        </pre>
      )}
    </div>
  );
}
