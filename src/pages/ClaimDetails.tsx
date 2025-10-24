import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import localListings from '@/lib/localListings';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const ClaimDetails: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [claim, setClaim] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured) {
          // Fetch claim and include donor profile and claimant profile in one query
          const { data: rows } = await supabase
            .from('claims')
            .select(`*, food_listings (*, profiles:donor_id (full_name, organization_name, phone)), claimed_by_profile:claimed_by (full_name, email, phone)`)
            .eq('id', id)
            .limit(1);

          if (rows && rows.length > 0) {
            const c = rows[0] as any;
            // Enrich: if donor or claimant profile is missing or lacks email, try to fetch profiles directly
            try {
              const donorUserId = (c.food_listings as any)?.donor_id;
              if (donorUserId && (!(c.food_listings as any)?.profiles || !(c.food_listings as any).profiles.full_name)) {
                const { data: donorProfile } = await supabase.from('profiles').select('id,user_id,full_name,phone,email').eq('user_id', donorUserId).single();
                if (donorProfile) {
                  (c.food_listings as any).profiles = { ...((c.food_listings as any).profiles || {}), ...donorProfile };
                }
              }

              const claimantId = c.claimed_by;
              if (claimantId && !c.claimed_by_profile) {
                const { data: claimantProfile } = await supabase.from('profiles').select('id,user_id,full_name,phone,email').eq('user_id', claimantId).single();
                if (claimantProfile) c.claimed_by_profile = claimantProfile;
              }
            } catch (e) {
              // ignore enrichment errors (columns like 'email' may not exist in profiles)
              console.debug('Profile enrichment failed', e);
            }

            setClaim(c);
            setLoading(false);
            return;
          }

        }

        // Local fallback: try to find the claim in local claims for the current user (or across local storage)
        try {
          const localClaims = user ? await localListings.localFetchClaimsByUser(user.id) : [];
          const found = (localClaims || []).find((c: any) => String(c.id) === String(id));
          if (found) {
            setClaim(found);
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore
        }

        toast({ title: 'Not found', description: 'Claim details not available', variant: 'destructive' });
      } catch (e) {
        console.error('Failed to load claim details', e);
        toast({ title: 'Error', description: 'Failed to load claim details', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  if (loading) return <div className="container mx-auto px-4 py-8">Loading claim details...</div>;
  if (!claim) return <div className="container mx-auto px-4 py-8">No claim found.</div>;

  const claimant = claim.claimed_by_profile || claim.claimed_by_profile || null;
  const donor = (claim.food_listings && (claim.food_listings as any).profiles) || null;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Claim Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="font-medium">Food</div>
              <div className="text-sm">{(claim.food_listings as any)?.title}</div>
              <div className="text-muted-foreground text-sm">{(claim.food_listings as any)?.description}</div>
            </div>

            <div>
              <div className="font-medium">Pickup Location</div>
              <div className="text-sm">{(claim.food_listings as any)?.pickup_location}</div>
            </div>

            <div>
              <div className="font-medium">Donor</div>
              <div className="text-sm">{donor?.full_name || (claim.food_listings as any)?.donor_name || 'Unknown'}</div>
              <div className="text-sm">{(donor && (donor as any).email) ? (donor as any).email : <span className="text-muted-foreground">Not available</span>}</div>
              {donor?.phone && (
                <div className="text-sm mt-1">
                  <a className="text-primary underline" href={`tel:${donor.phone}`}>{donor.phone}</a>
                </div>
              )}
              <div className="mt-3">
                {donor?.phone ? (
                  <Button asChild>
                    <a href={`tel:${donor.phone}`}>Contact Donor</a>
                  </Button>
                ) : (donor && (donor as any).email) ? (
                  <Button asChild>
                    <a href={`mailto:${(donor as any).email}`}>Email Donor</a>
                  </Button>
                ) : (
                  <Button disabled>Contact Not Available</Button>
                )}
              </div>
            </div>

            <div>
              <div className="font-medium">Claimed By (You)</div>
              <div className="text-sm">{claimant?.full_name || 'Unknown'}</div>
              <div className="text-sm">{(claimant && (claimant as any).email) ? (claimant as any).email : <span className="text-muted-foreground">Not available</span>}</div>
              {claimant?.phone && <div className="text-sm">{claimant.phone}</div>}
            </div>

            <div className="flex gap-2 justify-end">
              <Button asChild>
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClaimDetails;
