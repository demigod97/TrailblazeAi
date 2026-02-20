'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AnswerCard, type QuizResultWithItem } from './answer-card';

type ModuleGroup = {
  module_id: string;
  module_name: string;
  results: QuizResultWithItem[];
};

function groupByModule(results: QuizResultWithItem[]): ModuleGroup[] {
  const map = new Map<string, ModuleGroup>();
  for (const r of results) {
    const mod = r.quiz_items.units.modules;
    if (!map.has(mod.id)) {
      map.set(mod.id, { module_id: mod.id, module_name: mod.name, results: [] });
    }
    map.get(mod.id)!.results.push(r);
  }
  return Array.from(map.values());
}

// Structural type for Supabase browser client DB writes
type SupabaseWriteClient = {
  from(table: string): {
    update(data: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: unknown }>;
    };
  };
};

async function fetchPendingResults(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from('quiz_results')
    .select(`
      id,
      quiz_item_id,
      selected_answer,
      confidence_score,
      reasoning,
      attempt_number,
      is_approved,
      user_note,
      quiz_items (
        id,
        question_text,
        options,
        display_order,
        units (
          id,
          title,
          modules (
            id,
            name
          )
        )
      )
    `)
    .is('is_approved', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch pending quiz results:', error);
    return [];
  }

  return (data as unknown as QuizResultWithItem[]) || [];
}

export function ReviewPanel() {
  const router = useRouter();
  // Stable supabase client — created once to avoid identity changes on re-render
  const [supabase] = useState(createClient);

  const [pendingResults, setPendingResults] = useState<QuizResultWithItem[]>([]);
  const [moduleGroups, setModuleGroups] = useState<ModuleGroup[]>([]);
  const [moduleGroupIndex, setModuleGroupIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  // Fetch pending results on mount
  useEffect(() => {
    const loadPendingResults = async () => {
      setLoading(true);
      const results = await fetchPendingResults(supabase);
      setPendingResults(results);
      setLoading(false);
    };

    loadPendingResults();
  }, [supabase]);

  // Update module groups when pending results change
  useEffect(() => {
    const groups = groupByModule(pendingResults);
    setModuleGroups(groups);
  }, [pendingResults]);

  // Setup Realtime subscription for new quiz results
  useEffect(() => {
    const channel = supabase
      .channel('quiz-results-review')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quiz_results',
        },
        async () => {
          const results = await fetchPendingResults(supabase);
          setPendingResults(results);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleApprove = useCallback(async () => {
    if (moduleGroups.length === 0 || moduleGroupIndex >= moduleGroups.length) return;

    const currentModule = moduleGroups[moduleGroupIndex];
    if (!currentModule || questionIndex >= currentModule.results.length) return;

    const current = currentModule.results[questionIndex];
    if (!current) return; // explicit guard — prevents silent write against '' id

    const dbClient = supabase as unknown as SupabaseWriteClient;
    await dbClient.from('quiz_results').update({ is_approved: true }).eq('id', current.id);

    setSelectedOverride(null); // reset override on question advance
    const newApprovedCount = approvedCount + 1;
    setApprovedCount(newApprovedCount);

    // Check if there's a next question in this module
    if (questionIndex < currentModule.results.length - 1) {
      setQuestionIndex(q => q + 1);
    } else {
      // Module complete - check if there's another module
      if (moduleGroupIndex < moduleGroups.length - 1) {
        setModuleGroupIndex(m => m + 1);
        setQuestionIndex(0);
        setApprovedCount(0);
      } else {
        // All reviews complete — show "Ready to submit" then refresh
        setIsComplete(true);
        router.refresh();
      }
    }
  }, [moduleGroups, moduleGroupIndex, questionIndex, approvedCount, supabase, router]);

  const handleEdit = useCallback(async (answer: string, note: string) => {
    if (moduleGroups.length === 0 || moduleGroupIndex >= moduleGroups.length) return;

    const currentModule = moduleGroups[moduleGroupIndex];
    if (!currentModule || questionIndex >= currentModule.results.length) return;

    const current = currentModule.results[questionIndex];
    if (!current) return; // explicit guard — prevents silent write against '' id

    const dbClient = supabase as unknown as SupabaseWriteClient;
    await dbClient
      .from('quiz_results')
      .update({
        selected_answer: answer,
        is_approved: true,
        user_note: note || null,
      })
      .eq('id', current.id);

    setIsEditMode(false);
    setSelectedOverride(null); // reset override on question advance
    const newApprovedCount = approvedCount + 1;
    setApprovedCount(newApprovedCount);

    // Check if there's a next question in this module
    if (questionIndex < currentModule.results.length - 1) {
      setQuestionIndex(q => q + 1);
    } else {
      // Module complete - check if there's another module
      if (moduleGroupIndex < moduleGroups.length - 1) {
        setModuleGroupIndex(m => m + 1);
        setQuestionIndex(0);
        setApprovedCount(0);
      } else {
        // All reviews complete — show "Ready to submit" then refresh
        setIsComplete(true);
        router.refresh();
      }
    }
  }, [moduleGroups, moduleGroupIndex, questionIndex, approvedCount, supabase, router]);

  // Setup keyboard shortcuts — handleApprove is stable via useCallback, preventing stale closures
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isEditMode) {
        e.preventDefault();
        void handleApprove();
      }
      if (e.key === 'e' && !isEditMode) {
        e.preventDefault();
        setIsEditMode(true);
      }
      if (e.key === 'Escape' && isEditMode) {
        e.preventDefault();
        setIsEditMode(false);
        setSelectedOverride(null); // reset override on Escape — fixes AC4 "reverts to original"
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isEditMode, handleApprove]);

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setSelectedOverride(null); // reset override on cancel
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
  };

  // Show "Ready to submit" state when all reviews are approved
  if (isComplete) {
    return (
      <div className="flex flex-col h-screen border-l bg-card items-center justify-center p-4">
        <p className="text-sm text-center font-medium">Ready to submit</p>
      </div>
    );
  }

  // Return null if no pending results
  if (!loading && moduleGroups.length === 0) {
    return null;
  }

  if (loading || moduleGroups.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (moduleGroupIndex >= moduleGroups.length) {
    return null;
  }

  const currentModule = moduleGroups[moduleGroupIndex];
  if (!currentModule || questionIndex >= currentModule.results.length) {
    return null;
  }

  const current = currentModule.results[questionIndex];
  const progressText = `${currentModule.module_name} — ${approvedCount}/${currentModule.results.length} reviewed`;

  return (
    <div className="flex flex-col h-screen border-l bg-card">
      {/* Header */}
      <div className="border-b p-4 sticky top-0 bg-card z-10">
        <h2 className="text-sm font-semibold">{progressText}</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {current && (
          <AnswerCard
            key={current.id}
            result={current}
            onApprove={handleApprove}
            onEdit={handleEdit}
            isEditMode={isEditMode}
            onCancelEdit={handleCancelEdit}
            onEnterEditMode={handleEnterEditMode}
            selectedOverride={selectedOverride}
            onSelectedOverrideChange={setSelectedOverride}
          />
        )}
      </div>
    </div>
  );
}
