import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import FilterChips from './filter-chips';
import type { FilterCounts } from './filter-chips';

describe('FilterChips', () => {
  const mockCounts: FilterCounts = {
    all: 10,
    active: 3,
    error: 1,
    done: 6,
  };

  it('renders all filter chips', () => {
    const onChange = vi.fn();
    render(<FilterChips value="all" counts={mockCounts} onChange={onChange} />);

    expect(screen.getByRole('radio', { name: /All/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Active/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Error/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Done/i })).toBeInTheDocument();
  });

  it('displays count in parentheses for each chip', () => {
    const onChange = vi.fn();
    render(<FilterChips value="all" counts={mockCounts} onChange={onChange} />);

    expect(screen.getByText(/All \(10\)/)).toBeInTheDocument();
    expect(screen.getByText(/Active \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/Error \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Done \(6\)/)).toBeInTheDocument();
  });

  it('marks active chip with aria-checked="true"', () => {
    const onChange = vi.fn();
    render(<FilterChips value="active" counts={mockCounts} onChange={onChange} />);

    const activeChip = screen.getByRole('radio', { name: /Active/ });
    expect(activeChip).toHaveAttribute('aria-checked', 'true');
  });

  it('marks inactive chips with aria-checked="false"', () => {
    const onChange = vi.fn();
    render(<FilterChips value="all" counts={mockCounts} onChange={onChange} />);

    const activeChip = screen.getByRole('radio', { name: /Active/ });
    expect(activeChip).toHaveAttribute('aria-checked', 'false');
  });

  it('has role="radiogroup" on wrapper', () => {
    const onChange = vi.fn();
    const { container } = render(<FilterChips value="all" counts={mockCounts} onChange={onChange} />);

    const radiogroup = container.querySelector('[role="radiogroup"]');
    expect(radiogroup).toBeInTheDocument();
  });

  it('calls onChange with correct value when chip is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterChips value="all" counts={mockCounts} onChange={onChange} />);

    const activeChip = screen.getByRole('radio', { name: /Active/ });
    await user.click(activeChip);

    expect(onChange).toHaveBeenCalledWith('active');
  });

  it('applies primary styling to active chip', () => {
    const onChange = vi.fn();
    render(<FilterChips value="active" counts={mockCounts} onChange={onChange} />);

    const activeChip = screen.getByRole('radio', { name: /Active/ });
    expect(activeChip).toHaveClass('bg-primary');
    expect(activeChip).toHaveClass('text-primary-foreground');
  });

  it('applies default styling to inactive chips', () => {
    const onChange = vi.fn();
    render(<FilterChips value="all" counts={mockCounts} onChange={onChange} />);

    const inactiveChip = screen.getByRole('radio', { name: /Active/ });
    expect(inactiveChip).toHaveClass('bg-transparent');
    expect(inactiveChip).toHaveClass('border');
  });

  it('applies transition classes to chips', () => {
    const onChange = vi.fn();
    render(<FilterChips value="all" counts={mockCounts} onChange={onChange} />);

    const chip = screen.getByRole('radio', { name: /All/ });
    expect(chip).toHaveClass('transition-colors');
    expect(chip).toHaveClass('duration-100');
  });

  it('calls onChange with "done" when Done chip clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterChips value="all" counts={mockCounts} onChange={onChange} />);

    const doneChip = screen.getByRole('radio', { name: /Done/ });
    await user.click(doneChip);

    expect(onChange).toHaveBeenCalledWith('done');
  });

  it('calls onChange with "error" when Error chip clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterChips value="all" counts={mockCounts} onChange={onChange} />);

    const errorChip = screen.getByRole('radio', { name: /Error/ });
    await user.click(errorChip);

    expect(onChange).toHaveBeenCalledWith('error');
  });
});
