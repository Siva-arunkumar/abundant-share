import { FoodListing, Profile } from '@/types';
import localAuth from '@/lib/localAuth';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

const STORAGE_KEY = 'dev_food_listings_v1';
const CLAIMS_KEY = 'dev_food_claims_v1';

function readAll(): FoodListing[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FoodListing[];
  } catch (e) {
    console.error('Failed to read local listings', e);
    return [];
  }
}

function writeAll(listings: FoodListing[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch (e) {
    console.error('Failed to write local listings', e);
  }
}

function readClaims(): any[] {
  try {
    const raw = localStorage.getItem(CLAIMS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as any[];
  } catch (e) {
    console.error('Failed to read local claims', e);
    return [];
  }
}

function writeClaims(claims: any[]) {
  try {
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
  } catch (e) {
    console.error('Failed to write local claims', e);
  }
}

function seedIfEmpty() {
  const existing = readAll();
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const sample: FoodListing[] = [
    {
      id: `local-sample-1`,
      donor_id: 'dev-user-id-1',
      name: 'Apple Pack',
      title: 'Apple Pack',
      description: 'Fresh and natural apples.',
      quantity: '5 kg',
      category: 'other',
      expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
      pickup_time_start: now,
      pickup_time_end: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
      pickup_location: 'Sitra, Coimbatore',
      pickup_slots: [],
      status: 'available' as any,
      created_at: now,
      updated_at: now,
      images: [],
    },
    {
      id: `local-sample-2`,
      donor_id: 'dev-user-id-1',
      name: 'Chapathi Pack',
      title: 'Chapathi Pack',
      description: 'Homemade chapathis for immediate pickup.',
      quantity: '10 pcs',
      category: 'other',
      expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
      pickup_time_start: now,
      pickup_time_end: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
      pickup_location: 'Local Temple, Coimbatore',
      pickup_slots: [],
      status: 'available' as any,
      created_at: now,
      updated_at: now,
      images: [],
    },
    {
      id: `local-sample-3`,
      donor_id: 'dev-user-id-2',
      name: 'Idly Box',
      title: 'Idly Box',
      description: 'Soft idlies prepared fresh this morning.',
      quantity: '20 pcs',
      category: 'other',
      expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
      pickup_time_start: now,
      pickup_time_end: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
      pickup_location: 'Market Street, Coimbatore',
      pickup_slots: [],
      status: 'available' as any,
      created_at: now,
      updated_at: now,
      images: [],
    },
    {
      id: `local-sample-4`,
      donor_id: 'dev-user-id-3',
      name: 'Biryani Tray',
      title: 'Biryani Tray',
      description: 'Large biryani tray (vegetarian) ready for pickup.',
      quantity: '8 kg',
      category: 'other',
      expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
      pickup_time_start: now,
      pickup_time_end: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
      pickup_location: 'Community Hall, Coimbatore',
      pickup_slots: [],
      status: 'available' as any,
      created_at: now,
      updated_at: now,
      images: [],
    }
  ];

  writeAll(sample);
}

export async function localCreateListing(payload: Partial<FoodListing>): Promise<{ data?: FoodListing; error?: any }> {
  const listings = readAll();
  const id = `local-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const now = new Date().toISOString();
  const listing: FoodListing = {
    id,
    donor_id: (payload.donor_id as string) || 'dev-user-id-1',
    name: (payload.title as any) || (payload.name as any) || 'Untitled',
    title: (payload.title as any) || 'Untitled',
    description: (payload.description as any) || '',
    quantity: (payload.quantity as any) || '',
    category: (payload.category as any) || 'other',
    expiry_date: (payload.expiry_date as any) || now,
    pickup_time_start: (payload.pickup_time_start as any) || now,
    pickup_time_end: (payload.pickup_time_end as any) || now,
    pickup_location: (payload.pickup_location as any) || '',
    pickup_slots: [] as any[],
    status: (payload.status as any) || 'available',
    created_at: now,
    updated_at: now,
    images: (payload.images as any) || [],
  } as FoodListing;

  listings.unshift(listing);
  writeAll(listings);
  // notify listeners
  try { window.dispatchEvent(new Event('localListingsUpdated')); } catch {}
  return { data: listing };
}

export async function localUpdateListing(listingId: string, updates: Partial<FoodListing>): Promise<{ data?: FoodListing; error?: any }> {
  const listings = readAll();
  const idx = listings.findIndex(l => l.id === listingId);
  if (idx === -1) return { error: 'Not found' };
  const updated = { ...listings[idx], ...updates, updated_at: new Date().toISOString() } as FoodListing;
  listings[idx] = updated;
  writeAll(listings);
  try { window.dispatchEvent(new Event('localListingsUpdated')); } catch {}
  return { data: updated };
}

export async function localDeleteListing(listingId: string): Promise<{ error?: any }> {
  let listings = readAll();
  listings = listings.filter(l => l.id !== listingId);
  writeAll(listings);
  try { window.dispatchEvent(new Event('localListingsUpdated')); } catch {}
  return {};
}

export async function localCreateClaim(payload: { listing_id: string; claimed_by: string; quantity_requested?: number }): Promise<{ data?: any; error?: any }> {
  const claims = readClaims();
  const id = `claim-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const now = new Date().toISOString();
  const claim = {
    id,
    listing_id: payload.listing_id,
    claimed_by: payload.claimed_by,
    quantity_requested: payload.quantity_requested || 1,
    status: 'pending',
    claimed_at: now,
  };
  // attach a snapshot of the listing and donor profile so UI can render richer info in local mode
  try {
    const listings = readAll();
    const listing = listings.find(l => l.id === payload.listing_id) as any;
    if (listing) {
      // try to resolve donor profile from localAuth if available
      let donorProfile: any = null;
      try {
        donorProfile = await localAuth.localGetProfile(listing.donor_id);
      } catch (e) {
        // ignore
      }
      // attach nested structure similar to Supabase response shape
      (claim as any).food_listings = { ...listing, profiles: donorProfile || null };
    }
  } catch (e) {
    // ignore enrichment errors
  }

  claims.unshift(claim);
  writeClaims(claims);

  // also mark listing claimed
  await localClaimListing(payload.listing_id, payload.claimed_by);
  try { window.dispatchEvent(new Event('localClaimsUpdated')); } catch {}
  return { data: claim };
}

export async function localFetchClaimsByUser(userId: string): Promise<any[]> {
  const claims = readClaims();
  const filtered = claims.filter(c => c.claimed_by === userId);
  // enrich each claim with the current listing snapshot and donor profile if missing
  try {
    const listings = readAll();
    const enriched = await Promise.all(filtered.map(async (c) => {
      const copy = { ...c } as any;
      if (!copy.food_listings) {
        const listing = listings.find(l => l.id === copy.listing_id);
        if (listing) {
          let donorProfile: any = null;
          try { donorProfile = await localAuth.localGetProfile(listing.donor_id); } catch {}
          copy.food_listings = { ...listing, profiles: donorProfile || null };
        }
      }
      return copy;
    }));
    return enriched;
  } catch (e) {
    return filtered;
  }
}

export async function localFetchListings(): Promise<FoodListing[]> {
  seedIfEmpty();
  const listings = readAll();
  // filter available and not expired
  const now = new Date().toISOString();
  return listings.filter(l => l.status === 'available' && l.expiry_date >= now);
}

export async function localClaimListing(listingId: string, userId: string): Promise<{ error?: any }> {
  const listings = readAll();
  const idx = listings.findIndex(l => l.id === listingId);
  if (idx === -1) return { error: 'Not found' };
  listings[idx].status = 'claimed' as any;
  listings[idx].claimed_by = userId as any;
  listings[idx].claimed_at = new Date().toISOString();
  writeAll(listings);
  return {};
}

export default {
  localCreateListing,
  localFetchListings,
  localClaimListing,
  localUpdateListing,
  localDeleteListing,
  localCreateClaim,
  localFetchClaimsByUser,
};

// One-time auto-seed to make local development immediate and obvious.
// This will only run if the flag 'dev_autoseeded_v1' is not set and
// if we're running in a browser (window && localStorage available).
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const already = window.localStorage.getItem('dev_autoseeded_v1');
      // Only auto-seed when Supabase is not configured or when developing locally
    if (!already && (!isSupabaseConfigured || window.location.hostname === 'localhost')) {
      // Ensure the base seed exists
      seedIfEmpty();
      // Create one explicit auto-seed listing for the dev user
      (async () => {
        try {
          const now = new Date().toISOString();
          await localCreateListing({
            title: 'Dev Auto-Seed: Fresh Snacks',
            description: 'Auto-seeded listing to verify local mode.',
            quantity: '5 packs',
            donor_id: 'dev-user-id-1',
            expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
            pickup_time_start: now,
            pickup_time_end: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
            pickup_location: 'Dev Kitchen',
          });
          window.localStorage.setItem('dev_autoseeded_v1', '1');
        } catch (e) {
          // ignore
        }
      })();
    }
  }
} catch (e) {
  // ignore environments without localStorage
}
