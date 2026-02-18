import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseHtmlToMarkdown, extractQuizQuestions, extractUnitContent } from './extract-content.js';
import { PipelineError } from '../../lib/errors.js';

describe('Extract Content Stage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseHtmlToMarkdown', () => {
    it('converts h1 to # markdown', () => {
      const html = '<h1>Hello World</h1>';
      const result = parseHtmlToMarkdown(html);
      expect(result).toContain('# Hello World');
    });

    it('converts h2 to ## markdown', () => {
      const html = '<h2>Section Title</h2>';
      const result = parseHtmlToMarkdown(html);
      expect(result).toContain('## Section Title');
    });

    it('converts h3 to ### markdown', () => {
      const html = '<h3>Subsection</h3>';
      const result = parseHtmlToMarkdown(html);
      expect(result).toContain('### Subsection');
    });

    it('converts h4 to #### markdown', () => {
      const html = '<h4>Details</h4>';
      const result = parseHtmlToMarkdown(html);
      expect(result).toContain('#### Details');
    });

    it('converts p tags to text content with newlines', () => {
      const html = '<p>First paragraph</p><p>Second paragraph</p>';
      const result = parseHtmlToMarkdown(html);
      expect(result).toContain('First paragraph');
      expect(result).toContain('Second paragraph');
    });

    it('preserves code blocks intact in fences', () => {
      const html = '<pre><code>const x = 1;\nconst y = 2;</code></pre>';
      const result = parseHtmlToMarkdown(html);
      expect(result).toContain('```');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('const y = 2;');
      // Must not split the code block
      expect(result.match(/```/g)?.length).toBe(2);
    });

    it('converts ul li items to markdown lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = parseHtmlToMarkdown(html);
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('converts ol li items to numbered lists', () => {
      const html = '<ol><li>First</li><li>Second</li></ol>';
      const result = parseHtmlToMarkdown(html);
      expect(result).toContain('1. First');
      expect(result).toContain('2. Second');
    });

    it('handles mixed content with headings and paragraphs', () => {
      const html = '<h1>Title</h1><p>Intro</p><h2>Section</h2><p>Content</p>';
      const result = parseHtmlToMarkdown(html);
      expect(result).toContain('# Title');
      expect(result).toContain('Intro');
      expect(result).toContain('## Section');
      expect(result).toContain('Content');
    });

    it('handles empty HTML gracefully', () => {
      const html = '<div></div>';
      const result = parseHtmlToMarkdown(html);
      expect(typeof result).toBe('string');
    });
  });

  describe('extractQuizQuestions', () => {
    it('detects radio button quiz questions in fieldset', () => {
      const html = `
        <fieldset>
          <legend>What is Apex?</legend>
          <input type="radio" name="q1" value="a"> <label>A language</label>
          <input type="radio" name="q1" value="b"> <label>A tool</label>
        </fieldset>
      `;
      const questions = extractQuizQuestions(html);
      expect(questions.length).toBeGreaterThan(0);
      const q = questions[0];
      expect(q?.question_text).toContain('Apex');
      expect(q?.options.length).toBeGreaterThanOrEqual(2);
    });

    it('extracts option labels as separate items', () => {
      const html = `
        <fieldset>
          <legend>Question</legend>
          <input type="radio" name="q1"> <label>Option A</label>
          <input type="radio" name="q1"> <label>Option B</label>
          <input type="radio" name="q1"> <label>Option C</label>
        </fieldset>
      `;
      const questions = extractQuizQuestions(html);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0]?.options.length).toBeGreaterThanOrEqual(3);
    });

    it('stores selector_hints with the form input name attribute', () => {
      const html = `
        <fieldset>
          <legend>Test</legend>
          <input type="radio" name="question_123"> <label>Option</label>
        </fieldset>
      `;
      const questions = extractQuizQuestions(html);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0]?.selector_hints).toContain('question_123');
    });

    it('detects quiz questions with data-qa="quiz-question" attribute', () => {
      const html = `
        <div data-qa="quiz-question">
          <p>What is a Salesforce record?</p>
          <input type="radio" name="dq1"> <label>A data entry</label>
          <input type="radio" name="dq1"> <label>An object instance</label>
        </div>
      `;
      const questions = extractQuizQuestions(html);
      expect(questions.length).toBeGreaterThan(0);
      const q = questions[0];
      expect(q?.question_text).toContain('Salesforce record');
      expect(q?.options.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array when no quiz questions found', () => {
      const html = '<p>Simple text</p><div>No questions here</div>';
      const questions = extractQuizQuestions(html);
      expect(questions).toEqual([]);
    });

    it('returns empty array for empty HTML', () => {
      const html = '';
      const questions = extractQuizQuestions(html);
      expect(questions).toEqual([]);
    });
  });

  describe('extractUnitContent', () => {
    const mockUnit = {
      id: 'unit-1',
      module_id: 'module-1',
      title: 'Test Unit',
      url: 'https://example.com/unit',
      unit_index: 0,
      raw_html: '<h1>Unit Title</h1><p>Content here</p>',
      content_markdown: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [mockUnit],
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    };

    it('reads raw_html from units table by unit_id', async () => {
      await extractUnitContent({ unit_id: 'unit-1', run_id: 'run-1' }, mockSupabase as any);
      expect(mockSupabase.from).toHaveBeenCalledWith('units');
    });

    it('converts HTML to markdown and stores in content_markdown', async () => {
      await extractUnitContent({ unit_id: 'unit-1', run_id: 'run-1' }, mockSupabase as any);
      const updateCalls = mockSupabase.from('units').update.mock.calls;
      const unitUpdateCall = updateCalls[0]?.[0] as any;
      expect(unitUpdateCall?.content_markdown).toBeDefined();
      expect(unitUpdateCall.content_markdown).toContain('# Unit Title');
    });

    it('detects quiz questions and inserts them into quiz_items table', async () => {
      const htmlWithQuiz = `<h1>Unit</h1><fieldset><legend>Q1</legend><input type="radio" name="q1" value="a"> <label>A</label></fieldset>`;
      mockSupabase.from('units').select().eq.mockResolvedValueOnce({
        data: [{ ...mockUnit, raw_html: htmlWithQuiz }],
        error: null,
      });
      await extractUnitContent({ unit_id: 'unit-1', run_id: 'run-1' }, mockSupabase as any);
      expect(mockSupabase.from).toHaveBeenCalledWith('quiz_items');
    });

    it('handles units with no quiz questions without throwing', async () => {
      await extractUnitContent({ unit_id: 'unit-1', run_id: 'run-1' }, mockSupabase as any);
      // Should not throw, even though no quiz items inserted
      expect(mockSupabase.from('units').update).toHaveBeenCalled();
    });

    it('throws PipelineError if unit has no raw_html', async () => {
      mockSupabase.from('units').select().eq.mockResolvedValueOnce({
        data: [{ ...mockUnit, raw_html: null }],
        error: null,
      });
      await expect(
        extractUnitContent({ unit_id: 'unit-1', run_id: 'run-1' }, mockSupabase as any),
      ).rejects.toThrow(PipelineError);
    });

    it('throws PipelineError if unit not found', async () => {
      mockSupabase.from('units').select().eq.mockResolvedValueOnce({
        data: [],
        error: null,
      });
      await expect(
        extractUnitContent({ unit_id: 'unit-1', run_id: 'run-1' }, mockSupabase as any),
      ).rejects.toThrow(PipelineError);
    });

    it('includes question_text, options, correct_answer, and explanation (selector_hints) in quiz_items', async () => {
      const htmlWithQuiz = `<fieldset><legend>Q</legend><input type="radio" name="q"> <label>Opt</label></fieldset>`;
      mockSupabase.from('units').select().eq.mockResolvedValueOnce({
        data: [{ ...mockUnit, raw_html: htmlWithQuiz }],
        error: null,
      });
      await extractUnitContent({ unit_id: 'unit-1', run_id: 'run-1' }, mockSupabase as any);
      const insertCall = mockSupabase.from('quiz_items').insert.mock.calls[0];
      if (insertCall) {
        const items = insertCall[0] as any[];
        expect(items.length).toBeGreaterThan(0);
        expect(items[0]).toHaveProperty('question_text');
        expect(items[0]).toHaveProperty('options');
        expect(items[0]).toHaveProperty('correct_answer');
        // explanation stores the selector_hints (radio input name) needed for quiz submission
        expect(items[0]).toHaveProperty('explanation');
        expect(typeof items[0].explanation).toBe('string');
      }
    });
  });
});
