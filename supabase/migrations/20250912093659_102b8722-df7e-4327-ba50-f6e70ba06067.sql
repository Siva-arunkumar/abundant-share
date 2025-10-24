-- Update existing data: migrate donor/recipient roles to user, keep admin as admin
UPDATE public.profiles 
SET role = 'user'::user_role 
WHERE role IN ('donor', 'recipient');

-- Update the handle_new_user function to set default role as 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, organization_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    'user'::user_role, -- Always default to 'user'
    NEW.raw_user_meta_data ->> 'organization_name',
    NEW.raw_user_meta_data ->> 'phone'
  );
  
  RETURN NEW;
END;
$$;

-- Add admin statistics tracking tables
CREATE TABLE IF NOT EXISTS public.admin_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  food_donated_count INTEGER DEFAULT 0,
  food_received_count INTEGER DEFAULT 0,
  food_wasted_count INTEGER DEFAULT 0,
  active_donors_count INTEGER DEFAULT 0,
  active_recipients_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Enable RLS for admin_stats
ALTER TABLE public.admin_stats ENABLE ROW LEVEL SECURITY;

-- Admin-only access to admin_stats
CREATE POLICY "Only admins can view admin stats"
ON public.admin_stats
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Only admins can insert admin stats"
ON public.admin_stats
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update admin stats"
ON public.admin_stats
FOR UPDATE
TO authenticated
USING (is_admin());

-- Function to update daily admin statistics
CREATE OR REPLACE FUNCTION public.update_daily_admin_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  food_donated INTEGER;
  food_received INTEGER;
  food_wasted INTEGER;
  active_donors INTEGER;
  active_recipients INTEGER;
BEGIN
  -- Count food donated today (completed listings)
  SELECT COUNT(*) INTO food_donated
  FROM public.food_listings
  WHERE DATE(completed_at) = today_date;
  
  -- Count food received today (received claims)
  SELECT COUNT(*) INTO food_received
  FROM public.claims
  WHERE DATE(received_at) = today_date;
  
  -- Count food wasted today (expired listings)
  SELECT COUNT(*) INTO food_wasted
  FROM public.food_listings
  WHERE status = 'expired' AND DATE(updated_at) = today_date;
  
  -- Count active donors (users who donated in last 30 days)
  SELECT COUNT(DISTINCT donor_id) INTO active_donors
  FROM public.food_listings
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Count active recipients (users who claimed in last 30 days)
  SELECT COUNT(DISTINCT claimed_by) INTO active_recipients
  FROM public.claims
  WHERE claimed_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Insert or update daily stats
  INSERT INTO public.admin_stats (date, food_donated_count, food_received_count, food_wasted_count, active_donors_count, active_recipients_count)
  VALUES (today_date, food_donated, food_received, food_wasted, active_donors, active_recipients)
  ON CONFLICT (date)
  DO UPDATE SET
    food_donated_count = EXCLUDED.food_donated_count,
    food_received_count = EXCLUDED.food_received_count,
    food_wasted_count = EXCLUDED.food_wasted_count,
    active_donors_count = EXCLUDED.active_donors_count,
    active_recipients_count = EXCLUDED.active_recipients_count,
    updated_at = now();
END;
$$;

-- Add triggers for automatic statistics updates
CREATE TRIGGER update_admin_stats_updated_at
BEFORE UPDATE ON public.admin_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();