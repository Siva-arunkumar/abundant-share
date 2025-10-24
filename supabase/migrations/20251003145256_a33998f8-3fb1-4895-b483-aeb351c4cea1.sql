-- Create user role enum
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Create food category enum  
CREATE TYPE food_category AS ENUM ('veg', 'non_veg', 'dairy', 'bakery', 'packaged', 'cooked', 'other');

-- Create listing status enum
CREATE TYPE listing_status AS ENUM ('available', 'booked', 'expired', 'completed');

-- Create booking status enum
CREATE TYPE booking_status AS ENUM ('pending', 'collected', 'cancelled');

-- Create notification type enum
CREATE TYPE notification_type AS ENUM ('new_listing', 'listing_claimed', 'pickup_scheduled', 'pickup_completed', 'listing_expired', 'expiry_reminder');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'user',
  organization_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  location TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create food_listings table
CREATE TABLE food_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity TEXT NOT NULL,
  category food_category NOT NULL,
  expiry_date TIMESTAMPTZ NOT NULL,
  pickup_time_start TIMESTAMPTZ NOT NULL,
  pickup_time_end TIMESTAMPTZ NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_slots JSONB DEFAULT '[]'::jsonb,
  status listing_status NOT NULL DEFAULT 'available',
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  image_url TEXT,
  is_urgent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on food_listings
ALTER TABLE food_listings ENABLE ROW LEVEL SECURITY;

-- Food listings RLS policies
CREATE POLICY "Anyone can view available listings" ON food_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Donors can create listings" ON food_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = donor_id);
CREATE POLICY "Donors can update own listings" ON food_listings FOR UPDATE TO authenticated USING (auth.uid() = donor_id);
CREATE POLICY "Donors can delete own listings" ON food_listings FOR DELETE TO authenticated USING (auth.uid() = donor_id);

-- Create claims table
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES food_listings(id) ON DELETE CASCADE,
  claimed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quantity_booked TEXT,
  pickup_time TIMESTAMPTZ,
  pickup_scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ
);

-- Enable RLS on claims
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Claims RLS policies
CREATE POLICY "Users can view own claims" ON claims FOR SELECT TO authenticated USING (auth.uid() = claimed_by);
CREATE POLICY "Donors can view claims on their listings" ON claims FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM food_listings WHERE id = claims.listing_id AND donor_id = auth.uid())
);
CREATE POLICY "Users can create claims" ON claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = claimed_by);
CREATE POLICY "Users can update own claims" ON claims FOR UPDATE TO authenticated USING (auth.uid() = claimed_by);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  listing_id UUID REFERENCES food_listings(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications RLS policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Create platform_stats table
CREATE TABLE platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_meals_served INTEGER NOT NULL DEFAULT 0,
  total_food_saved_kg NUMERIC NOT NULL DEFAULT 0,
  total_ngos_onboarded INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on platform_stats
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

-- Platform stats RLS policies
CREATE POLICY "Anyone can view platform stats" ON platform_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can update platform stats" ON platform_stats FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert initial platform stats
INSERT INTO platform_stats (total_meals_served, total_food_saved_kg, total_ngos_onboarded) 
VALUES (0, 0, 0);

-- Create user_impact table
CREATE TABLE user_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meals_donated INTEGER NOT NULL DEFAULT 0,
  meals_received INTEGER NOT NULL DEFAULT 0,
  food_wasted_kg NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_impact
ALTER TABLE user_impact ENABLE ROW LEVEL SECURITY;

-- User impact RLS policies
CREATE POLICY "Users can view own impact" ON user_impact FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own impact" ON user_impact FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own impact" ON user_impact FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_listings_updated_at BEFORE UPDATE ON food_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();