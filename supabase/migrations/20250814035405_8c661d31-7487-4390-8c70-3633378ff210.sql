-- Create enum for food categories (if not exists)
DO $$ BEGIN
  CREATE TYPE public.food_category AS ENUM ('vegetables', 'fruits', 'grains', 'dairy', 'meat', 'bakery', 'prepared_food', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for listing status (if not exists)
DO $$ BEGIN
  CREATE TYPE public.listing_status AS ENUM ('available', 'claimed', 'completed', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for notification types (if not exists)
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('new_listing', 'listing_claimed', 'pickup_scheduled', 'pickup_completed', 'listing_expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table for additional user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'donor',
  organization_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create food_listings table
CREATE TABLE IF NOT EXISTS public.food_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity TEXT NOT NULL,
  category food_category NOT NULL,
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  pickup_time_start TIMESTAMP WITH TIME ZONE NOT NULL,
  pickup_time_end TIMESTAMP WITH TIME ZONE NOT NULL,
  pickup_location TEXT NOT NULL,
  status listing_status NOT NULL DEFAULT 'available',
  claimed_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create claims table to track claim history
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  claimed_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pickup_scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  listing_id UUID REFERENCES public.food_listings(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create platform_stats table for impact statistics
CREATE TABLE IF NOT EXISTS public.platform_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_meals_served INTEGER NOT NULL DEFAULT 0,
  total_food_saved_kg DECIMAL NOT NULL DEFAULT 0,
  total_ngos_onboarded INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial platform stats if none exist
INSERT INTO public.platform_stats (total_meals_served, total_food_saved_kg, total_ngos_onboarded)
SELECT 1250, 850.5, 25
WHERE NOT EXISTS (SELECT 1 FROM public.platform_stats);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for food images if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;