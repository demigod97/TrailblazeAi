import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  loading?: boolean;
}

export default function StatCard({ label, value, subLabel, loading = false }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="space-y-1">
        {loading ? (
          <>
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-20" />
          </>
        ) : (
          <>
            <div className="font-mono text-3xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
            {subLabel && <div className="text-xs text-muted-foreground">{subLabel}</div>}
          </>
        )}
      </div>
    </Card>
  );
}
