import type { createClient } from '@trailblaze/db';
import { createPlaywrightMCP } from '../../lib/mcp-client.js';
import { detectLoginRedirect } from '../../lib/session-validator.js';
import { PipelineError, SessionExpiredError } from '../../lib/errors.js';

// Structural type for submit-answers Supabase operations
type SubmitAnswersClient = {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): {
        is(col: string, val: boolean | null): {
          order(col: string, opts?: { ascending: boolean }): Promise<{
            data: Array<unknown> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    update(data: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
  };
};

interface QuizResultForSubmit {
  id: string;
  unit_id: string;
  selected_answer: string;
  is_approved: boolean;
  quiz_items: {
    id: string;
    options: string[];
  };
  units: {
    id: string;
    url: string;
  };
}

/**
 * Submit approved quiz answers to Trailhead via Playwright MCP
 * - Navigate to each unit's quiz page
 * - Click each approved answer option
 * - Submit the quiz and read the result
 * - Update quiz_results with correct_answer and is_correct from feedback
 * - If all correct: set badge_earned=true and status='completed' on module
 */
export async function submitModuleAnswers(
  { module_id, run_id: _run_id }: { module_id: string; run_id: string | null },
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const startTime = Date.now();
  const db = supabase as unknown as SubmitAnswersClient;

  // 1. Fetch all approved quiz_results for this module
  const { data: results, error: queryError } = await db
    .from('quiz_results')
    .select(`
      id,
      unit_id,
      selected_answer,
      is_approved,
      quiz_items!inner (
        id,
        options
      ),
      units!inner (
        id,
        url
      )
    `)
    .eq('units.module_id', module_id)
    .is('is_approved', true)
    .order('created_at', { ascending: true });

  if (queryError) {
    throw new PipelineError('submit-answers', `Failed to fetch approved results: ${queryError.message}`);
  }

  const approvedResults = (results ?? []) as unknown as QuizResultForSubmit[];
  if (approvedResults.length === 0) {
    throw new PipelineError('submit-answers', `No approved quiz results found for module ${module_id}`);
  }

  // 2. Group by unit
  const unitGroups = new Map<string, QuizResultForSubmit[]>();
  for (const result of approvedResults) {
    if (!unitGroups.has(result.unit_id)) {
      unitGroups.set(result.unit_id, []);
    }
    unitGroups.get(result.unit_id)!.push(result);
  }

  // 3. Process each unit
  let allCorrect = true;
  const mcp = await createPlaywrightMCP();

  try {
    for (const [, unitResults] of unitGroups) {
      if (unitResults.length === 0) continue;

      const unit = unitResults[0]!.units;
      const unitUrl = unit.url;

      // Navigate to quiz page
      await mcp.callTool('browser_navigate', { url: unitUrl });

      // Check for session expiry
      const snapshotResult = await mcp.callTool('browser_snapshot', {});
      const snapshotUrl = extractUrlFromSnapshot(snapshotResult);
      if (snapshotUrl && detectLoginRedirect(snapshotUrl)) {
        throw new SessionExpiredError('Session expired during answer submission');
      }

      // Click each answer
      for (const result of unitResults) {
        const options = result.quiz_items.options;
        if (!options.includes(result.selected_answer)) {
          throw new PipelineError('submit-answers', `Answer "${result.selected_answer}" not in options for item ${result.quiz_items.id}`);
        }

        await mcp.callTool('browser_click', {
          element: result.selected_answer,
          ref: `answer-${result.id}`,
        });


        // Small delay between clicks
        await sleep(1000);
      }

      // Submit quiz
      await mcp.callTool('browser_click', { element: 'Check', ref: 'submit-quiz' });

      // Wait for result display
      await sleep(2000);

      // Get result snapshot and parse correct answers
      const resultSnapshot = await mcp.callTool('browser_snapshot', {});

      // Extract correct answers from snapshot and update results
      const snapshotText = extractTextFromSnapshot(resultSnapshot);
      for (const result of unitResults) {
        // Parse correct answer from Trailhead feedback (null if unable to determine)
        const correctAnswer = parseCorrectAnswerFromSnapshot(snapshotText, result.selected_answer);

        // Determine if this answer was correct — null correct_answer treated as incorrect
        const isCorrect = correctAnswer !== null && result.selected_answer === correctAnswer;
        if (!isCorrect) {
          allCorrect = false;
        }

        // Update quiz_result with correct_answer and is_correct
        const { error: updateError } = await db
          .from('quiz_results')
          .update({
            correct_answer: correctAnswer,
            is_correct: isCorrect,
          })
          .eq('id', result.id);

        if (updateError) {
          throw new PipelineError('submit-answers', `Failed to update result ${result.id}: ${updateError.message}`);
        }
      }
    }
  } finally {
    // MCP client cleanup (if needed)
  }

  // 4. Update module status and badge_earned
  if (allCorrect) {
    // All answers correct → mark completed and badge earned
    const { error: moduleError } = await db
      .from('modules')
      .update({ status: 'completed', badge_earned: true })
      .eq('id', module_id);

    if (moduleError) {
      throw new PipelineError('submit-answers', `Failed to update module status: ${moduleError.message}`);
    }
  }
  // If any wrong: leave module in 'quizzing' status (retry logic handled at queue level via dead-letter)

  // Log completion
  const duration = Date.now() - startTime;
  console.log(`[submit-answers] Module ${module_id} submitted in ${duration}ms, badge_earned=${allCorrect}`);
}

// --- Helper functions ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractUrlFromSnapshot(snapshot: unknown): string | null {
  if (snapshot === null || typeof snapshot !== 'object') return null;

  const snapObj = snapshot as Record<string, unknown>;
  if ('url' in snapObj && typeof snapObj.url === 'string') {
    return snapObj.url;
  }

  return null;
}

function extractTextFromSnapshot(snapshot: unknown): string {
  if (snapshot === null || typeof snapshot !== 'object') return '';

  const snapObj = snapshot as Record<string, unknown>;
  if (!('content' in snapObj) || !Array.isArray(snapObj.content)) return '';

  const content = snapObj.content as unknown[];
  return content
    .map((item) => {
      if (item === null || typeof item !== 'object') return '';
      const itemObj = item as Record<string, unknown>;
      if ('text' in itemObj && typeof itemObj.text === 'string') {
        return itemObj.text;
      }
      return '';
    })
    .join('\n');
}

function parseCorrectAnswerFromSnapshot(snapshotText: string, _selectedAnswer: string): string | null {
  // Look for "correct answer: X" or "correct answer is: X" patterns in Trailhead feedback
  const match = /correct answer[:\s]+([^\n]+)/i.exec(snapshotText);
  if (match?.[1]) {
    return match[1].trim();
  }
  // Return null — unable to determine correct answer from snapshot
  return null;
}
