/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// Disable TypeScript checking in the editor for Deno function files (they run in Deno on Supabase)
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SendRequest {
  phone: string;
}

// HMAC helper using Web Crypto
async function computeHmac(key: string, msg: string) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg));
  // convert to hex
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const env = Deno.env;
    const body: SendRequest = await req.json();
    const phone = body.phone;
    if (!phone) return new Response(JSON.stringify({ error: 'phone required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const secret = env.get('OTP_HMAC_KEY') || env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const hmac = await computeHmac(secret, `${phone}:${code}`);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // store in phone_otps table
    await supabase.from('phone_otps').insert({ phone, code_hmac: hmac, expires_at: expiresAt, attempts: 0 });

    // send SMS via Twilio
    const TWILIO_SID = env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_TOKEN = env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_FROM = env.get('TWILIO_FROM');

    if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
      return new Response(JSON.stringify({ error: 'Twilio not configured on server' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const form = new URLSearchParams();
    form.append('To', phone);
    form.append('From', TWILIO_FROM);
    form.append('Body', `Your Abundant Share verification code is: ${code}. It expires in 5 minutes.`);

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const tw = await resp.text();
    console.debug('twilio resp', resp.status, tw);
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'twilio send failed', detail: tw }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('twilio-send-otp error', err);
    return new Response(JSON.stringify({ error: 'internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
