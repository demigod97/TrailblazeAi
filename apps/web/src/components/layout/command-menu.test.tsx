import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandMenu } from './command-menu';

// Capture mockPush before vi.mock is hoisted so it can be asserted in tests
const mockPush = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('CommandMenu', () => {
  it('is not visible by default', () => {
    render(<CommandMenu />);
    // CommandDialog renders with role="dialog" only when open
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens when Cmd+K is pressed', () => {
    render(<CommandMenu />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens when Ctrl+K is pressed', () => {
    render(<CommandMenu />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows navigation items when open', () => {
    render(<CommandMenu />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    // 'Knowledge Base' appears as both a nav item and a group heading
    expect(screen.getAllByText('Knowledge Base').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Search Knowledge Base...')).toBeInTheDocument();
  });

  it('closes when Cmd+K is pressed again (toggle)', () => {
    render(<CommandMenu />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('navigates to correct route when navigation item is selected', () => {
    mockPush.mockClear();
    render(<CommandMenu />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    // Click the Dashboard navigation item
    fireEvent.click(screen.getByText('Dashboard'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});
