'use client';

export type FilterStatus = 'all' | 'active' | 'error' | 'done';

export interface FilterCounts {
  all: number;
  active: number;
  error: number;
  done: number;
}

interface FilterChipsProps {
  value: FilterStatus;
  counts: FilterCounts;
  onChange: (status: FilterStatus) => void;
}

export default function FilterChips({ value, counts, onChange }: FilterChipsProps) {
  const filters: Array<{ status: FilterStatus; label: string; count: number }> = [
    { status: 'all', label: 'All', count: counts.all },
    { status: 'active', label: 'Active', count: counts.active },
    { status: 'error', label: 'Error', count: counts.error },
    { status: 'done', label: 'Done', count: counts.done },
  ];

  return (
    <div role="radiogroup" className="flex gap-2 flex-wrap">
      {filters.map((filter) => (
        <button
          key={filter.status}
          role="radio"
          aria-checked={value === filter.status}
          onClick={() => onChange(filter.status)}
          className={`
            px-3 py-1 rounded-full text-sm font-medium
            transition-colors duration-100
            ${
              value === filter.status
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent border border-input hover:bg-accent'
            }
          `}
        >
          {filter.label} ({filter.count})
        </button>
      ))}
    </div>
  );
}
