import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, Profile, UserRole } from '@/types';
import { toast } from '@/hooks/use-toast';
import localAuth from '@/lib/localAuth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Development-only default credentials (used when Supabase isn't configured locally)
  const DEV_DEFAULT_EMAIL = 'sivaarunkumar23@gmail.com';
  const DEV_DEFAULT_PASSWORD = 'siva@1234';

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.debug('onAuthStateChange', { event, session });
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

              if (error) {
                console.error('Error fetching profile on auth change', error);
              }

              console.debug('profile fetch result on auth change', { profileData });

              if (profileData) {
                setProfile(profileData as Profile);
                // Redirect admins to admin dashboard
                if (profileData.role === 'admin') {
                  window.location.href = '/admin';
                }
              } else if (session.user) {
                // If no profile exists for this authenticated user, create a minimal one so
                // the UI (profile page, role checks) has something to render and the user
                // can update it. This avoids leaving the profile null and the page stuck
                // on "Loading profile...".
                try {
                  const defaultProfile = {
                    user_id: session.user.id,
                    full_name: session.user.email ?? '',
                    role: 'user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  } as any;
                  const { data: inserted, error: insertErr } = await supabase.from('profiles').insert(defaultProfile).select().single();
                  if (insertErr) {
                    console.warn('Failed to create default profile for user', insertErr);
                  } else if (inserted) {
                    setProfile(inserted as Profile);
                  }
                } catch (e) {
                  console.error('Exception creating default profile', e);
                }
              }
            } catch (e) {
              console.error('Exception fetching profile on auth change', e);
            }
          }, 0);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
    if (!supabaseConfigured) {
      console.debug('VITE_SUPABASE_URL not set — using local dev auth fallback');
      // Attempt to initialize from localAuth sessions (no async/await here to avoid parser issues)
      try {
        const sessionsRaw = localStorage.getItem('dev_sessions_v1');
        console.debug('local dev sessions raw', sessionsRaw);
        if (sessionsRaw) {
          const sessions = JSON.parse(sessionsRaw || '{}');
          const userIds = Object.keys(sessions);
          if (userIds.length > 0) {
            const userId = userIds[0];
            try {
              // Read local users directly from localStorage to avoid async calls during init
              const usersRaw = localStorage.getItem('dev_users_v1');
              console.debug('local dev users raw', usersRaw);
              const users = usersRaw ? JSON.parse(usersRaw || '[]') : [];
              const found = users.find((u: any) => u.id === userId);
              const profile = found ? found.profile : null;
              setUser({ id: userId, email: (profile && profile.email) || '' } as any);
              setSession({ user: { id: userId } } as any);
              setProfile(profile as any);
              console.debug('Initialized local dev profile', { userId, profile });
            } catch (e) {
              // ignore
              console.error('Error initializing local dev session', e);
            }
          }
        }
      } catch (e) {
        console.error('Error reading local dev sessions', e);
      } finally {
        setLoading(false);
      }
    } else {
      console.debug('Supabase configured — fetching Supabase session');
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.debug('supabase.auth.getSession result', session);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single()
            .then(async ({ data: profileData, error }) => {
              console.debug('profile fetch result on init', { profileData, error });
              if (profileData) {
                setProfile(profileData as Profile);
              } else if (session.user) {
                // create minimal profile if missing (best-effort)
                try {
                  const defaultProfile = {
                    user_id: session.user.id,
                    full_name: session.user.email ?? '',
                    role: 'user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  } as any;
                  const { data: inserted, error: insertErr } = await supabase.from('profiles').insert(defaultProfile).select().single();
                  if (insertErr) {
                    console.warn('Failed to create default profile on init', insertErr);
                  } else if (inserted) {
                    setProfile(inserted as Profile);
                  }
                } catch (e) {
                  console.error('Exception creating default profile on init', e);
                }
              }
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
  }

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // Normalize input to avoid whitespace/case issues, then check dev fallback.
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPassword = (password || '').trim();
    // Dev fallback: if the developer credentials are provided we always allow
    // a local dev sign-in so the app can be tested without Supabase.
    const isDevFallback = normalizedEmail === DEV_DEFAULT_EMAIL && normalizedPassword === DEV_DEFAULT_PASSWORD;

    if (isDevFallback) {
      // Create a fake user/session/profile locally
      const fakeUser = {
        id: 'dev-user-id-1',
        email: DEV_DEFAULT_EMAIL,
      } as any;

      const fakeSession = {
        provider_token: null,
        user: fakeUser,
      } as any;

      const fakeProfile = {
        id: 'dev-profile-1',
        user_id: fakeUser.id,
        full_name: 'Siva Arun',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any;

  // Persist the dev session in memory so the rest of the app behaves
  // the same as a Supabase session.
  setUser(fakeUser);
      setSession(fakeSession);
      setProfile(fakeProfile);
      setLoading(false);

      toast({ title: 'Signed in (dev)', description: "You're signed in using the local dev user." });
      return { data: { user: fakeUser, session: fakeSession } };
    }
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
  if (!supabaseConfigured) {
      // local auth
      const res = await localAuth.localSignIn(normalizedEmail, normalizedPassword);
      if (res.error) {
        toast({ title: 'Sign In Failed', description: res.error.message, variant: 'destructive' });
        return { error: res.error };
      }
      setUser(res.data.user as any);
      setSession(res.data.session as any);
      setProfile(res.data.profile as any);
      setLoading(false);
      toast({ title: 'Signed in (dev local)', description: "You're signed in using a local account." });
      return { data: res.data };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });

      return { data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signInWithOtp = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: "Failed to Send OTP",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Check your email",
        description: "We've sent you a verification code.",
      });

      return { data };
    } catch (error) {
      console.error('OTP sign in error:', error);
      return { error };
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        toast({
          title: "Verification Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Welcome!",
        description: "You've successfully signed in.",
      });

      return { data };
    } catch (error) {
      console.error('OTP verification error:', error);
      return { error };
    }
  };

  // Phone OTP (SMS) helpers
  const sendPhoneOtp = async (phone: string) => {
    try {
  const provider = import.meta.env.VITE_SUPABASE_SMS_PROVIDER;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

  // Local dev fallback
  if (!supabaseConfigured) {
        const code = '123456';
        const key = `dev_otp_${phone}`;
        localStorage.setItem(key, JSON.stringify({ code, expiresAt: Date.now() + 5 * 60 * 1000 }));
        toast({ title: 'Dev OTP', description: `Code: ${code}` });
        return { data: { ok: true } };
      }

      // If configured, call direct Twilio edge function
      if (provider === 'twilio-direct') {
        const res = await fetch('/functions/v1/twilio-send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        const body = await res.json();
        console.debug('twilio-send-otp resp', body);
        if (!res.ok) {
          toast({ title: 'Failed to send OTP', description: body?.error || 'Unknown error', variant: 'destructive' });
          return { error: body };
        }
        toast({ title: 'OTP Sent', description: 'Check your phone for the verification code.' });
        return { data: body };
      }

      // Default: Supabase-managed SMS
      const { data, error } = await supabase.auth.signInWithOtp({ phone });
      console.debug('supabase.signInWithOtp response', { data, error });
      if (error) {
        toast({ title: 'Failed to send OTP', description: error.message, variant: 'destructive' });
        return { error };
      }
      toast({ title: 'OTP Sent', description: 'If you do not receive an SMS, check your Supabase/Twilio configuration and Twilio logs.' });
      return { data };
    } catch (err) {
      console.error('sendPhoneOtp error', err);
      return { error: err };
    }
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    try {
  const provider = import.meta.env.VITE_SUPABASE_SMS_PROVIDER;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
  if (!supabaseConfigured) {
        const key = `dev_otp_${phone}`;
        const recRaw = localStorage.getItem(key);
        if (!recRaw) return { error: { message: 'No OTP requested' } };
        const rec = JSON.parse(recRaw);
        if (Date.now() > rec.expiresAt) return { error: { message: 'Code expired' } };
        if (rec.code !== token) return { error: { message: 'Invalid code' } };
        toast({ title: 'Phone verified (dev)' });
        return { data: { ok: true } };
      }

      if (provider === 'twilio-direct') {
        const res = await fetch('/functions/v1/twilio-verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, token }),
        });
        const body = await res.json();
        console.debug('twilio-verify-otp resp', body);
        if (!res.ok) {
          toast({ title: 'Verification Failed', description: body?.error || 'Unknown error', variant: 'destructive' });
          return { error: body };
        }
        toast({ title: 'Phone verified', description: 'Your phone number has been verified.' });
        return { data: body };
      }

      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) {
        toast({ title: 'Verification Failed', description: error.message, variant: 'destructive' });
        return { error };
      }
      toast({ title: 'Phone verified', description: 'Your phone number has been verified.' });
      return { data };
    } catch (err) {
      console.error('verifyPhoneOtp error', err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<Profile>) => {
    try {
      // Dev fallback for signUp: auto-create the default dev user/profile
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedPassword = (password || '').trim();
      const isDevFallback = normalizedEmail === DEV_DEFAULT_EMAIL && normalizedPassword === DEV_DEFAULT_PASSWORD;

      if (isDevFallback) {
        // Create using localAuth so the user is persisted for subsequent sign in
        const res = await localAuth.localSignUp(normalizedEmail, normalizedPassword, userData as any);
        if (res.error) {
          toast({ title: 'Sign Up Failed', description: res.error.message, variant: 'destructive' });
          return { error: res.error };
        }
        setUser(res.data.user as any);
        setSession(res.data.session as any);
        setProfile(res.data.profile as any);
        setLoading(false);
        toast({ title: 'Account created (dev)', description: "A local dev account has been created." });
        return { data: res.data };
      }
      // Get client IP for rate limiting
      const ip_address = await fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(data => data.ip)
        .catch(() => 'unknown');

      // Use secure signup edge function with rate limiting
      let data: any = null;
      let error: any = null;

      try {
        const invokeRes = await supabase.functions.invoke('secure-signup', {
          body: {
            email,
            password,
            userData,
            ip_address
          }
        });

        data = invokeRes.data;
        error = invokeRes.error;

        if (error) {
          // If the function exists but returned an error, bubble it up below
          throw error;
        }

        if (data?.error) {
          // Function returned a handled error payload
          throw new Error(data.error);
        }
      } catch (fnError) {
        // If invoking the edge function fails (not deployed, network, or error),
        // fall back to client-side sign up so the app can work locally.
        console.warn('secure-signup invoke failed, falling back to client signUp:', fnError);

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: userData,
          }
        });

        if (signUpError) {
          toast({
            title: "Sign Up Failed",
            description: signUpError.message,
            variant: "destructive",
          });
          return { error: signUpError };
        }

        data = signUpData;
      }

      // Sign in immediately after successful signup (works for both paths)
      const signInResult = await signIn(email, password);
      if (!signInResult.error) {
        toast({
          title: "Welcome to Abundant Share!",
          description: "Your account has been created successfully.",
        });
      }

      return { data };
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: "Sign Up Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    try {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
  // Local mode: clear local session via localAuth
  if (!supabaseConfigured && user && (user as any).id) {
        await localAuth.localSignOut((user as any).id);
        setUser(null);
        setSession(null);
        setProfile(null);
        toast({ title: 'Signed out', description: "You've been signed out of the local account." });
        return;
      }

      // If we're signed in as the earlier dev fallback id, just clear
      if (user && (user as any).id && String((user as any).id).startsWith('dev-')) {
        setUser(null);
        setSession(null);
        setProfile(null);
        toast({ title: 'Signed out', description: "You've been signed out of the local dev account." });
        return;
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        toast({
          title: "Sign Out Failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates as any)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      setProfile(data as Profile);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    signInWithOtp,
    verifyOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};