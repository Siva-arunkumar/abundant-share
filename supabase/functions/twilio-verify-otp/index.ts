/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// Disable TypeScript checking in the editor for Deno function files (they run in Deno on Supabase)
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  phone: string;
  token: string;
}

async function computeHmac(key: string, msg: string) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const env = Deno.env;
    const { phone, token }: VerifyRequest = await req.json();
    if (!phone || !token) return new Response(JSON.stringify({ error: 'phone and token required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const secret = env.get('OTP_HMAC_KEY') || env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const hmac = await computeHmac(secret, `${phone}:${token}`);

    // fetch latest otp for phone
    const { data } = await supabase.from('phone_otps').select('*').eq('phone', phone).order('created_at', { ascending: false }).limit(1);
    const rec = (data && (data as any[])[0]) as any | undefined;
    if (!rec) return new Response(JSON.stringify({ error: 'no otp requested' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const now = new Date().toISOString();
    if (rec.attempts >= 5) return new Response(JSON.stringify({ error: 'too many attempts' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (rec.expires_at < now) return new Response(JSON.stringify({ error: 'expired' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (rec.code_hmac !== hmac) {
      // increment attempts
      await supabase.from('phone_otps').update({ attempts: rec.attempts + 1 }).eq('id', rec.id);
      return new Response(JSON.stringify({ error: 'invalid' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // success - remove or mark used
    await supabase.from('phone_otps').update({ attempts: rec.attempts + 1 }).eq('id', rec.id);
    // optionally delete rows older than now or mark consumed
    await supabase.from('phone_otps').delete().eq('id', rec.id);

      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('twilio-verify-otp error', err);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
