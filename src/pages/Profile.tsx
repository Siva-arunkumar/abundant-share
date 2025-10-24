import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Profile as ProfileType } from '@/types';
import { User, Save, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Profile: React.FC = () => {
  const { profile, updateProfile, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  useEffect(() => {
    console.debug('Profile page profile:', profile);
  }, [profile]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileType>>({
    full_name: profile?.full_name || '',
    organization_name: profile?.organization_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    city: profile?.city || '',
    state: profile?.state || '',
    postal_code: profile?.postal_code || '',
  });

  // Phone verification state
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [phoneVerified, setPhoneVerified] = useState(Boolean(profile?.phone_verified));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile(formData);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };
 
  const handleInputChange = (field: keyof ProfileType, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'phone') {
      // mark unverified when phone number is changed
      setPhoneVerified(false);
    }
  };

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account information and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Picture */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>
              Update your profile picture to help others recognize you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                <AvatarFallback className="text-lg">
                  {profile.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" disabled>
                <Upload className="mr-2 h-4 w-4" />
                Upload New Picture
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                      <Button
                        type="button"
                        onClick={async () => {
                          if (!formData.phone) return toast({ title: 'Phone required', description: 'Enter a phone number first', variant: 'destructive' });
                          // basic E.164-ish check
                          if (!/^\+[0-9]{7,15}$/.test(String(formData.phone))) return toast({ title: 'Invalid phone', description: 'Use E.164 format like +919876543210', variant: 'destructive' });
                          setOtpSending(true);
                          try {
                            await sendPhoneOtp(String(formData.phone));
                            setOtpRequired(true);
                            setResendCooldown(60);
                            toast({ title: 'OTP Sent', description: 'Check your phone for the verification code.' });
                          } catch (err) {
                            console.error('sendPhoneOtp error', err);
                            toast({ title: 'Failed', description: 'Unable to send OTP. See console.', variant: 'destructive' });
                          } finally {
                            setOtpSending(false);
                          }
                        }}
                        disabled={otpSending || phoneVerified}
                      >
                        {phoneVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify'}
                      </Button>
                    </div>
                    {phoneVerified && <div className="text-sm text-green-500">Phone verified</div>}
                </div>
              </div>

              {/* OTP verification UI */}
              {otpRequired && (
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter verification code sent to {formData.phone}</Label>
                  <div className="flex items-center gap-2">
                    <Input id="otp" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="123456" />
                    <Button onClick={async () => {
                      if (!formData.phone) return;
                      setOtpVerifying(true);
                      try {
                        const res = await verifyPhoneOtp(String(formData.phone), otpCode);
                        if (res?.error) {
                          // verifyPhoneOtp shows toasts
                          return;
                        }
                        // persist verified phone
                        try {
                          await updateProfile({ phone: String(formData.phone), phone_verified: true });
                          setPhoneVerified(true);
                          setOtpRequired(false);
                          setOtpCode('');
                          toast({ title: 'Phone verified', description: 'Your phone number has been verified.' });
                        } catch (err) {
                          console.error('Error persisting verified phone', err);
                        }
                      } catch (err) {
                        console.error('verifyPhoneOtp error', err);
                      } finally {
                        setOtpVerifying(false);
                      }
                    }} disabled={otpVerifying}>
                      {otpVerifying ? 'Verifying...' : 'Verify Code'}
                    </Button>
                    <Button variant="outline" onClick={async () => {
                      if (!formData.phone) return;
                      setOtpSending(true);
                      try {
                        await sendPhoneOtp(String(formData.phone));
                        setResendCooldown(60);
                        toast({ title: 'Resent', description: 'OTP resent to your phone.' });
                      } catch (err) {
                        console.error('resend error', err);
                      } finally {
                        setOtpSending(false);
                      }
                    }} disabled={otpSending || resendCooldown > 0}>
                      {otpSending ? 'Resending...' : resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setOtpRequired(false); setOtpCode(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organization_name">Organization Name (Optional)</Label>
                  <Input
                    id="organization_name"
                    value={formData.organization_name}
                    onChange={(e) => handleInputChange('organization_name', e.target.value)}
                    placeholder="Enter your organization name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter your address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    placeholder="12345"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account details and role information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                  <p className="text-sm font-medium capitalize">
                    {profile.role === 'admin' ? 'Administrator' : 'Community Member'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                  <p className="text-sm font-medium">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;