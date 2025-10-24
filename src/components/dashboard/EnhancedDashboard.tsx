import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import localListings from '@/lib/localListings';
import { useAuth } from '@/contexts/AuthContext';
import { useImpactStats } from '@/hooks/useImpactStats';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { FoodListing, Claim } from '@/types';
import { Plus, TrendingUp, Award, Heart, Package } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Link, useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const EnhancedDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { impact, loading: impactLoading } = useImpactStats();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [localImpact, setLocalImpact] = useState<any | null>(null);
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'claims' ? 'claims' : 'listings';
  const [activeTab, setActiveTab] = useState<'listings' | 'claims'>(initialTab as any);
  const [claimDetail, setClaimDetail] = useState<Claim | null>(null);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);

  // React to changes in URL query params (e.g. when navigating from Browse after a claim)
  useEffect(() => {
    const claimId = searchParams.get('claimId');
    if (!claimId || !user) return;

    // If we already have the claimDetail matching the id, just open
    if (claimDetail && String(claimDetail.id) === String(claimId)) {
      setClaimDialogOpen(true);
      setActiveTab('claims');
      return;
    }

    // Try Supabase first when available
    (async () => {
      try {
        const viteUrl = import.meta.env.VITE_SUPABASE_URL;
        if (viteUrl) {
          const { data: rows } = await supabase.from('claims').select(`*, food_listings (*, profiles:donor_id (full_name, phone))`).eq('id', claimId).limit(1);
          if (rows && rows.length > 0) {
            setClaimDetail(rows[0] as any);
            setClaimDialogOpen(true);
            setActiveTab('claims');
            return;
          }
        }

        // Local fallback: look up in local claims for this user
        const localClaims = await localListings.localFetchClaimsByUser(user.id);
        const found = (localClaims || []).find((c:any) => String(c.id) === String(claimId));
        if (found) {
          setClaimDetail(found as any);
          setClaimDialogOpen(true);
          setActiveTab('claims');
          return;
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [searchParams, user]);

  // Real-time subscriptions
  useRealtimeSubscription({
    table: 'food_listings',
    event: '*',
    onPayload: (payload) => {
      if (payload.eventType === 'INSERT') {
        setListings(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setListings(prev => prev.map(listing => 
          listing.id === payload.new.id ? payload.new : listing
        ));
      } else if (payload.eventType === 'DELETE') {
        setListings(prev => prev.filter(listing => listing.id !== payload.old.id));
      }
    }
  });

  useRealtimeSubscription({
    table: 'claims',
    event: '*',
    onPayload: (payload) => {
      if (payload.eventType === 'INSERT') {
        setClaims(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setClaims(prev => prev.map(claim => 
          claim.id === payload.new.id ? payload.new : claim
        ));
      }
    }
  });

  useEffect(() => {
    if (!user) return;

    const onUpdate = () => {
      // re-run fetchData by calling the same logic
      // simple approach: call fetchData declared earlier by re-invoking effect
      // We force a re-run by calling the fetch function via an IIFE
      (async () => {
        setLoading(true);
        try {
          const listingsData = await localListings.localFetchListings();
          setListings(listingsData.filter(l => l.donor_id === user.id) as any);
          setClaims([]);
        } catch (e) {
          console.error('Error refreshing local listings:', e);
        } finally {
          setLoading(false);
        }
      })();
    };

  window.addEventListener('localListingsUpdated', onUpdate);
  // remove listener on cleanup below (after fetchData call)

    const fetchData = async () => {
      setLoading(true);
      try {
        const viteUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!viteUrl) {
          const listingsData = await localListings.localFetchListings();
          setListings(listingsData.filter(l => l.donor_id === user.id) as any);
          const claimsData = await localListings.localFetchClaimsByUser(user.id);
          setClaims(claimsData as any);
          // compute minimal impact/ chart data from local listings
          setLocalImpact({ meals_donated: listingsData.length, meals_received: 0, food_wasted_kg: 0 });
          setIsLocalMode(true);
          setLoading(false);
          return;
        }

        // Fetch user's listings (when they act as donor)
        const { data: listingsData } = await supabase
          .from('food_listings')
          .select('*')
          .eq('donor_id', user.id)
          .order('created_at', { ascending: false });
        
  if (listingsData) setListings(listingsData as any);

        // Fetch user's claims (when they act as recipient)
        const { data: claimsData } = await supabase
          .from('claims')
          .select(`
            *,
            food_listings (
              title,
              description,
              pickup_location,
              pickup_time_start,
              pickup_time_end,
              profiles:donor_id (full_name, organization_name, phone)
            )
          `)
          .eq('claimed_by', user.id)
          .order('claimed_at', { ascending: false });
        
        if (claimsData) setClaims(claimsData as any);

        // If URL requests opening a claim detail, attempt to locate it and open dialog
        const claimIdFromUrl = searchParams.get('claimId');
        if (claimIdFromUrl) {
          const found = (claimsData || []).find((c: any) => String(c.id) === String(claimIdFromUrl));
          if (found) {
            setClaimDetail(found as any);
            setClaimDialogOpen(true);
            setActiveTab('claims');
          } else {
            // try local fallback to locate claim
            try {
              const localClaims = await localListings.localFetchClaimsByUser(user.id);
              const f2 = (localClaims || []).find((c: any) => String(c.id) === String(claimIdFromUrl));
              if (f2) {
                setClaimDetail(f2 as any);
                setClaimDialogOpen(true);
                setActiveTab('claims');
              }
            } catch {}
          }
        }

        // Merge any local listings (created in local mode) so they appear in dashboard
        try {
          const local = await localListings.localFetchListings();
          if (local && local.length > 0) {
            // include only local items for this user and avoid duplicates
            const localForUser = local.filter(l => l.donor_id === user.id);
            const existingIds = new Set((listingsData || []).map((l: any) => l.id));
            const merged = [
              ...localForUser.filter(l => !existingIds.has(l.id)),
              ...(listingsData || []),
            ];
            setListings(merged as any);
            setIsLocalMode(true);
          }
          // compute local impact if not present
          if (!impact && local && local.length > 0) {
            setLocalImpact({ meals_donated: local.length, meals_received: 0, food_wasted_kg: 0 });
          }
        } catch (e) {
          // ignore
        }
      } catch (err) {
        console.warn('Error fetching dashboard data from Supabase, attempting local fallback:', err);
        try {
          const listingsData = await localListings.localFetchListings();
          setListings(listingsData.filter(l => l.donor_id === user.id) as any);
          const claimsData = await localListings.localFetchClaimsByUser(user.id);
          setClaims(claimsData as any);
          const claimIdFromUrl = searchParams.get('claimId');
          if (claimIdFromUrl) {
            const f2 = (claimsData || []).find((c: any) => String(c.id) === String(claimIdFromUrl));
            if (f2) {
              setClaimDetail(f2 as any);
              setClaimDialogOpen(true);
              setActiveTab('claims');
            }
          }
          setIsLocalMode(true);
        } catch (localErr) {
          console.error('Error fetching dashboard data (local fallback):', localErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      window.removeEventListener('localListingsUpdated', onUpdate);
    };
  }, [user, profile]);

  // Handlers moved to component scope so JSX can access them
  const handleEditListing = async (listing: FoodListing) => {
    const title = window.prompt('Edit title', listing.title) || listing.title;
    const { data, error } = await localListings.localUpdateListing(listing.id, { title });
    if (error) {
      toast({ title: 'Error', description: 'Failed to update listing', variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: 'Listing updated' });
      window.dispatchEvent(new Event('localListingsUpdated'));
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm('Delete this listing?')) return;
    await localListings.localDeleteListing(listingId);
    toast({ title: 'Deleted', description: 'Listing deleted' });
  };

  const handleMarkAsReceived = async (claimId: string) => {
    try {
      const { error } = await supabase
        .from('claims')
        .update({ 
          status: 'received' as any,
          received_at: new Date().toISOString()
        })
        .eq('id', claimId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Marked as received successfully!",
      });
    } catch (error) {
      console.error('Error updating claim:', error);
      toast({
        title: "Error",
        description: "Failed to update claim status",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsCompleted = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('food_listings')
        .update({ 
          status: 'completed' as any,
          completed_at: new Date().toISOString()
        })
        .eq('id', listingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Listing marked as completed!",
      });
    } catch (error) {
      console.error('Error updating listing:', error);
      toast({
        title: "Error",
        description: "Failed to complete listing",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success text-success-foreground';
      case 'claimed': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-info text-info-foreground';
      case 'expired': return 'bg-destructive text-destructive-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'received': return 'bg-success text-success-foreground';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading || impactLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Welcome Section */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {profile?.full_name || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Donate food when you have surplus or browse available food when you need it
        </p>
        {/* Dev mode banner removed — local mode indicator hidden on dashboard UI */}
      </motion.div>

      {/* Impact Statistics */}
      {(impact || localImpact) && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meals Donated</CardTitle>
              <Heart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{impact?.meals_donated ?? localImpact?.meals_donated ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meals Received</CardTitle>
              <Package className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{impact?.meals_received ?? localImpact?.meals_received ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Food Wasted</CardTitle>
              <TrendingUp className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{(impact?.food_wasted_kg ?? localImpact?.food_wasted_kg ?? 0)}kg</div>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impact Score</CardTitle>
              <Award className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-info">
                  {((impact?.meals_donated ?? localImpact?.meals_donated ?? 0) + (impact?.meals_received ?? localImpact?.meals_received ?? 0))}
                </div>
              </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="flex flex-wrap gap-4">
          <Button asChild className="hover-scale">
            <Link to="/create-listing">
              <Plus className="mr-2 h-4 w-4" />
              Create New Listing
            </Link>
          </Button>
          <Button onClick={async () => {
            setLoading(true);
            try {
              const viteUrl = import.meta.env.VITE_SUPABASE_URL;
              if (!viteUrl) {
                const listingsData = await localListings.localFetchListings();
                setListings(listingsData.filter(l => l.donor_id === user?.id) as any);
              } else {
                const { data } = await supabase.from('food_listings').select('*').eq('donor_id', user?.id).order('created_at', { ascending: false });
                if (data) setListings(data as any);
              }
            } catch (e) { console.error(e); }
            setLoading(false);
          }} variant="outline">Refresh</Button>
          <Button asChild variant="outline" className="hover-scale">
            <Link to="/browse">
              <Package className="mr-2 h-4 w-4" />
              Browse Food
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Dashboard Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="claims">My Claims</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-6">
            {listings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start making a difference by creating your first food listing
                  </p>
                  <Button asChild>
                    <Link to="/create-listing">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Listing
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {listings.map((listing, index) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="hover-scale">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{listing.title}</CardTitle>
                            <p className="text-muted-foreground">{listing.description}</p>
                          </div>
                          <Badge className={getStatusColor(listing.status)}>
                            {listing.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="font-medium">Quantity:</span> {listing.quantity}
                          </div>
                          <div>
                            <span className="font-medium">Expires:</span> {format(new Date(listing.expiry_date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 justify-end mb-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditListing(listing)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteListing(listing.id)}>Delete</Button>
                        </div>

                        {(listing.status as string) === 'claimed' && (
                          <div className="flex justify-end">
                            <Button 
                              onClick={() => handleMarkAsCompleted(listing.id)}
                              size="sm"
                              className="hover-scale"
                            >
                              Mark as Completed
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="claims" className="space-y-6">
            {claims.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No claims yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Browse available food to make your first claim
                  </p>
                  <Button asChild>
                    <Link to="/browse">
                      Browse Food
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {claims.map((claim, index) => (
                  <motion.div
                    key={claim.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="hover-scale">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {(claim.food_listings as any)?.title}
                            </CardTitle>
                            <p className="text-muted-foreground">
                              {(claim.food_listings as any)?.description}
                            </p>
                          </div>
                          <Badge className={getStatusColor(claim.status || 'pending')}>
                            {claim.status || 'pending'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm mb-4">
                          <div>
                            <span className="font-medium">Pickup Location:</span> {(claim.food_listings as any)?.pickup_location}
                          </div>
                          <div>
                            <span className="font-medium">Pickup Time:</span> {' '}
                            {(claim.food_listings as any)?.pickup_time_start && 
                              format(new Date((claim.food_listings as any).pickup_time_start), 'MMM dd, HH:mm')
                            } - {' '}
                            {(claim.food_listings as any)?.pickup_time_end && 
                              format(new Date((claim.food_listings as any).pickup_time_end), 'HH:mm')
                            }
                          </div>
                        </div>
                        
                        {claim.status === 'pending' && (
                          <div className="flex justify-end">
                            <Button 
                              onClick={() => handleMarkAsReceived(claim.id)}
                              size="sm"
                              className="hover-scale"
                            >
                              Mark as Received
                            </Button>
                          </div>
                        )}
                        <div className="flex justify-end mt-2">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/dashboard/claim/${encodeURIComponent(String(claim.id))}`}>View Details</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={claimDialogOpen} onOpenChange={(open) => { if (!open) { setClaimDialogOpen(false); setClaimDetail(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pickup Details</DialogTitle>
              <DialogDescription>
                Details for the claimed donation
              </DialogDescription>
            </DialogHeader>
            {claimDetail ? (
              <div className="space-y-4">
                <div>
                  <div className="font-medium">{(claimDetail.food_listings as any)?.title}</div>
                  <div className="text-sm text-muted-foreground">{(claimDetail.food_listings as any)?.description}</div>
                </div>
                <div>
                  <div className="font-medium">Pickup Location</div>
                  <div className="text-sm">{(claimDetail.food_listings as any)?.pickup_location}</div>
                </div>
                <div>
                  <div className="font-medium">Pickup Time</div>
                  <div className="text-sm">{(claimDetail.food_listings as any)?.pickup_time_start && format(new Date((claimDetail.food_listings as any).pickup_time_start), 'MMM dd, HH:mm')} - { (claimDetail.food_listings as any)?.pickup_time_end && format(new Date((claimDetail.food_listings as any).pickup_time_end), 'HH:mm')}</div>
                </div>
                {(claimDetail.food_listings as any)?.profiles?.phone && (
                  <div>
                    <div className="font-medium">Donor Phone</div>
                    <div className="text-sm"><a className="text-primary underline" href={`tel:${(claimDetail.food_listings as any).profiles.phone}`}>{(claimDetail.food_listings as any).profiles.phone}</a></div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => { setClaimDialogOpen(false); setClaimDetail(null); }}>Close</Button>
                </div>
              </div>
            ) : (
              <div>No claim details available</div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedDashboard;