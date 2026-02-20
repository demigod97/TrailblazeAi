export function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.90 ? '#22c55e'
    : confidence >= 0.70 ? '#f59e0b'
    : '#ef4444';
  const isLow = confidence < 0.70;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Confidence</span>
        <span className="font-mono text-sm">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Confidence score"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 rounded-full bg-muted overflow-hidden"
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {isLow && (
        <p className="text-xs text-destructive">Low confidence — review carefully</p>
      )}
    </div>
  );
}
