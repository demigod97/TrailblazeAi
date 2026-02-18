import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCard from './stat-card';

describe('StatCard', () => {
  it('renders label text', () => {
    render(<StatCard label="Total Modules" value={42} />);
    expect(screen.getByText('Total Modules')).toBeInTheDocument();
  });

  it('renders value in monospace font', () => {
    render(<StatCard label="Total Modules" value={42} />);
    const valueElement = screen.getByText('42');
    expect(valueElement).toHaveClass('font-mono');
  });

  it('renders value in text-3xl size', () => {
    render(<StatCard label="Total Modules" value={42} />);
    const valueElement = screen.getByText('42');
    expect(valueElement).toHaveClass('text-3xl');
  });

  it('renders value in bold weight', () => {
    render(<StatCard label="Total Modules" value={42} />);
    const valueElement = screen.getByText('42');
    expect(valueElement).toHaveClass('font-bold');
  });

  it('renders sub-label when provided', () => {
    render(<StatCard label="Total" value={100} subLabel="modules" />);
    expect(screen.getByText('modules')).toBeInTheDocument();
  });

  it('does not render sub-label when not provided', () => {
    render(<StatCard label="Total" value={100} />);
    expect(screen.queryByText('modules')).not.toBeInTheDocument();
  });

  it('renders skeleton when loading=true', () => {
    render(<StatCard label="Total" value={100} loading={true} />);
    // Skeleton should be rendered instead of value
    const valueElement = screen.queryByText('100');
    expect(valueElement).not.toBeInTheDocument();
  });

  it('renders card container', () => {
    const { container } = render(<StatCard label="Total" value={100} />);
    const card = container.querySelector('[class*="rounded"]');
    expect(card).toBeInTheDocument();
  });

  it('wraps content in Card component', () => {
    const { container } = render(<StatCard label="Total" value={100} />);
    // Card component should have specific styling (rounded-xl from shadcn/ui Card)
    const card = container.firstChild;
    expect(card).toHaveClass('rounded-xl');
  });

  it('accepts string values', () => {
    render(<StatCard label="Status" value="Ready" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('accepts numeric values', () => {
    render(<StatCard label="Count" value={99} />);
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('renders label in muted text color', () => {
    render(<StatCard label="Total Modules" value={42} />);
    const labelElement = screen.getByText('Total Modules');
    expect(labelElement).toHaveClass('text-muted-foreground');
  });

  it('renders sub-label in muted text color', () => {
    render(<StatCard label="Total" value={100} subLabel="items" />);
    const subLabelElement = screen.getByText('items');
    expect(subLabelElement).toHaveClass('text-muted-foreground');
  });
});
