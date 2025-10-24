import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupRequest {
  email: string;
  password: string;
  userData: {
    full_name: string;
    role: string;
    organization_name?: string;
    phone?: string;
  };
  ip_address?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, password, userData, ip_address }: SignupRequest = await req.json();

    // Rate limiting: Check for recent signup attempts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    if (ip_address) {
      const { data: recentAttempts } = await supabase
        .from('signup_attempts')
        .select('*')
        .eq('ip_address', ip_address)
        .gte('attempt_time', oneHourAgo);

      // Allow max 5 signup attempts per hour per IP
      if (recentAttempts && recentAttempts.length >= 5) {
        await supabase
          .from('signup_attempts')
          .insert({
            ip_address,
            email,
            success: false
          });

        return new Response(
          JSON.stringify({ 
            error: 'Too many signup attempts. Please try again later.' 
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Email rate limiting: Check for recent attempts with same email
    const { data: emailAttempts } = await supabase
      .from('signup_attempts')
      .select('*')
      .eq('email', email)
      .gte('attempt_time', oneHourAgo);

    if (emailAttempts && emailAttempts.length >= 3) {
      await supabase
        .from('signup_attempts')
        .insert({
          ip_address,
          email,
          success: false
        });

      return new Response(
        JSON.stringify({ 
          error: 'Too many attempts with this email. Please try again later.' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate role
    const validRoles = ['donor', 'recipient', 'admin'];
    if (!validRoles.includes(userData.role)) {
      userData.role = 'donor'; // Safe default
    }

    // Attempt signup
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: userData,
      email_confirm: false // Skip email verification for direct signup
    });

    // Log the attempt
    await supabase
      .from('signup_attempts')
      .insert({
        ip_address,
        email,
        success: !error
      });

    if (error) {
      console.error('Signup error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account created successfully',
        user: data.user 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});