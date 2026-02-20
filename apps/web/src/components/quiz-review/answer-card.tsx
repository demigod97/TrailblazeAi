'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfidenceBar } from './confidence-bar';
import { ReasoningView } from './reasoning-view';

export type QuizResultWithItem = {
  id: string;
  quiz_item_id: string;
  selected_answer: string;
  confidence_score: number;
  reasoning: string;
  attempt_number: number;
  is_approved: boolean | null;
  user_note: string | null;
  quiz_items: {
    id: string;
    question_text: string;
    options: string[];
    display_order: number;
    units: {
      id: string;
      title: string;
      modules: {
        id: string;
        name: string;
      };
    };
  };
};

export function AnswerCard({
  result,
  onApprove,
  onEdit,
  isEditMode,
  onCancelEdit,
  onEnterEditMode,
  selectedOverride,
  onSelectedOverrideChange,
}: {
  result: QuizResultWithItem;
  onApprove: () => void;
  onEdit: (answer: string, note: string) => void;
  isEditMode: boolean;
  onCancelEdit: () => void;
  onEnterEditMode: () => void;
  selectedOverride: string | null;
  onSelectedOverrideChange: (val: string | null) => void;
}) {
  const [editNote, setEditNote] = useState('');

  const handleSaveEdit = () => {
    onEdit(selectedOverride || result.selected_answer, editNote);
    onSelectedOverrideChange(null);
    setEditNote('');
  };

  const handleCancelEdit = () => {
    onSelectedOverrideChange(null);
    setEditNote('');
    onCancelEdit();
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
      <div>
        <h3 className="font-semibold text-sm mb-3">{result.quiz_items.question_text}</h3>

        <div className="space-y-2 mb-4">
          {isEditMode ? (
            <div className="space-y-2">
              {result.quiz_items.options.map((option) => (
                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={selectedOverride === option || (selectedOverride === null && option === result.selected_answer)}
                    onChange={() => onSelectedOverrideChange(option)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {result.quiz_items.options.map((option) => (
                <div
                  key={option}
                  className={`p-2 rounded border text-sm ${
                    option === result.selected_answer
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center">
                    {option === result.selected_answer && (
                      <span className="mr-2 text-indigo-600">✓</span>
                    )}
                    {option}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <ConfidenceBar confidence={result.confidence_score} />
        </div>

        <div className="mb-4">
          <ReasoningView reasoning={result.reasoning} />
        </div>
      </div>

      {isEditMode ? (
        <div className="space-y-3 border-t border-border pt-4">
          <div>
            <label htmlFor="edit-note" className="text-xs mb-2 block">
              Override note (optional)
            </label>
            <textarea
              id="edit-note"
              placeholder="Explain why you're overriding the AI's answer..."
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full text-sm min-h-20 p-2 border border-border rounded resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} className="flex-1">
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 border-t border-border pt-4">
          <Button size="sm" onClick={onApprove} className="flex-1">
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={onEnterEditMode} className="flex-1">
            Edit
          </Button>
        </div>
      )}
    </div>
  );
}
