import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import localListings from '@/lib/localListings';

interface UserImpact {
  meals_donated: number;
  meals_received: number;
  food_wasted_kg: number;
  updated_at: string;
}

export const useImpactStats = () => {
  const { user } = useAuth();
  const [impact, setImpact] = useState<UserImpact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setImpact(null);
      setLoading(false);
      return;
    }

    const fetchImpact = async () => {
      try {
        const viteUrl = import.meta.env.VITE_SUPABASE_URL;
        // Local/dev fallback: when Supabase isn't configured or when
        // the dev user is used, compute a simple impact summary from
        // local listings and claims so the dashboard can render.
        if (!viteUrl || String(user.id).startsWith('dev-')) {
          try {
            const all = await localListings.localFetchListings();
            const userListings = all.filter(l => l.donor_id === user.id);
            const userClaims = await localListings.localFetchClaimsByUser(user.id);
            const computed = {
              meals_donated: userListings.length,
              meals_received: (userClaims || []).length,
              food_wasted_kg: 0,
              updated_at: new Date().toISOString(),
            };
            setImpact(computed as any);
          } catch (localErr) {
            console.warn('Error computing local impact:', localErr);
            setImpact(null);
          }
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_impact')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching impact:', error);
          // fall back to local computation if possible
          try {
            const all = await localListings.localFetchListings();
            const userListings = all.filter(l => l.donor_id === user.id);
            const userClaims = await localListings.localFetchClaimsByUser(user.id);
            setImpact({
              meals_donated: userListings.length,
              meals_received: (userClaims || []).length,
              food_wasted_kg: 0,
              updated_at: new Date().toISOString(),
            } as any);
          } catch (localErr) {
            console.error('Error computing fallback impact:', localErr);
            setImpact(null);
          }
          setLoading(false);
          return;
        }

        if (data) {
          setImpact(data);
        } else {
          // Create initial impact record
          const { data: newImpact } = await supabase
            .from('user_impact')
            .insert({ user_id: user.id })
            .select()
            .single();
          
          if (newImpact) {
            setImpact(newImpact);
          }
        }
      } catch (error) {
        console.error('Error in fetchImpact:', error);
        // on unexpected errors, try local fallback
        try {
          const all = await localListings.localFetchListings();
          const userListings = all.filter(l => l.donor_id === user.id);
          const userClaims = await localListings.localFetchClaimsByUser(user.id);
          setImpact({
            meals_donated: userListings.length,
            meals_received: (userClaims || []).length,
            food_wasted_kg: 0,
            updated_at: new Date().toISOString(),
          } as any);
        } catch (localErr) {
          console.error('Error computing fallback impact after exception:', localErr);
          setImpact(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchImpact();

    // Subscribe to impact updates
    const channel = supabase
      .channel('user-impact-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_impact',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) {
            setImpact(payload.new as UserImpact);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { impact, loading };
};