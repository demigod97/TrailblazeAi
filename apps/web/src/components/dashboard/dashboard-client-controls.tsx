'use client';

import { useState } from 'react';
import type { Module } from '@trailblaze/shared';
import FilterChips from './filter-chips';
import ModuleRow from './module-row';
import type { FilterStatus, FilterCounts } from './filter-chips';

interface DashboardClientControlsProps {
  modules: Module[];
  statCounts: FilterCounts;
}

export function DashboardClientControls({ modules, statCounts }: DashboardClientControlsProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');

  // Filter modules based on selected filter
  const filteredModules = modules.filter((module) => {
    if (filter === 'all') {
      return true;
    } else if (filter === 'active') {
      return ['scraping', 'scraped', 'processing'].includes(module.status);
    } else if (filter === 'error') {
      return module.status === 'failed';
    } else if (filter === 'done') {
      return module.status === 'completed';
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <FilterChips value={filter} counts={statCounts} onChange={setFilter} />
      <div className="space-y-2">
        {filteredModules.map((module) => (
          <ModuleRow key={module.id} module={module} />
        ))}
      </div>
    </div>
  );
}
