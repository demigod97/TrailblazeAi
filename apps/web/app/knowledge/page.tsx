import { KnowledgeSearchPanel } from '@/components/knowledge';

interface SearchParams {
  q?: string;
}

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const initialQuery = params.q ?? '';

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h1 className="text-lg font-semibold">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">
          Salesforce knowledge from your Trailhead modules
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <KnowledgeSearchPanel initialQuery={initialQuery} />
      </div>
    </div>
  );
}
