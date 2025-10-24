import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Utensils, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Auth: React.FC = () => {
  const { user, signIn, signUp, loading, sendPhoneOtp, verifyPhoneOtp, updateProfile } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [isLoading, setIsLoading] = useState(false);
  // Prefill dev credentials when running locally to make testing easier
  const isLocalHost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const [signInData, setSignInData] = useState({
    email: isLocalHost ? 'sivaarunkumar23@gmail.com' : '',
    password: isLocalHost ? 'siva@1234' : '',
  });
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
  });
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirm, setShowSignUpConfirm] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [phoneVerified, setPhoneVerified] = useState(false);
 

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to={from} replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn(signInData.email, signInData.password);
      if (!result.error) {
        // Navigation will happen automatically via AuthContext
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (signUpData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    // If phone provided but not verified, prevent signup until verified
    if (signUpData.phone && !phoneVerified) {
      toast({ title: 'Phone verification required', description: 'Please verify your mobile number before creating an account.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(signUpData.email, signUpData.password, {
        full_name: signUpData.fullName,
        phone: signUpData.phone,
      });

      // If signup succeeded and phone was verified, persist it on profile
      if (!result?.error && signUpData.phone && phoneVerified) {
        try {
          await updateProfile({ phone: signUpData.phone, phone_verified: true } as any);
        } catch (err) {
          console.error('Failed to persist phone on profile after signup', err);
        }
      }
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: "Sign Up Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPhoneVerification = async () => {
    if (!signUpData.phone) {
      toast({ title: 'Phone required', description: 'Please enter a phone number first.', variant: 'destructive' });
      return;
    }
    // Basic E.164 validation: must start with + and digits
    if (!/^\+[0-9]{7,15}$/.test(signUpData.phone)) {
      toast({ title: 'Invalid phone format', description: 'Please enter phone in E.164 format, e.g. +919876543210', variant: 'destructive' });
      return;
    }
    setOtpSending(true);
    try {
      await sendPhoneOtp(signUpData.phone);
      setOtpPhone(signUpData.phone);
      setOtpRequired(true);
      setResendCooldown(60);
    } catch (err) {
      console.error('Failed to send phone OTP', err);
      // Improve error feedback
      toast({ title: 'Failed to send OTP', description: 'Check Supabase/Twilio configuration and phone number. See console for details.', variant: 'destructive' });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpPhone) return;
    setOtpVerifying(true);
    try {
      const res = await verifyPhoneOtp(otpPhone, otpCode);
      if (res?.error) {
        // handled inside verifyPhoneOtp with toast
        setOtpVerifying(false);
        return;
      }
      // Mark verified locally; profile will be updated after account creation
      setPhoneVerified(true);
      setOtpRequired(false);
      setOtpCode('');
      toast({ title: 'Phone verified', description: 'You can now create your account.' });
    } catch (err) {
      console.error('verify otp error', err);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpPhone) return;
    setOtpSending(true);
    try {
      await sendPhoneOtp(otpPhone);
      // start cooldown
      setResendCooldown(60);
      setOtpSending(false);
    } catch (err) {
      console.error('resend otp error', err);
      setOtpSending(false);
    }
  };

  // cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const t = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) {
          clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // password visibility handlers handled via state toggles above

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Utensils className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Abundant Share</CardTitle>
          <CardDescription>
            Join our community to reduce food waste and fight hunger
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showSignInPassword ? 'text' : 'password'}
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                    />
                    <button type="button" onClick={() => setShowSignInPassword(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2">
                      {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+91 xxxxxxxxxx"
                      className="flex-1"
                      value={signUpData.phone}
                      onChange={(e) => { setSignUpData({ ...signUpData, phone: e.target.value }); setPhoneVerified(false); }}
                    />
                    <Button
                      type="button"
                      onClick={handleStartPhoneVerification}
                      disabled={!signUpData.phone || otpRequired || otpSending || phoneVerified}
                    >
                      {phoneVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify mobile number'}
                    </Button>
                  </div>
                  {phoneVerified && <div className="text-sm text-green-500">Phone verified</div>}
                </div>
                
                
                <div className="space-y-2">
                  {/* OTP row: shown above password when otpRequired */}
                  {otpRequired && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-otp">Enter verification code sent to {otpPhone}</Label>
                      <div className="flex items-center gap-2">
                        <Input id="signup-otp" type="text" placeholder="123456" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
                        <Button onClick={handleVerifyOtp} className="flex-none" disabled={otpVerifying}>
                          {otpVerifying ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Verify Code'
                          )}
                        </Button>
                        <Button variant="outline" onClick={handleResendOtp} disabled={otpSending || resendCooldown > 0}>
                          {otpSending ? 'Resending...' : resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                        </Button>
                        <Button variant="ghost" onClick={() => { setOtpRequired(false); setOtpCode(''); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignUpPassword ? 'text' : 'password'}
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                    />
                    <button type="button" onClick={() => setShowSignUpPassword(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2">
                      {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showSignUpConfirm ? 'text' : 'password'}
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      required
                    />
                    <button type="button" onClick={() => setShowSignUpConfirm(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2">
                      {showSignUpConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                {!otpRequired ? (
                  <Button type="submit" className="w-full" disabled={isLoading || (signUpData.phone && !phoneVerified)}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="signup-otp">Enter verification code sent to {otpPhone}</Label>
                      <Input id="signup-otp" type="text" placeholder="123456" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleVerifyOtp} className="flex-1" disabled={otpVerifying}>
                        {otpVerifying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          'Verify Code'
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleResendOtp} disabled={otpSending || resendCooldown > 0}>
                        {otpSending ? 'Resending...' : resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                      </Button>
                    </div>

                    <Button variant="ghost" onClick={() => { setOtpRequired(false); setOtpCode(''); }}>
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </TabsContent>
            
            {/* OTP tab removed - email OTP flow is not displayed */}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;