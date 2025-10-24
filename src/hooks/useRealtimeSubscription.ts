import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
  onPayload?: (payload: any) => void;
}

export const useRealtimeSubscription = ({
  table,
  event = '*',
  schema = 'public',
  filter,
  onPayload
}: UseRealtimeSubscriptionOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${Date.now()}`)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          filter
        } as any,
        (payload: any) => {
          if (onPayload) {
            onPayload(payload);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, event, schema, filter, onPayload]);

  return channelRef.current;
};