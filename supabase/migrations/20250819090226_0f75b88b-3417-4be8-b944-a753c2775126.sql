-- Update the existing schema to match the Food Surplus Sharing Platform requirements

-- First, let's update the profiles table to match the users requirements
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location text;

-- Update the food_listings table to match the foods requirements
-- Rename and add columns as needed
ALTER TABLE public.food_listings 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS pickup_slots jsonb DEFAULT '[]'::jsonb;

-- Update the name column to be the title if it doesn't exist
UPDATE public.food_listings 
SET name = title 
WHERE name IS NULL;

-- Make name not null after populating it
ALTER TABLE public.food_listings 
ALTER COLUMN name SET NOT NULL;

-- Update the claims table to match the bookings requirements
ALTER TABLE public.claims 
ADD COLUMN IF NOT EXISTS quantity_booked text,
ADD COLUMN IF NOT EXISTS pickup_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add booking status constraint
ALTER TABLE public.claims 
DROP CONSTRAINT IF EXISTS claims_status_check;

ALTER TABLE public.claims 
ADD CONSTRAINT claims_status_check 
CHECK (status IN ('pending', 'collected', 'cancelled'));

-- Update food listing status to match requirements
ALTER TABLE public.food_listings 
DROP CONSTRAINT IF EXISTS food_listings_status_check;

ALTER TABLE public.food_listings 
ADD CONSTRAINT food_listings_status_check 
CHECK (status IN ('available', 'booked', 'expired', 'completed'));

-- Create a function to auto-expire foods
CREATE OR REPLACE FUNCTION public.auto_expire_foods()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.food_listings 
  SET status = 'expired'
  WHERE expiry_date < now() 
  AND status = 'available';
END;
$$;

-- Update RLS policies for the new schema

-- Update food_listings policies for new roles
DROP POLICY IF EXISTS "Everyone can view available listings" ON public.food_listings;
CREATE POLICY "Everyone can view available listings" 
ON public.food_listings 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Donors can create listings" ON public.food_listings;
CREATE POLICY "Donors can create listings" 
ON public.food_listings 
FOR INSERT 
WITH CHECK (
  auth.uid() = donor_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('donor', 'admin')
  )
);

DROP POLICY IF EXISTS "Donors can update their own listings" ON public.food_listings;
CREATE POLICY "Donors can update their own listings" 
ON public.food_listings 
FOR UPDATE 
USING (
  auth.uid() = donor_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Update claims policies for recipients
DROP POLICY IF EXISTS "Users can create claims" ON public.claims;
CREATE POLICY "Recipients can create bookings" 
ON public.claims 
FOR INSERT 
WITH CHECK (
  auth.uid() = claimed_by AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('ngo', 'admin')
  )
);

-- Add recipient role to user_role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_new') THEN
    CREATE TYPE user_role_new AS ENUM ('donor', 'recipient', 'admin');
    
    ALTER TABLE public.profiles 
    ALTER COLUMN role TYPE user_role_new 
    USING (
      CASE 
        WHEN role::text = 'ngo' THEN 'recipient'::user_role_new
        ELSE role::text::user_role_new 
      END
    );
    
    DROP TYPE IF EXISTS user_role CASCADE;
    ALTER TYPE user_role_new RENAME TO user_role;
  END IF;
END $$;