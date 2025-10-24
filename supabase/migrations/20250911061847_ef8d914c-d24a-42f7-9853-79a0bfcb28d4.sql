-- Skip realtime setup if already exists (previous error shows it's already configured)
-- Enable realtime for remaining tables if not already done
DO $$
BEGIN
    -- Only alter if not already configured
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'claims' AND c.relreplident = 'f'
    ) THEN
        ALTER TABLE public.claims REPLICA IDENTITY FULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'notifications' AND c.relreplident = 'f'
    ) THEN
        ALTER TABLE public.notifications REPLICA IDENTITY FULL;
    END IF;
END $$;

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

-- Create booking status enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('pending', 'received', 'cancelled');
    END IF;
END $$;

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

-- Create trigger for updating impact stats
CREATE OR REPLACE FUNCTION public.update_user_impact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update donor impact when food is completed
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    INSERT INTO public.user_impact (user_id, meals_donated)
    VALUES (NEW.donor_id, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET 
      meals_donated = user_impact.meals_donated + 1,
      updated_at = NOW();
  END IF;
  
  -- Update recipient impact when claim is received
  IF TG_TABLE_NAME = 'claims' AND TG_OP = 'UPDATE' AND OLD.status != 'received' AND NEW.status = 'received' THEN
    INSERT INTO public.user_impact (user_id, meals_received)
    VALUES (NEW.claimed_by, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET 
      meals_received = user_impact.meals_received + 1,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers if they don't exist
DROP TRIGGER IF EXISTS food_listing_impact_trigger ON public.food_listings;
CREATE TRIGGER food_listing_impact_trigger
  AFTER UPDATE ON public.food_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_impact();

DROP TRIGGER IF EXISTS claim_impact_trigger ON public.claims;
CREATE TRIGGER claim_impact_trigger
  AFTER UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_impact();