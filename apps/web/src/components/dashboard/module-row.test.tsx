import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { Module } from '@trailblaze/shared';
import ModuleRow from './module-row';

describe('ModuleRow', () => {
  const mockModule: Module = {
    id: 'test-module-1',
    trailmix_id: 'test-trailmix-1',
    name: 'Test Module',
    url: 'https://trailhead.salesforce.com/modules/test',
    status: 'pending',
    priority: 0,
    badge_url: null,
    badge_earned: false,
    retry_count: 0,
    failure_reason: null,
    type: 'module',
    track: 'Test Track',
    estimated_minutes: 120,
    unit_count: 5,
    user_id: null,
    created_at: '2026-02-19T00:00:00Z',
    updated_at: '2026-02-19T00:00:00Z',
  };

  it('renders module name in bold', () => {
    render(<ModuleRow module={mockModule} />);
    const name = screen.getByText('Test Module');
    expect(name).toBeInTheDocument();
    expect(name).toHaveClass('font-medium');
  });

  it('renders track label in muted color', () => {
    render(<ModuleRow module={mockModule} />);
    const track = screen.getByText('Test Track');
    expect(track).toBeInTheDocument();
    expect(track).toHaveClass('text-muted-foreground');
  });

  it('renders status badge with Queued text', () => {
    render(<ModuleRow module={mockModule} />);
    const badge = screen.getByText('Queued');
    expect(badge).toBeInTheDocument();
  });

  it('applies status-queued color to badge', () => {
    render(<ModuleRow module={mockModule} />);
    const badge = screen.getByText('Queued');
    expect(badge.getAttribute('style')).toContain('--status-queued');
  });

  it('applies status-queued border color to badge', () => {
    render(<ModuleRow module={mockModule} />);
    const badge = screen.getByText('Queued');
    expect(badge.getAttribute('style')).toContain('--status-queued');
  });

  it('renders with outer container classes', () => {
    const { container } = render(<ModuleRow module={mockModule} />);
    const row = container.firstChild;
    expect(row).toHaveClass('flex', 'items-center', 'justify-between', 'px-4', 'py-3', 'rounded-md', 'border');
  });

  it('handles module without track', () => {
    const moduleNoTrack = { ...mockModule, track: null };
    const { container } = render(<ModuleRow module={moduleNoTrack} />);
    expect(container).toBeInTheDocument();
  });

  it('renders scraping status', () => {
    const module = { ...mockModule, status: 'scraping' as const };
    render(<ModuleRow module={module} />);
    expect(screen.getByText('Scraping')).toBeInTheDocument();
  });

  it('renders scraped status', () => {
    const module = { ...mockModule, status: 'scraped' as const };
    render(<ModuleRow module={module} />);
    expect(screen.getByText('Scraped')).toBeInTheDocument();
  });

  it('renders processing status', () => {
    const module = { ...mockModule, status: 'processing' as const };
    render(<ModuleRow module={module} />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('renders ready status as Quiz Ready', () => {
    const module = { ...mockModule, status: 'ready' as const };
    render(<ModuleRow module={module} />);
    expect(screen.getByText('Quiz Ready')).toBeInTheDocument();
  });

  it('renders quizzing status', () => {
    const module = { ...mockModule, status: 'quizzing' as const };
    render(<ModuleRow module={module} />);
    expect(screen.getByText('Quizzing')).toBeInTheDocument();
  });

  it('renders completed status', () => {
    const module = { ...mockModule, status: 'completed' as const };
    render(<ModuleRow module={module} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders failed status with retry count', () => {
    const module = { ...mockModule, status: 'failed' as const };
    render(<ModuleRow module={module} />);
    expect(screen.getByText('Failed (attempt 0/3)')).toBeInTheDocument();
  });

  it('applies opacity-60 to completed modules', () => {
    const module = { ...mockModule, status: 'completed' as const };
    const { container } = render(<ModuleRow module={module} />);
    const row = container.firstChild;
    expect(row).toHaveClass('opacity-60');
  });

  it('does not apply opacity to non-completed modules', () => {
    const { container } = render(<ModuleRow module={mockModule} />);
    const row = container.firstChild;
    expect(row).not.toHaveClass('opacity-60');
  });

  it('applies transition-colors to badge', () => {
    render(<ModuleRow module={mockModule} />);
    const badge = screen.getByText('Queued');
    expect(badge).toHaveClass('transition-colors');
    expect(badge).toHaveClass('duration-150');
    expect(badge).toHaveClass('ease');
  });

  it('renders failed status with retry count', () => {
    const failedModule = { ...mockModule, status: 'failed' as const, retry_count: 3 };
    render(<ModuleRow module={failedModule} />);
    expect(screen.getByText('Failed (attempt 3/3)')).toBeInTheDocument();
  });

  it('renders Retry button when status is failed', () => {
    const failedModule = { ...mockModule, status: 'failed' as const, retry_count: 3 };
    render(<ModuleRow module={failedModule} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('does not render Retry button when status is not failed', () => {
    render(<ModuleRow module={mockModule} />);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('renders Session Expired badge when failure_reason is session_expired', () => {
    const sessionExpiredModule = { ...mockModule, status: 'failed' as const, failure_reason: 'session_expired' };
    render(<ModuleRow module={sessionExpiredModule} />);
    expect(screen.getByText('Session Expired')).toBeInTheDocument();
    expect(screen.queryByText(/Failed \(attempt/)).not.toBeInTheDocument();
  });

  it('renders Retry button when status is failed with session_expired failure_reason', () => {
    const sessionExpiredModule = { ...mockModule, status: 'failed' as const, failure_reason: 'session_expired' };
    render(<ModuleRow module={sessionExpiredModule} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders Failed status when failure_reason is null', () => {
    const failedModule = { ...mockModule, status: 'failed' as const, failure_reason: null };
    render(<ModuleRow module={failedModule} />);
    expect(screen.getByText('Failed (attempt 0/3)')).toBeInTheDocument();
    expect(screen.queryByText('Session Expired')).not.toBeInTheDocument();
  });
});
