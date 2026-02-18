import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardRealtimeWrapper } from './dashboard-realtime-wrapper';

// Stable refresh spy at module scope so we can assert on it across tests
const mockRefresh = vi.fn();

// Mock next/navigation with a stable refresh reference
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn((_name: string) => ({
      on: vi.fn(function (this: unknown) {
        return this;
      }),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('DashboardRealtimeWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <DashboardRealtimeWrapper trailmixId="test-id">
        <div data-testid="child">Test Child</div>
      </DashboardRealtimeWrapper>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('subscribes to Supabase Realtime on mount when trailmixId is present', async () => {
    const { createClient } = await import('@/lib/supabase/client');
    render(
      <DashboardRealtimeWrapper trailmixId="test-id">
        <div>Content</div>
      </DashboardRealtimeWrapper>,
    );

    await waitFor(() => {
      expect(createClient).toHaveBeenCalled();
    });
  });

  it('does not subscribe when trailmixId is null', async () => {
    const { createClient } = await import('@/lib/supabase/client');
    vi.mocked(createClient).mockClear();

    render(
      <DashboardRealtimeWrapper trailmixId={null}>
        <div>Content</div>
      </DashboardRealtimeWrapper>,
    );

    await waitFor(() => {
      // Should not call createClient when trailmixId is null
      expect(createClient).not.toHaveBeenCalled();
    });
  });

  it('uses correct channel name with trailmixId', async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const mockClient = {
      channel: vi.fn((_name: string) => ({
        on: vi.fn(function (this: unknown) {
          return this;
        }),
        subscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    render(
      <DashboardRealtimeWrapper trailmixId="test-trailmix-123">
        <div>Content</div>
      </DashboardRealtimeWrapper>,
    );

    await waitFor(() => {
      expect(mockClient.channel).toHaveBeenCalledWith(expect.stringContaining('test-trailmix-123'));
    });
  });

  it('subscribes to postgres_changes on modules table', async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const mockOn = vi.fn(function (this: unknown) {
      return this;
    });
    const mockClient = {
      channel: vi.fn(() => ({
        on: mockOn,
        subscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    render(
      <DashboardRealtimeWrapper trailmixId="test-id">
        <div>Content</div>
      </DashboardRealtimeWrapper>,
    );

    await waitFor(() => {
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'modules',
          filter: 'trailmix_id=eq.test-id',
        }),
        expect.any(Function),
      );
    });
  });

  it('calls router.refresh() when postgres_changes event fires', async () => {
    const { createClient } = await import('@/lib/supabase/client');
    let capturedCallback: ((...args: unknown[]) => void) | null = null;
    const mockOn = vi.fn((event: string, _opts: unknown, callback: (...args: unknown[]) => void) => {
      if (event === 'postgres_changes') {
        capturedCallback = callback;
      }
      return {
        subscribe: vi.fn(),
      };
    });
    const mockClient = {
      channel: vi.fn(() => ({
        on: mockOn,
        subscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    render(
      <DashboardRealtimeWrapper trailmixId="test-id">
        <div>Content</div>
      </DashboardRealtimeWrapper>,
    );

    // Wait for the subscription to be set up with the callback registered
    await waitFor(() => {
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'modules',
          filter: 'trailmix_id=eq.test-id',
        }),
        expect.any(Function),
      );
    });

    // Simulate the postgres_changes event firing
    expect(capturedCallback).not.toBeNull();
    capturedCallback!();

    // Verify router.refresh() was called as a result
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('cleans up subscription on unmount', async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const mockRemoveChannel = vi.fn();
    const mockClient = {
      channel: vi.fn(() => ({
        on: vi.fn(function (this: unknown) {
          return this;
        }),
        subscribe: vi.fn(),
      })),
      removeChannel: mockRemoveChannel,
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { unmount } = render(
      <DashboardRealtimeWrapper trailmixId="test-id">
        <div>Content</div>
      </DashboardRealtimeWrapper>,
    );

    await waitFor(() => {
      expect(mockClient.channel).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mockRemoveChannel).toHaveBeenCalled();
    });
  });

  it('handles multiple mount/unmount cycles', async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const mockRemoveChannel = vi.fn();
    const mockClient = {
      channel: vi.fn(() => ({
        on: vi.fn(function (this: unknown) {
          return this;
        }),
        subscribe: vi.fn(),
      })),
      removeChannel: mockRemoveChannel,
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { unmount } = render(
      <DashboardRealtimeWrapper trailmixId="test-id">
        <div>Content</div>
      </DashboardRealtimeWrapper>,
    );

    await waitFor(() => {
      expect(mockClient.channel).toHaveBeenCalledTimes(1);
    });

    unmount();

    await waitFor(() => {
      expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    });
  });

  it('calls toast.error when sessionExpired prop is true', async () => {
    const { toast } = await import('sonner');
    render(
      <DashboardRealtimeWrapper trailmixId={null} sessionExpired={true}>
        <div>Content</div>
      </DashboardRealtimeWrapper>,
    );

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'Session expired — re-authenticate',
        expect.objectContaining({
          duration: Infinity,
          id: 'session-expired',
        }),
      );
    });
  });

  it('does not call toast.error when sessionExpired prop is false', async () => {
    const { toast } = await import('sonner');
    vi.mocked(toast.error).mockClear();

    render(
      <DashboardRealtimeWrapper trailmixId={null} sessionExpired={false}>
        <div>Content</div>
      </DashboardRealtimeWrapper>,
    );

    await waitFor(() => {
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
    });
  });

  it('calls toast.dismiss when sessionExpired transitions to false (session recovery)', async () => {
    const { toast } = await import('sonner');
    const { rerender } = render(
      <DashboardRealtimeWrapper trailmixId={null} sessionExpired={true}>
        <div>Content</div>
      </DashboardRealtimeWrapper>,
    );

    // Simulate recovery: sessionExpired becomes false after retry succeeds
    rerender(
      <DashboardRealtimeWrapper trailmixId={null} sessionExpired={false}>
        <div>Content</div>
      </DashboardRealtimeWrapper>,
    );

    await waitFor(() => {
      expect(vi.mocked(toast.dismiss)).toHaveBeenCalledWith('session-expired');
    });
  });
});
