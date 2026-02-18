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
    const channel = supabase
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

    // Cleanup subscription on unmount or when trailmixId changes
    return () => {
      supabase.removeChannel(channel);
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
