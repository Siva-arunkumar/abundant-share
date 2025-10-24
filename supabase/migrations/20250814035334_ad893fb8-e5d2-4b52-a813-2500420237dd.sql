-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('donor', 'ngo', 'admin');

-- Create enum for food categories
CREATE TYPE public.food_category AS ENUM ('vegetables', 'fruits', 'grains', 'dairy', 'meat', 'bakery', 'prepared_food', 'other');

-- Create enum for listing status
CREATE TYPE public.listing_status AS ENUM ('available', 'claimed', 'completed', 'expired');

-- Create enum for notification types
CREATE TYPE public.notification_type AS ENUM ('new_listing', 'listing_claimed', 'pickup_scheduled', 'pickup_completed', 'listing_expired');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
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
CREATE TABLE public.food_listings (
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
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  claimed_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pickup_scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create notifications table
CREATE TABLE public.notifications (
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
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create platform_stats table for impact statistics
CREATE TABLE public.platform_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_meals_served INTEGER NOT NULL DEFAULT 0,
  total_food_saved_kg DECIMAL NOT NULL DEFAULT 0,
  total_ngos_onboarded INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial platform stats
INSERT INTO public.platform_stats (total_meals_served, total_food_saved_kg, total_ngos_onboarded)
VALUES (1250, 850.5, 25);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for food_listings
CREATE POLICY "Everyone can view available listings" ON public.food_listings FOR SELECT USING (true);
CREATE POLICY "Donors can create listings" ON public.food_listings FOR INSERT WITH CHECK (auth.uid() = donor_id);
CREATE POLICY "Donors can update their own listings" ON public.food_listings FOR UPDATE USING (auth.uid() = donor_id);
CREATE POLICY "Donors can delete their own listings" ON public.food_listings FOR DELETE USING (auth.uid() = donor_id);

-- Create RLS policies for claims
CREATE POLICY "Users can view their own claims" ON public.claims FOR SELECT USING (auth.uid() = claimed_by OR auth.uid() IN (SELECT donor_id FROM food_listings WHERE id = listing_id));
CREATE POLICY "Users can create claims" ON public.claims FOR INSERT WITH CHECK (auth.uid() = claimed_by);
CREATE POLICY "Users can update their own claims" ON public.claims FOR UPDATE USING (auth.uid() = claimed_by);

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for contact_messages (admin only)
CREATE POLICY "Admins can view all contact messages" ON public.contact_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Anyone can create contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);

-- Create RLS policies for platform_stats
CREATE POLICY "Everyone can view platform stats" ON public.platform_stats FOR SELECT USING (true);
CREATE POLICY "Admins can update platform stats" ON public.platform_stats FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_listings_updated_at
  BEFORE UPDATE ON public.food_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'donor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_listing_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, listing_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_listing_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage bucket for food images
INSERT INTO storage.buckets (id, name, public) VALUES ('food-images', 'food-images', true);

-- Create storage policies for food images
CREATE POLICY "Anyone can view food images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'food-images');

CREATE POLICY "Authenticated users can upload food images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'food-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own food images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'food-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own food images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'food-images' AND auth.role() = 'authenticated');

-- Enable realtime for tables
ALTER TABLE public.food_listings REPLICA IDENTITY FULL;
ALTER TABLE public.claims REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.claims;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;