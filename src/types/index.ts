// Type definitions for the Food Surplus Sharing Platform

export type UserRole = 'user' | 'admin';

export type FoodCategory = 
  | 'veg'
  | 'non_veg'
  | 'dairy'
  | 'bakery'
  | 'packaged'
  | 'cooked'
  | 'other';

export type ListingStatus = 'available' | 'booked' | 'expired' | 'completed';

export type BookingStatus = 'pending' | 'collected' | 'cancelled';

export type NotificationType = 
  | 'new_listing'
  | 'listing_claimed'
  | 'pickup_scheduled'
  | 'pickup_completed'
  | 'listing_expired'
  | 'expiry_reminder';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  organization_name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  location?: string; // New location field
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FoodListing {
  id: string;
  donor_id: string;
  name: string; // Updated from title
  title: string;
  description: string;
  quantity: string;
  category: FoodCategory;
  expiry_date: string;
  pickup_time_start: string;
  pickup_time_end: string;
  pickup_location: string;
  pickup_slots: any[]; // JSON array of pickup slots
  status: ListingStatus;
  claimed_by?: string;
  claimed_at?: string;
  completed_at?: string;
  images: string[];
  image_url?: string;
  is_urgent?: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  profiles?: Profile;
  claimed_by_profile?: Profile;
}

export interface Claim {
  id: string;
  listing_id: string;
  claimed_by: string;
  claimed_at: string;
  quantity_booked?: string;
  pickup_time?: string;
  pickup_scheduled_at?: string;
  completed_at?: string;
  status: BookingStatus;
  notes?: string;
  // Relations
  food_listings?: FoodListing;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  listing_id?: string;
  read: boolean;
  created_at: string;
  // Relations
  food_listings?: FoodListing;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export interface PlatformStats {
  id: string;
  total_meals_served: number;
  total_food_saved_kg: number;
  total_ngos_onboarded: number;
  updated_at: string;
}

export interface AuthContextType {
  user: any;
  session: any;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData: Partial<Profile>) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signInWithOtp: (email: string) => Promise<any>;
  verifyOtp: (email: string, token: string) => Promise<any>;
}