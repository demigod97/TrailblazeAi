'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface DashboardRealtimeWrapperProps {
  trailmixId: string | null;
  sessionExpired?: boolean;
  children: React.ReactNode;
}

export function DashboardRealtimeWrapper({ trailmixId, sessionExpired = false, children }: DashboardRealtimeWrapperProps) {
  const router = useRouter();

  useEffect(() => {
    if (!trailmixId) {
      return; // No subscription if trailmixId is null
    }

    const supabase = createClient();

    // Subscribe to all module changes for dashboard refresh
    const statusChannel = supabase
      .channel(`module-status-${trailmixId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'modules',
          filter: `trailmix_id=eq.${trailmixId}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    // Subscribe to badge_earned events for toast notifications (AC3)
    const badgeChannel = supabase
      .channel(`badge-notifications-${trailmixId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'modules',
          filter: `trailmix_id=eq.${trailmixId}`,
        },
        (payload) => {
          const newRow = payload.new as { badge_earned?: boolean; name?: string };
          const oldRow = payload.old as { badge_earned?: boolean };
          if (newRow.badge_earned === true && oldRow.badge_earned !== true) {
            toast.success(`Badge earned: ${newRow.name ?? 'Module'}`, { duration: 3000 });
          }
        },
      )
      .subscribe();

    // Cleanup subscriptions on unmount or when trailmixId changes
    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(badgeChannel);
    };
  }, [trailmixId, router]);

  // Handle session expiry toast — dismiss automatically when session recovers
  useEffect(() => {
    if (sessionExpired) {
      toast.error('Session expired — re-authenticate', {
        duration: Infinity,
        id: 'session-expired',
      });
    } else {
      toast.dismiss('session-expired');
    }
  }, [sessionExpired]);

  return <>{children}</>;
}
