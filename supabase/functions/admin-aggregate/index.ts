import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Aggregations: users, listings, claims, basic metrics
    const [usersRes, listingsRes, claimsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('food_listings').select(`*, profiles:donor_id (full_name, organization_name, phone, email)`),
      supabase.from('claims').select(`*, food_listings (title, pickup_location), profiles:claimed_by (full_name, phone, email)`),
    ]);

    const users = usersRes.data || [];
    const listings = listingsRes.data || [];
    const claims = claimsRes.data || [];

    const totalUsers = users.length;
    const totalListings = listings.length;
    const totalClaims = claims.length;
    const donors = new Set(listings.map((l:any) => l.donor_id));

    const stats = {
      totalUsers,
      totalDonors: donors.size,
      totalRecipients: totalClaims,
      totalListings,
      totalClaims,
      mealsServed: totalClaims,
      foodSavedKg: 0,
      activeListings: listings.filter((l:any) => l.status === 'available').length,
      expiredListings: listings.filter((l:any) => l.status === 'expired').length,
      completedTransactions: claims.filter((c:any) => (c.status === 'collected' || c.status === 'completed')).length,
      successRate: totalListings > 0 ? Math.round(((claims.filter((c:any) => (c.status === 'collected' || c.status === 'completed')).length / totalListings) * 100)) : 0,
    };

    return new Response(JSON.stringify({ stats, users, donations: listings, requests: claims, chartData: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('admin-aggregate error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
