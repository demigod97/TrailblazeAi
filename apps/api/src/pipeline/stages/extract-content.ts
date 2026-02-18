import { parse, HTMLElement as HtmlElement, Node as HtmlNode } from 'node-html-parser';
import { createClient } from '@trailblaze/db';
import { PipelineError } from '../../lib/errors.js';

export interface ExtractContentInput {
  unit_id: string;
  run_id: string | null;
}

export interface ExtractedQuizQuestion {
  question_text: string;
  options: string[];
  selector_hints: string;
}

// Structural type for the Supabase client operations used in this stage.
// The generated types lag behind the actual schema until `supabase gen types` is re-run.
type PipelineClient = {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    };
    update(data: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
    insert(data: unknown[]): Promise<{ error: { message: string } | null }>;
  };
};

export function parseHtmlToMarkdown(html: string): string {
  const root = parse(html);
  const sections: string[] = [];

  // Walk all top-level elements
  const walkElement = (node: HtmlNode): void => {
    if (!node) return;

    const nodeType = node.nodeType;

    // Element node
    if (nodeType === 1) {
      const el = node as HtmlElement;
      const tagName = el.tagName?.toLowerCase();

      if (tagName === 'h1') {
        sections.push(`# ${el.text}`);
      } else if (tagName === 'h2') {
        sections.push(`## ${el.text}`);
      } else if (tagName === 'h3') {
        sections.push(`### ${el.text}`);
      } else if (tagName === 'h4') {
        sections.push(`#### ${el.text}`);
      } else if (tagName === 'p') {
        sections.push(el.text);
      } else if (tagName === 'pre' || tagName === 'code') {
        // Preserve code blocks exactly
        const codeContent = tagName === 'pre' ? el.querySelector('code')?.text ?? el.text : el.text;
        sections.push(`\`\`\`\n${codeContent}\n\`\`\``);
      } else if (tagName === 'ul') {
        // Unordered list
        const items = el.querySelectorAll('li');
        for (const li of items) {
          sections.push(`- ${li.text}`);
        }
      } else if (tagName === 'ol') {
        // Ordered list
        const items = el.querySelectorAll('li');
        for (let i = 0; i < items.length; i++) {
          sections.push(`${i + 1}. ${items[i]?.text}`);
        }
      } else {
        // Recursively process children
        if (node.childNodes) {
          for (const child of node.childNodes) {
            walkElement(child);
          }
        }
      }
    }
  };

  // Start walking from root
  if (root.childNodes) {
    for (const child of root.childNodes) {
      walkElement(child);
    }
  }

  return sections.join('\n\n');
}

export function extractQuizQuestions(html: string): ExtractedQuizQuestion[] {
  const root = parse(html);
  const questions: ExtractedQuizQuestion[] = [];

  // Find all fieldsets (Trailhead quiz pattern)
  // Skip fieldsets nested inside [data-qa="quiz-question"] to avoid duplicates
  const fieldsets = root.querySelectorAll('fieldset');

  for (const fieldset of fieldsets) {
    // Skip if this fieldset is nested inside a data-qa quiz container (handled below)
    if (fieldset.closest('[data-qa="quiz-question"]')) continue;

    // Get the legend (question text)
    const legend = fieldset.querySelector('legend');
    const questionText = legend?.text ?? '';

    if (!questionText) continue;

    // Find all radio inputs and their labels
    const radios = fieldset.querySelectorAll('input[type="radio"]');
    const options: string[] = [];
    let selectorHints = '';

    for (const radio of radios) {
      // Get the name attribute for selector hints
      const name = radio.getAttribute('name') ?? '';
      if (name && !selectorHints) {
        selectorHints = name;
      }

      // Find the associated label (usually the next sibling)
      let label: HtmlElement | null = radio.nextElementSibling;
      if (!label || label.tagName?.toLowerCase() !== 'label') {
        label = radio.parentNode?.querySelector('label') ?? null;
      }

      if (label) {
        options.push(label.text);
      }
    }

    if (options.length > 0) {
      questions.push({
        question_text: questionText,
        options,
        selector_hints: selectorHints,
      });
    }
  }

  // Also detect data-qa="quiz-question" elements (alternate Trailhead pattern)
  const dataQaElements = root.querySelectorAll('[data-qa="quiz-question"]');

  for (const qEl of dataQaElements) {
    // Get question text from common heading/text elements within the container
    const questionNode = qEl.querySelector('legend, p, h3, h4') ?? qEl;
    const questionText = questionNode.text?.trim() ?? '';

    if (!questionText) continue;

    const radios = qEl.querySelectorAll('input[type="radio"]');
    const options: string[] = [];
    let selectorHints = 'quiz-question';

    for (const radio of radios) {
      const name = radio.getAttribute('name') ?? '';
      if (name && selectorHints === 'quiz-question') {
        selectorHints = name;
      }

      let label: HtmlElement | null = radio.nextElementSibling;
      if (!label || label.tagName?.toLowerCase() !== 'label') {
        label = radio.parentNode?.querySelector('label') ?? null;
      }

      if (label) {
        options.push(label.text);
      }
    }

    if (options.length > 0) {
      questions.push({
        question_text: questionText,
        options,
        selector_hints: selectorHints,
      });
    }
  }

  return questions;
}

export async function extractUnitContent(
  input: ExtractContentInput,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const db = supabase as unknown as PipelineClient;

  // Fetch unit by unit_id
  const { data: units, error: fetchError } = await db.from('units').select('*').eq('id', input.unit_id);

  if (fetchError) {
    throw new PipelineError('extract-content', `Failed to fetch unit: ${fetchError.message}`);
  }

  if (!units || units.length === 0) {
    throw new PipelineError('extract-content', `Unit not found: ${input.unit_id}`);
  }

  const unit = units[0] as unknown as { raw_html: string | null };

  if (!unit.raw_html) {
    throw new PipelineError('extract-content', `Unit has no raw HTML: ${input.unit_id}`);
  }

  // Parse HTML to markdown
  const contentMarkdown = parseHtmlToMarkdown(unit.raw_html);

  // Update unit with markdown content (units table has no updated_at column)
  const { error: updateError } = await db
    .from('units')
    .update({ content_markdown: contentMarkdown })
    .eq('id', input.unit_id);

  if (updateError) {
    throw new PipelineError('extract-content', `Failed to update unit: ${updateError.message}`);
  }

  // Extract quiz questions
  const questions = extractQuizQuestions(unit.raw_html);

  // Insert quiz items if any found
  if (questions.length > 0) {
    const quizItems = questions.map((q, index) => ({
      unit_id: input.unit_id,
      question_text: q.question_text,
      question_type: 'multiple_choice',
      options: q.options,
      correct_answer: '',
      explanation: q.selector_hints,
      related_chunk_ids: [],
      display_order: index,
    }));

    const { error: insertError } = await db.from('quiz_items').insert(quizItems);

    if (insertError) {
      throw new PipelineError('extract-content', `Failed to insert quiz items: ${insertError.message}`);
    }
  }
}
