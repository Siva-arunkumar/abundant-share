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
    const body = await req.json();
    const { title, description, quantity, donor_id, pickup_location } = body || {};

    if (!title) return new Response(JSON.stringify({ error: 'Missing title' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const now = new Date().toISOString();
    const insertPayload: any = {
      title,
      description: description || '',
      quantity: quantity ? String(quantity) : '',
      donor_id: donor_id || null,
      pickup_location: pickup_location || '',
      status: 'available',
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase.from('food_listings').insert(insertPayload).select().single();

    if (error) {
      console.error('admin-create-donation insert error', error);
      return new Response(JSON.stringify({ error: error.message || 'Insert failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('admin-create-donation error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
