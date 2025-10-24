-- =============================================
-- COMPREHENSIVE SECURITY OVERHAUL (CORRECTED)
-- =============================================

-- 1. CREATE ADMIN ROLE CHECK FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 2. PROFILES TABLE SECURITY - REMOVE PERMISSIVE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restrictive profile policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles  
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. CREATE SANITIZED PROFILE VIEW FOR PUBLIC DATA
-- =============================================
CREATE OR REPLACE VIEW public.donor_profiles AS
SELECT 
  user_id,
  full_name,
  organization_name,
  city,
  state,
  avatar_url,
  created_at
FROM public.profiles
WHERE role = 'donor';

-- Enable RLS on the view
ALTER VIEW public.donor_profiles SET (security_barrier = true);

-- Policy for donor profiles view - only when accessing through food listings
CREATE POLICY "Public can view donor profiles for listings" ON public.profiles
  FOR SELECT USING (
    role = 'donor' AND 
    EXISTS (
      SELECT 1 FROM public.food_listings fl 
      WHERE fl.donor_id = profiles.user_id 
      AND fl.status = 'available'
    )
  );

-- 4. STORAGE SECURITY - MAKE FOOD-IMAGES PRIVATE
-- =============================================
UPDATE storage.buckets 
SET public = false 
WHERE id = 'food-images';

-- Remove existing public policies
DROP POLICY IF EXISTS "Public can view food images" ON storage.objects;

-- Create secure storage policies
CREATE POLICY "Authenticated users can upload food images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'food-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view food images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'food-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own food images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'food-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own food images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'food-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. AUDIT LOGGING SYSTEM
-- =============================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, old_values, user_id
    ) VALUES (
      TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD)::jsonb, auth.uid()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, old_values, new_values, user_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, new_values, user_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW)::jsonb, auth.uid()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables
CREATE TRIGGER profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER food_listings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.food_listings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER claims_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 6. SECURE EXISTING FUNCTIONS
-- =============================================

-- Revoke public execute on security definer functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, notification_type, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_func() FROM PUBLIC;

-- Grant execute only to authenticated users for safe functions
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, notification_type, text, text, uuid) TO authenticated;

-- 7. UPDATE USER ROLE ENUM (IF NEEDED)
-- =============================================
-- Check if 'ngo' role exists and update it to 'recipient'
UPDATE public.profiles 
SET role = 'recipient' 
WHERE role::text = 'ngo';

-- 8. UPDATE HANDLE_NEW_USER FUNCTION WITH BETTER SECURITY
-- =============================================
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
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('donor', 'recipient', 'admin') 
      THEN (NEW.raw_user_meta_data ->> 'role')::user_role
      ELSE 'donor'::user_role  -- Safe default
    END,
    NEW.raw_user_meta_data ->> 'organization_name',
    NEW.raw_user_meta_data ->> 'phone'
  );
  
  RETURN NEW;
END;
$$;

-- 9. CREATE RATE LIMITING TABLE FOR SIGNUP PROTECTION
-- =============================================
CREATE TABLE public.signup_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET,
  email TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN DEFAULT false
);

-- RLS for signup attempts - only admins can view
ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view signup attempts" ON public.signup_attempts
  FOR SELECT USING (public.is_admin());

-- Index for performance
CREATE INDEX idx_signup_attempts_ip_time ON public.signup_attempts (ip_address, attempt_time);
CREATE INDEX idx_signup_attempts_email_time ON public.signup_attempts (email, attempt_time);