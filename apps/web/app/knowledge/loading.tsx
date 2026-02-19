export default function KnowledgeLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="h-6 bg-muted rounded w-32 animate-pulse mb-1" />
        <div className="h-4 bg-muted rounded w-56 animate-pulse" />
      </div>
      <div className="flex flex-1 min-h-0">
        {/* Left panel skeleton */}
        <div className="w-[380px] border-r border-border p-4 space-y-4">
          <div className="h-9 bg-muted rounded animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2 p-3 border border-border rounded-md">
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
              <div className="h-3 bg-muted rounded w-full animate-pulse" />
            </div>
          ))}
        </div>
        {/* Right panel skeleton */}
        <div className="flex-1 p-6 space-y-4">
          <div className="h-5 bg-muted rounded w-48 animate-pulse" />
          <div className="h-4 bg-muted rounded w-32 animate-pulse" />
          <div className="h-48 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
