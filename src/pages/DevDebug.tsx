import React, { useEffect, useState } from 'react';
import localListings from '@/lib/localListings';
import localAuth from '@/lib/localAuth';
import { Button } from '@/components/ui/button';

const DevDebug: React.FC = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Record<string,string>>({});

  const refresh = async () => {
    try {
      const l = await localListings.localFetchListings();
      setListings(l as any[]);
    } catch (e) { setListings([]); }
    try {
      const c = await localListings.localFetchClaimsByUser('dev-user-id-1');
      setClaims(c as any[]);
    } catch (e) { setClaims([]); }
    try {
      const raw = localStorage.getItem('dev_users_v1');
      setUsers(raw ? JSON.parse(raw) : []);
    } catch (e) { setUsers([]); }
    try {
      const raw = localStorage.getItem('dev_sessions_v1');
      setSessions(raw ? JSON.parse(raw) : {});
    } catch (e) { setSessions({}); }
  };

  useEffect(() => { refresh();
    const onL = () => refresh();
    window.addEventListener('localListingsUpdated', onL);
    window.addEventListener('localClaimsUpdated', onL);
    return () => {
      window.removeEventListener('localListingsUpdated', onL);
      window.removeEventListener('localClaimsUpdated', onL);
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Dev Debug</h2>
      <div className="mb-4 flex gap-2">
        <Button onClick={refresh}>Refresh</Button>
        <Button onClick={async () => { await localListings.localCreateListing({ title: 'Manual Dev Seed', description: 'Added from Dev Debug', donor_id: 'dev-user-id-1' }); refresh(); }}>Add Test Listing</Button>
        <Button onClick={async () => { await localAuth.localSignUp('alice@example.com','password123',{ full_name: 'Alice', phone: '+1 111 111 1111' }); refresh(); }}>Add Test User (Alice)</Button>
        <Button onClick={async () => { await localAuth.localSignUp('bob@example.com','password123',{ full_name: 'Bob', phone: '+1 222 222 2222' }); refresh(); }}>Add Test User (Bob)</Button>
        <Button onClick={() => { localStorage.removeItem('dev_food_listings_v1'); localStorage.removeItem('dev_food_claims_v1'); localStorage.removeItem('dev_autoseeded_v1'); refresh(); }}>Clear Dev Storage</Button>
      </div>

      <section className="mb-6">
        <h3 className="font-semibold">Local Listings ({listings.length})</h3>
        <pre className="mt-2 bg-muted p-2 rounded max-h-64 overflow-auto">{JSON.stringify(listings, null, 2)}</pre>
      </section>

      <section>
        <h3 className="font-semibold">Local Claims ({claims.length})</h3>
        <pre className="mt-2 bg-muted p-2 rounded max-h-64 overflow-auto">{JSON.stringify(claims, null, 2)}</pre>
      </section>
      
      <section className="mt-6">
        <h3 className="font-semibold">Local Users ({users.length})</h3>
        <pre className="mt-2 bg-muted p-2 rounded max-h-64 overflow-auto">{JSON.stringify(users, null, 2)}</pre>
      </section>

      <section className="mt-6">
        <h3 className="font-semibold">Local Sessions</h3>
        <pre className="mt-2 bg-muted p-2 rounded max-h-32 overflow-auto">{JSON.stringify(sessions, null, 2)}</pre>
      </section>
    </div>
  );
};

export default DevDebug;
