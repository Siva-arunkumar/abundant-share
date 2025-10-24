-- =============================================
-- FIX SECURITY LINTER WARNINGS
-- =============================================

-- 1. FIX SECURITY DEFINER VIEW ISSUE
-- =============================================
-- Remove the problematic view and create a function instead
DROP VIEW IF EXISTS public.donor_profiles;

-- Create a secure function to get donor profiles for listings only
CREATE OR REPLACE FUNCTION public.get_donor_profile_for_listing(listing_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  organization_name TEXT,
  city TEXT,
  state TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only return donor profile if the listing exists and is available
  IF NOT EXISTS (
    SELECT 1 FROM public.food_listings fl 
    WHERE fl.id = listing_id AND fl.status = 'available'
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.organization_name,
    p.city,
    p.state,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  JOIN public.food_listings fl ON fl.donor_id = p.user_id
  WHERE fl.id = listing_id AND p.role = 'donor';
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_donor_profile_for_listing(UUID) TO authenticated;

-- 2. FIX FUNCTION SEARCH PATH ISSUES
-- =============================================

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix create_notification function  
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID, 
  p_type notification_type, 
  p_title TEXT, 
  p_message TEXT, 
  p_listing_id UUID DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER  
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, listing_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_listing_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, organization_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('donor', 'recipient', 'admin') 
      THEN (NEW.raw_user_meta_data ->> 'role')::user_role
      ELSE 'donor'::user_role
    END,
    NEW.raw_user_meta_data ->> 'organization_name',
    NEW.raw_user_meta_data ->> 'phone'
  );
  
  RETURN NEW;
END;
$$;

-- 3. REMOVE THE PROBLEMATIC POLICY THAT USED THE VIEW CONCEPT
-- =============================================
DROP POLICY IF EXISTS "Public can view donor profiles for listings" ON public.profiles;

-- 4. REVOKE AND GRANT PROPER PERMISSIONS
-- =============================================
REVOKE EXECUTE ON FUNCTION public.get_donor_profile_for_listing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_donor_profile_for_listing(UUID) TO authenticated;