-- Skip realtime setup if already exists (previous error shows it's already configured)
-- Enable realtime for remaining tables if not already done
ALTER TABLE public.claims REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication (only add if not already exists)
DO $$
BEGIN
    -- Add claims to realtime if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'claims'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.claims;
    END IF;
    
    -- Add notifications to realtime if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- Add image_urls column to food_listings (better naming than images array)
ALTER TABLE public.food_listings ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Update food category enum to match requirements
DROP TYPE IF EXISTS food_category CASCADE;
CREATE TYPE food_category AS ENUM ('veg', 'non_veg', 'dairy', 'bakery', 'packaged', 'cooked', 'other');

-- Update the column type
ALTER TABLE public.food_listings ALTER COLUMN category TYPE food_category USING category::food_category;

-- Create booking status enum
CREATE TYPE booking_status AS ENUM ('pending', 'received', 'cancelled');

-- Update claims table structure for better booking management
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS status booking_status DEFAULT 'pending'::booking_status;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS quantity_requested INTEGER;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE;

-- Enhanced RLS policies for claims
DROP POLICY IF EXISTS "Users can view related claims" ON public.claims;
CREATE POLICY "Users can view related claims" ON public.claims
FOR SELECT USING (
  auth.uid() = claimed_by OR 
  auth.uid() IN (
    SELECT donor_id FROM public.food_listings 
    WHERE id = claims.listing_id
  )
);

-- Policy for updating claims
DROP POLICY IF EXISTS "Recipients can update their claims" ON public.claims;
CREATE POLICY "Recipients can update their claims" ON public.claims
FOR UPDATE USING (auth.uid() = claimed_by);

-- Create impact tracking table
CREATE TABLE IF NOT EXISTS public.user_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meals_donated INTEGER DEFAULT 0,
  meals_received INTEGER DEFAULT 0,
  food_wasted_kg DECIMAL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_impact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own impact" ON public.user_impact
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own impact" ON public.user_impact
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create their impact record" ON public.user_impact
FOR INSERT WITH CHECK (auth.uid() = user_id);